import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {test} from 'node:test'
import {fileURLToPath} from 'node:url'

// Run `npm run build` first. Exercise the shipped entry point and real client.
const actionPath = fileURLToPath(new URL('../lib/index.js', import.meta.url))
const secretPath = '/api/v1/namespaces/test-namespace/secrets'
const password = 'PASSWORD_SENTINEL_93'
const encodedPassword = Buffer.from(password).toString('base64')
const privateBody = 'BODY_SECRET_SENTINEL'
const privateHeader = 'HEADER_SECRET_SENTINEL'
const token = 'DUMMY_AUTH_TOKEN'
// Short enough to appear in Node's JSON parser error excerpts.
const parserSecret = 'SECRET123'
const successfulDelete = {
   code: 200,
   body: {apiVersion: 'v1', kind: 'Status', status: 'Success'}
}
const successfulCreate = {
   code: 201,
   body: {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {name: 'test-secret'},
      data: {password: encodedPassword}
   }
}

function apiFailure(code, message = `Denied ${password} ${encodedPassword}`) {
   return {
      code,
      body: {
         apiVersion: 'v1',
         kind: 'Status',
         status: 'Failure',
         code,
         message,
         details: {privateField: privateBody}
      }
   }
}

async function runAction(
   t,
   {
      deletion = successfulDelete,
      creation = successfulCreate,
      inputs = {},
      expectCreate = true
   } = {}
) {
   const directory = await mkdtemp(join(tmpdir(), 'k8s-create-secret-http-'))
   const requests = []
   const server = createServer((request, response) => {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', (chunk) => {
         body += chunk
      })
      request.on('end', () => {
         requests.push({method: request.method, url: request.url, body})
         const reply = request.method === 'DELETE' ? deletion : creation
         if (reply.disconnect) {
            request.socket.destroy()
            return
         }
         response.writeHead(reply.code, {
            'content-type': 'application/json',
            'x-private-header': privateHeader
         })
         response.end(reply.raw ?? JSON.stringify(reply.body))
      })
   })
   t.after(async () => {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
      await rm(directory, {recursive: true, force: true})
   })
   await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
   })

   const kubeconfig = join(directory, 'config.json')
   await writeFile(
      kubeconfig,
      JSON.stringify({
         apiVersion: 'v1',
         kind: 'Config',
         clusters: [
            {
               name: 'test',
               cluster: {
                  server: `http://127.0.0.1:${server.address().port}`,
                  // Plain HTTP is permitted only for this loopback fixture.
                  'insecure-skip-tls-verify': true
               }
            }
         ],
         users: [{name: 'test', user: {token}}],
         contexts: [{name: 'test', context: {cluster: 'test', user: 'test'}}],
         'current-context': 'test'
      })
   )
   const env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith('INPUT_'))
   )
   const child = spawn(process.execPath, [actionPath], {
      env: {
         ...env,
         KUBECONFIG: kubeconfig,
         'INPUT_SECRET-NAME': 'test-secret',
         'INPUT_SECRET-TYPE': 'generic',
         INPUT_NAMESPACE: 'test-namespace',
         'INPUT_STRING-DATA': JSON.stringify({password}),
         ...inputs
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000,
      killSignal: 'SIGKILL'
   })
   t.after(() => {
      if (child.exitCode === null && child.signalCode === null) {
         child.kill('SIGKILL')
      }
   })
   let output = ''
   child.stdout.on('data', (chunk) => {
      output += chunk
   })
   child.stderr.on('data', (chunk) => {
      output += chunk
   })
   const {code, signal} = await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('close', (code, signal) => resolve({code, signal}))
   })
   assert.equal(signal, null, 'action must finish before the timeout')
   // Check all output, including debug lines and stderr, without runner masking.
   for (const sentinel of [
      password,
      encodedPassword,
      privateBody,
      privateHeader,
      parserSecret,
      token
   ]) {
      assert.ok(!output.includes(sentinel), `output leaked ${sentinel}`)
   }
   assert.deepEqual(
      requests.map(({method, url}) => [method, url]),
      expectCreate
         ? [
              ['DELETE', `${secretPath}/test-secret`],
              ['POST', secretPath]
           ]
         : [['DELETE', `${secretPath}/test-secret`]]
   )
   if (expectCreate) {
      const secret = JSON.parse(requests[1].body)
      assert.equal(secret.stringData.password, password)
      assert.equal(secret.type, 'Opaque')
      assert.equal(secret.metadata.name, 'test-secret')
   }
   return {
      code,
      output,
      annotations: output
         .split('\n')
         .filter((line) => /^::(?:warning|error)::/.test(line))
   }
}

