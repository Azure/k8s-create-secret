import {kStringMaxLength} from 'buffer'
import * as fs from 'fs'
import * as path from 'path'
import * as exec from '@actions/exec'
import * as core from '@actions/core'

const k8s = require('@kubernetes/client-node')

import {
   CoreV1Api,
   KubeConfig,
   V1ObjectMeta,
   V1Secret
} from '@kubernetes/client-node'

import {
   buildContainerRegistryDockerConfigJSON,
   buildSecret,
   checkClusterContext,
   DockerConfigJSON
} from '../src/run'

const mockk8s = jest.mocked(k8s, {shallow: true})
const mockApi = jest.mocked(CoreV1Api, {shallow: true})

const fileUtility = jest.mocked(fs, {shallow: true})

beforeAll(() => {
   process.env['RUNNER_TEMP'] = '/home/runner/work/_temp'
})

describe('checkClusterContext', () => {
   it('should pass when KUBECONFIG is set', () => {
      process.env['KUBECONFIG'] = 'test-kube-config'
      expect(checkClusterContext).not.toThrow(Error)
   })
   it('should throw when KUBECONFIG is not set', () => {
      process.env['KUBECONFIG'] = ''
      expect(checkClusterContext).toThrow(Error)
   })
})

describe('buildSecret', () => {
   beforeEach(() => {
      process.env['INPUT_SECRET-TYPE'] = 'generic'
   })
   it('should use api v1', async () => {
      let secret = await buildSecret('test-secret', 'test-namespace', 'generic')
      expect(secret.apiVersion).toBe('v1')
   })

   it('should have namespace in metadata field', async () => {
      const testNamespace = 'test-namespace'
      let secret = await buildSecret('test-secret', testNamespace, 'generic')
      expect(secret.metadata.namespace).toBe(testNamespace)
   })
   it('should have name in metadata field', async () => {
      const testNamespace = 'test-namespace'
      const testName = 'test-secret'
      let secret = await buildSecret(testName, testNamespace, 'generic')
      expect(secret.metadata.name).toBe(testName)
   })
   it('should build TLS secret with cert and key', async () => {
      process.env['INPUT_SECRET-TYPE'] = 'kubernetes.io/tls'
      process.env['INPUT_TLS-CERT'] = 'ZHVtbXlDZXJ0' // valid base64 for 'dummyCert'
      process.env['INPUT_TLS-KEY'] = 'ZHVtbXlLZXk=' // valid base64 for 'dummyKey'

      const secret = await buildSecret(
         'tls-secret',
         'tls-namespace',
         'kubernetes.io/tls'
      )
      expect(secret.apiVersion).toBe('v1')
      expect(secret.type).toBe('kubernetes.io/tls')
      expect(secret.metadata.name).toBe('tls-secret')
      expect(secret.metadata.namespace).toBe('tls-namespace')
      expect(secret.data['tls.crt']).toBe('ZHVtbXlDZXJ0')
      expect(secret.data['tls.key']).toBe('ZHVtbXlLZXk=')
   })
   it('should throw if TLS cert is missing', async () => {
      process.env['INPUT_SECRET-TYPE'] = 'kubernetes.io/tls'
      delete process.env['INPUT_TLS-CERT']
      process.env['INPUT_TLS-KEY'] = 'ZHVtbXlLZXk='

      await expect(
         buildSecret('test', 'ns', 'kubernetes.io/tls')
      ).rejects.toThrow(
         'Both tls-cert and tls-key must be provided for type kubernetes.io/tls'
      )
   })

   it('should throw if TLS key is missing', async () => {
      process.env['INPUT_SECRET-TYPE'] = 'kubernetes.io/tls'
      process.env['INPUT_TLS-CERT'] = 'ZHVtbXlDZXJ0'
      delete process.env['INPUT_TLS-KEY']

      await expect(
         buildSecret('test', 'ns', 'kubernetes.io/tls')
      ).rejects.toThrow(
         'Both tls-cert and tls-key must be provided for type kubernetes.io/tls'
      )
   })

   it('should throw if TLS cert is not base64', async () => {
      process.env['INPUT_SECRET-TYPE'] = 'kubernetes.io/tls'
      process.env['INPUT_TLS-CERT'] = 'not base64!!'
      process.env['INPUT_TLS-KEY'] = 'ZHVtbXlLZXk='

      await expect(
         buildSecret('test', 'ns', 'kubernetes.io/tls')
      ).rejects.toThrow(
         'Both tls-cert and tls-key must be valid base64-encoded strings'
      )
   })

   it('should throw if TLS key is not base64', async () => {
      process.env['INPUT_SECRET-TYPE'] = 'kubernetes.io/tls'
      process.env['INPUT_TLS-CERT'] = 'ZHVtbXlDZXJ0'
      process.env['INPUT_TLS-KEY'] = 'not_valid_base64'

      await expect(
         buildSecret('test', 'ns', 'kubernetes.io/tls')
      ).rejects.toThrow(
         'Both tls-cert and tls-key must be valid base64-encoded strings'
      )
   })
})

