import * as core from '@actions/core'
import {ApiException, CoreV1Api, KubeConfig} from '@kubernetes/client-node'
import {run} from '../src/run.js'

vi.mock('@actions/core', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@actions/core')>()
   return {
      ...actual,
      debug: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
      setFailed: vi.fn()
   }
})

describe('run API errors', () => {
   beforeEach(() => {
      vi.stubEnv('KUBECONFIG', 'test-kubeconfig')
      vi.stubEnv('INPUT_SECRET-NAME', 'test-secret')
      vi.stubEnv('INPUT_SECRET-TYPE', 'generic')
      vi.stubEnv('INPUT_NAMESPACE', 'test-namespace')
      vi.spyOn(KubeConfig.prototype, 'loadFromDefault').mockImplementation(
         function (this: KubeConfig) {
            this.loadFromClusterAndUser(
               {name: 'test', server: 'https://example.invalid'},
               {name: 'test-user', token: 'test-token'}
            )
         }
      )
      vi.spyOn(CoreV1Api.prototype, 'deleteNamespacedSecret').mockResolvedValue(
         {
            status: 'Success'
         }
      )
      vi.spyOn(CoreV1Api.prototype, 'createNamespacedSecret').mockResolvedValue(
         {
            metadata: {name: 'test-secret'}
         }
      )
   })

   afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
   })

   it('creates the secret after a successful delete', async () => {
      await run()

      expect(core.warning).not.toHaveBeenCalled()
      expect(CoreV1Api.prototype.createNamespacedSecret).toHaveBeenCalledWith(
         expect.objectContaining({namespace: 'test-namespace'})
      )
   })

   it('keeps an expected API 404 quiet and continues creating the secret', async () => {
      vi.mocked(CoreV1Api.prototype.deleteNamespacedSecret).mockRejectedValue(
         new ApiException(
            404,
            'Unknown API Status Code!',
            JSON.stringify({message: 'Secret not found'}),
            {'x-private-header': 'private-header-value'}
         )
      )

      await run()

      expect(core.warning).not.toHaveBeenCalled()
      expect(core.debug).toHaveBeenCalledWith(
         'Secret test-secret does not exist, creating new secret'
      )
      expect(CoreV1Api.prototype.createNamespacedSecret).toHaveBeenCalled()
   })

   it.each([
      ['JSON text', JSON.stringify({message: 'Deletion forbidden'})],
      ['an object', {message: 'Deletion forbidden'}]
   ])(
      'uses a local status description when the body is %s',
      async (_name, body) => {
         vi.mocked(
            CoreV1Api.prototype.deleteNamespacedSecret
         ).mockRejectedValue(
            new ApiException(403, 'Forbidden', body, {
               'x-private-header': 'private-header-value'
            })
         )

         await run()

         expect(core.warning).toHaveBeenCalledExactlyOnceWith(
            'Failed to delete secret with statusCode 403: Forbidden'
         )
         expect(CoreV1Api.prototype.createNamespacedSecret).toHaveBeenCalled()
      }
   )

   it.each([
      ['non-JSON text', '<html>private response body</html>'],
      [
         'an object without a message',
         {privateResponse: 'private response body'}
      ]
   ])('does not log the response when the body is %s', async (_name, body) => {
      vi.mocked(CoreV1Api.prototype.deleteNamespacedSecret).mockRejectedValue(
         new ApiException(500, 'Server error', body, {
            'x-private-header': 'private-header-value'
         })
      )

      await run()

      expect(core.warning).toHaveBeenCalledExactlyOnceWith(
         'Failed to delete secret with statusCode 500: Internal Server Error'
      )
   })

   it.each([
      new Error('Connection refused: private connection details'),
      new SyntaxError('Unexpected token: private response body'),
      'private non-Error failure'
   ])('does not disclose non-API deletion errors (%#)', async (error) => {
      vi.mocked(CoreV1Api.prototype.deleteNamespacedSecret).mockRejectedValue(
         error
      )

      await run()

      expect(core.warning).toHaveBeenCalledExactlyOnceWith(
         'Failed to delete secret: Kubernetes API request failed'
      )
   })

   it('uses a fixed fallback for unknown status codes', async () => {
      vi.mocked(CoreV1Api.prototype.deleteNamespacedSecret).mockRejectedValue(
         new ApiException(599, 'private message', {message: 'private body'}, {})
      )

      await run()

      expect(core.warning).toHaveBeenCalledExactlyOnceWith(
         'Failed to delete secret with statusCode 599: Kubernetes API request failed'
      )
   })

   it('fails creation without logging the API response or headers', async () => {
      vi.mocked(CoreV1Api.prototype.createNamespacedSecret).mockRejectedValue(
         new ApiException(
            403,
            'Forbidden',
            JSON.stringify({message: 'Creation forbidden'}),
            {'x-private-header': 'private-header-value'}
         )
      )

      await run()

      expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
         'Failed to create secret with statusCode 403: Forbidden'
      )
   })

   it.each([
      new Error('Connection refused: private connection details'),
      new SyntaxError('Unexpected token: private response body'),
      'private non-Error failure'
   ])('does not disclose non-API creation errors (%#)', async (error) => {
      vi.mocked(CoreV1Api.prototype.createNamespacedSecret).mockRejectedValue(
         error
      )

      await run()

      expect(core.setFailed).toHaveBeenCalledExactlyOnceWith(
         'Failed to create secret: Kubernetes API request failed'
      )
   })
})
