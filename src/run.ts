import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
   CoreV1ApiCreateNamespacedSecretRequest,
   CoreV1ApiDeleteNamespacedSecretRequest,
   CoreV1Api,
   KubeConfig,
   V1ObjectMeta,
   V1Secret
} from '@kubernetes/client-node'

export function checkClusterContext() {
   if (!process.env['KUBECONFIG']) {
      throw new Error(
         'Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context'
      )
   }
}

export type DockerConfigJSON = {
   auths: {
      [key: string]: {
         username: string
         password: string
         email?: string
         auth: string
      }
   }
}

export function buildContainerRegistryDockerConfigJSON(
   registryUrl: string,
   registryUserName: string,
   registryPassword: string,
   registryEmail
): DockerConfigJSON {
   const authString = Buffer.from(
      `${registryUserName}:${registryPassword}`
   ).toString('base64')
   const dockerConfigJson: DockerConfigJSON = {
      auths: {
         [registryUrl]: {
            username: registryUserName,
            password: registryPassword,
            auth: authString
         }
      }
   }

   if (registryEmail) {
      dockerConfigJson.auths[registryUrl].email = registryEmail
   }
   return dockerConfigJson //Buffer.from(JSON.stringify(dockerConfigJson)).toString('base64');
}
export async function runKubectlViaAz(
   secret: V1Secret,
   namespace: string,
   secretName: string
) {
   const resourceGroup = core.getInput('cluster-resource-group')
   const clusterName = core.getInput('cluster-name')
   if (!resourceGroup || !clusterName) {
      throw new Error(
         'cluster-resource-group and cluster-name are required for private cluster support'
      )
   }
   // Write secret to temp file
   const tempFile = path.join(os.tmpdir(), `secret-${secretName}.json`)
   // Write secret to temp file securely
   const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-'));
   const tempFile = path.join(tempDir, `${secretName}.json`);
   fs.writeFileSync(tempFile, JSON.stringify(secret, null, 2));
   try {
      await exec.exec('az', [
         'aks',
         'command',
         'invoke',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '--command',
         `kubectl delete secret ${secretName} -n ${namespace} --ignore-not-found`
      ])
      await exec.exec('az', [
         'aks',
         'command',
         'invoke',
         '--resource-group',
         resourceGroup,
         '--name',
         clusterName,
         '--command',
         `kubectl apply -f - -n ${namespace}`,
         '--file',
         tempFile
      ])
   } finally {
      fs.unlinkSync(tempFile)
   }
}
export async function buildSecret(
   secretName: string,
   namespace: string,
   secretType: string
): Promise<V1Secret> {
   const metaData: V1ObjectMeta = {
      name: secretName,
      namespace: namespace
   }

   const containerRegistryURL = core.getInput('container-registry-url')
   const containerRegistryUserName = core.getInput(
      'container-registry-username'
   )
   const containerRegistryPassword = core.getInput(
      'container-registry-password'
   )
   const containerRegistryEmail = core.getInput('container-registry-email')

   // Check if any container registry credentials are provided
   if (
      containerRegistryURL ||
      containerRegistryUserName ||
      containerRegistryPassword ||
      containerRegistryEmail
   ) {
      if (!containerRegistryURL) {
         core.setFailed(
            'container-registry-url is required when container-registry-username or container-registry-password is provided'
         )
      }
      if (!containerRegistryUserName) {
         core.setFailed(
            'container-registry-username is required when container-registry-url or container-registry-password is provided'
         )
      }
      if (!containerRegistryPassword) {
         core.setFailed(
            'container-registry-password is required when container-registry-url or container-registry-username or container-registry-email is provided'
         )
      }

      const dockerConfigJSON = buildContainerRegistryDockerConfigJSON(
         containerRegistryURL,
         containerRegistryUserName,
         containerRegistryPassword,
         containerRegistryEmail
      )
      const dockerConfigJSONString = JSON.stringify(dockerConfigJSON)
      const dockerConfigBase64 = Buffer.from(dockerConfigJSONString).toString(
         'base64'
      )

      const data = {
         '.dockerconfigjson': dockerConfigBase64
      }

      return {
         apiVersion: 'v1',
         kind: 'Secret',
         metadata: metaData,
         type: secretType,
         data: data
      }
   }
   if (secretType === TLS_K8S) {
      const tlsCert = core.getInput('tls-cert')
      const tlsKey = core.getInput('tls-key')
      const data = buildTlsSecretData(tlsCert, tlsKey)
      return {
         apiVersion: 'v1',
         kind: 'Secret',
         metadata: metaData,
         type: secretType,
         data: data
      }
   }

   // The serialized form of the secret data is a base64 encoded string
   let data: {[key: string]: string} = {}
   if (core.getInput('data')) {
      core.debug(`loading 'data' field`)
      data = JSON.parse(core.getInput('data'))
   }

   // The plaintext form of the secret data
   let stringData: {[key: string]: string} = {}
   if (core.getInput('string-data')) {
      core.debug(`loading 'string-data' field`)
      stringData = JSON.parse(core.getInput('string-data'))
   }

   // Create secret object for passing to the api
   core.debug(`creating V1Secret`)
   const secret: V1Secret = {
      apiVersion: 'v1',
      type: secretType,
      data: data,
      stringData: stringData,
      metadata: metaData
   }

   return secret
}
const K8S_SECRET_TYPE_OPAQUE = 'Opaque' // Kubernetes secret type for generic secrets
const SECRET_TYPE_GENERIC = 'generic'
const TLS_SHORT = 'tls'
const TLS_K8S = 'kubernetes.io/tls'
function mapSecretType(inputType: string): string {
   const normalizedType = inputType.toLowerCase().trim()
   if (
      normalizedType === SECRET_TYPE_GENERIC ||
      normalizedType === K8S_SECRET_TYPE_OPAQUE.toLowerCase()
   ) {
      return K8S_SECRET_TYPE_OPAQUE
   }
   if (normalizedType === TLS_SHORT || normalizedType === TLS_K8S) {
      return TLS_K8S
   }
   return inputType
}
function isBase64(str: string): boolean {
   try {
      return Buffer.from(str, 'base64').toString('base64') === str
   } catch {
      return false
   }
}

