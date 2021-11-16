import { kStringMaxLength } from 'buffer';
import * as fs from 'fs';
import * as path from 'path';

import { mocked } from 'ts-jest/utils'

const k8s = require('@kubernetes/client-node');

import { CoreV1Api, KubeConfig, V1ObjectMeta, V1Secret } from '@kubernetes/client-node';

const mockApi = mocked(CoreV1Api, true);

const fileUtility = mocked(fs, true);

beforeAll(() => {
    process.env['RUNNER_TEMP'] = '/home/runner/work/_temp';
})

test('sample test', () => {
    return true
})