describe('buildContainerRegistryDockerConfigJSON', () => {
   it('should build docker config json', async () => {
      const testContainerRegistryUrl = 'test-container-registry-url'
      const testContainerRegistryUserName = 'test-container-registry-username'
      const testContainerRegistryPassword = 'test-container-registry-password'
      const testContainerRegistryEmail = 'test-container-registry-email'

      const exptectedDockerConfigJson: DockerConfigJSON = {
         auths: {
            'test-container-registry-url': {
               username: 'test-container-registry-username',
               password: 'test-container-registry-password',
               auth: 'dGVzdC1jb250YWluZXItcmVnaXN0cnktdXNlcm5hbWU6dGVzdC1jb250YWluZXItcmVnaXN0cnktcGFzc3dvcmQ=',
               email: 'test-container-registry-email'
            }
         }
      }

      const dockerConfigJson = buildContainerRegistryDockerConfigJSON(
         testContainerRegistryUrl,
         testContainerRegistryUserName,
         testContainerRegistryPassword,
         testContainerRegistryEmail
      )
      expect(dockerConfigJson).toEqual(exptectedDockerConfigJson)
   })
   it('should omit email when blank', async () => {
      const testContainerRegistryUrl = 'test-container-registry-url'
      const testContainerRegistryUserName = 'test-container-registry-username'
      const testContainerRegistryPassword = 'test-container-registry-password'
      const testContainerRegistryEmail = ''

      const exptectedDockerConfigJsonNoEmail: DockerConfigJSON = {
         auths: {
            'test-container-registry-url': {
               username: 'test-container-registry-username',
               password: 'test-container-registry-password',
               auth: 'dGVzdC1jb250YWluZXItcmVnaXN0cnktdXNlcm5hbWU6dGVzdC1jb250YWluZXItcmVnaXN0cnktcGFzc3dvcmQ='
            }
         }
      }
      const dockerConfigJson = buildContainerRegistryDockerConfigJSON(
         testContainerRegistryUrl,
         testContainerRegistryUserName,
         testContainerRegistryPassword,
         testContainerRegistryEmail
      )
      expect(dockerConfigJson).toEqual(exptectedDockerConfigJsonNoEmail)
   })
})

describe('runKubectlViaAz', () => {
   const mockSecret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {name: 'test-secret', namespace: 'test-ns'},
      type: 'Opaque',
      data: {foo: 'YmFy'}
   }

   beforeEach(() => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {})
      jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {})
      jest.spyOn(exec, 'exec').mockResolvedValue(0)
   })

   afterEach(() => jest.restoreAllMocks())

   it('calls az aks command invoke for delete and apply', async () => {
      jest
         .spyOn(core, 'getInput')
         .mockImplementation((name: string) =>
            name === 'cluster-resource-group'
               ? 'rg'
               : name === 'cluster-name'
                 ? 'aks'
                 : ''
         )
      const {runKubectlViaAz} = require('../src/run')
      await runKubectlViaAz(mockSecret, 'test-ns', 'test-secret')
      expect(exec.exec).toHaveBeenCalledWith(
         'az',
         expect.arrayContaining([
            'aks',
            'command',
            'invoke',
            '--resource-group',
            'rg',
            '--name',
            'aks'
         ])
      )
   })

   it('throws if required inputs are missing', async () => {
      jest.spyOn(core, 'getInput').mockReturnValue('')
      const {runKubectlViaAz} = require('../src/run')
      await expect(
         runKubectlViaAz(mockSecret, 'test-ns', 'test-secret')
      ).rejects.toThrow(
         'cluster-resource-group and cluster-name are required for private cluster support'
      )
   })
})