function buildTlsSecretData(cert: string, key: string) {
   if (!cert || !key) {
      throw new Error(
         'Both tls-cert and tls-key must be provided for type kubernetes.io/tls'
      )
   }

   if (!isBase64(cert) || !isBase64(key)) {
      throw new Error(
         'Both tls-cert and tls-key must be valid base64-encoded strings'
      )
   }

   return {'tls.crt': cert, 'tls.key': key}
}

export async function run() {
   checkClusterContext()

   // Create kubeconfig and load values from 'KUBECONFIG' environment variable
   const kc: KubeConfig = new KubeConfig()
   core.debug(`loading kubeconfig from defaults...`)
   kc.loadFromDefault()

   const api: CoreV1Api = kc.makeApiClient(CoreV1Api)

   // The name of the new secret
   const secretName: string = core.getInput('secret-name', {required: true})

   // Get the raw input from the workflow YAML (may include casing or whitespace issues)
   const rawSecretType = core.getInput('secret-type')

   // Normalize and map the raw input to a valid Kubernetes secret type
   const secretType = mapSecretType(rawSecretType)

   // The namespace in which to place the secret
   const namespace: string = core.getInput('namespace') || 'default'

   const sec = await buildSecret(secretName, namespace, secretType)

   if (core.getInput('use-invoke-command') === 'true') {
      await runKubectlViaAz(sec, namespace, secretName)
      return
   }

   // Delete if exists
   let deleteSecretResponse
   try {
      let deleteRequest: CoreV1ApiDeleteNamespacedSecretRequest = {
         name: secretName,
         namespace: namespace
      }
      deleteSecretResponse = await api.deleteNamespacedSecret(deleteRequest)
   } catch ({response}) {
      core.warning(
         `Failed to delete secret with statusCode: ${response?.statusCode}`
      )
      core.warning(response?.body?.metadata)
   }
   core.info('Deleting secret:')
   core.info(JSON.stringify(deleteSecretResponse?.response?.body, undefined, 2))

   const secret = await buildSecret(secretName, namespace, secretType)
   core.info('Creating secret')
   try {
      let secretRequest: CoreV1ApiCreateNamespacedSecretRequest = {
         namespace: namespace,
         body: secret
      }
      await api.createNamespacedSecret(secretRequest)
   } catch (err) {
      core.info(JSON.stringify(err))
      core.setFailed(err.message)
   }
}
