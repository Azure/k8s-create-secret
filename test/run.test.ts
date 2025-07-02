import {kStringMaxLength} from 'buffer'
import * as fs from 'fs'
import * as path from 'path'

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
      process.env['INPUT_TLS-CERT'] = 'dummyBase64Cert'
      process.env['INPUT_TLS-KEY'] = 'dummyBase64Key'
      const secret = await buildSecret(
         'tls-secret',
         'tls-namespace',
         'kubernetes.io/tls'
      )
      expect(secret.apiVersion).toBe('v1')
      expect(secret.type).toBe('kubernetes.io/tls')
      expect(secret.metadata.name).toBe('tls-secret')
      expect(secret.metadata.namespace).toBe('tls-namespace')
      expect(secret.data['tls.crt']).toBe('dummyBase64Cert')
      expect(secret.data['tls.key']).toBe('dummyBase64Key')
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