test('successful responses do not disclose secret data', async (t) => {
   const result = await runAction(t)
   assert.equal(result.code, 0)
   assert.deepEqual(result.annotations, [])
})

test('delete 404 stays quiet and creation proceeds', async (t) => {
   const result = await runAction(t, {deletion: apiFailure(404)})
   assert.equal(result.code, 0)
   assert.deepEqual(result.annotations, [])
})

for (const [status, description] of [
   [403, 'Forbidden'],
   [500, 'Internal Server Error']
]) {
   test(`delete ${status} uses a safe warning and creation proceeds`, async (t) => {
      const result = await runAction(t, {deletion: apiFailure(status)})
      assert.equal(result.code, 0)
      assert.deepEqual(result.annotations, [
         `::warning::Failed to delete secret with statusCode ${status}: ${description}`
      ])
   })
}

for (const [status, description] of [
   [401, 'Unauthorized'],
   [403, 'Forbidden'],
   [409, 'Conflict'],
   [422, 'Unprocessable Entity'],
   [599, 'Kubernetes API request failed']
]) {
   test(`create ${status} does not disclose API messages or headers`, async (t) => {
      const result = await runAction(t, {creation: apiFailure(status)})
      assert.equal(result.code, 1)
      assert.deepEqual(result.annotations, [
         `::error::Failed to create secret with statusCode ${status}: ${description}`
      ])
   })
}

for (const [name, raw] of [
   ['HTML', `<html>${privateBody}</html>`],
   ['malformed JSON', `{"private":"${privateBody}"`],
   ['null', 'null'],
   ['array', JSON.stringify([privateBody])],
   ['non-string message', JSON.stringify({message: {secret: privateBody}})]
]) {
   test(`error response with ${name} has a safe diagnostic`, async (t) => {
      const response = {code: 500, raw}
      const result = await runAction(t, {
         deletion: response,
         creation: response
      })
      assert.equal(result.code, 1)
      assert.deepEqual(result.annotations, [
         '::warning::Failed to delete secret with statusCode 500: Internal Server Error',
         '::error::Failed to create secret with statusCode 500: Internal Server Error'
      ])
   })
}

for (const operation of ['deletion', 'creation']) {
   test(`malformed successful ${operation} response does not disclose parser excerpts`, async (t) => {
      const result = await runAction(t, {
         [operation]: {
            code: operation === 'deletion' ? 200 : 201,
            raw: `${parserSecret} invalid JSON`
         }
      })
      assert.equal(result.code, operation === 'deletion' ? 0 : 1)
      assert.deepEqual(result.annotations, [
         operation === 'deletion'
            ? '::warning::Failed to delete secret: Kubernetes API request failed'
            : '::error::Failed to create secret: Kubernetes API request failed'
      ])
   })
}

for (const name of ['data', 'string-data']) {
   test(`malformed ${name} does not disclose input excerpts or send a POST`, async (t) => {
      const result = await runAction(t, {
         inputs: {
            [`INPUT_${name.toUpperCase()}`]: `${parserSecret} invalid JSON`
         },
         expectCreate: false
      })
      assert.equal(result.code, 1)
      assert.deepEqual(result.annotations, [
         `::error::Error: ${name} must be valid JSON`
      ])
   })
}

test('socket failures use safe diagnostics and fail creation', async (t) => {
   const result = await runAction(t, {
      deletion: {disconnect: true},
      creation: {disconnect: true}
   })
   assert.equal(result.code, 1)
   assert.deepEqual(result.annotations, [
      '::warning::Failed to delete secret: Kubernetes API request failed',
      '::error::Failed to create secret: Kubernetes API request failed'
   ])
})

test('API messages cannot inject workflow commands', async (t) => {
   const message =
      'denied\r\n::set-env name=PWNED::yes\n::add-mask::injected%0A::stop-commands::token'
   const result = await runAction(t, {
      deletion: apiFailure(403, message),
      creation: apiFailure(403, message)
   })
   assert.equal(result.code, 1)
   assert.deepEqual(result.annotations, [
      '::warning::Failed to delete secret with statusCode 403: Forbidden',
      '::error::Failed to create secret with statusCode 403: Forbidden'
   ])
   assert.doesNotMatch(result.output, /::(?:set-env|add-mask|stop-commands)/)
})
