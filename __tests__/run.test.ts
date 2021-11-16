import * as fs from 'fs';
import * as path from 'path';

import { mocked } from 'ts-jest/utils'

const fileUtility = mocked(fs, true);

beforeAll(() => {
    process.env['RUNNER_TEMP'] = '/home/runner/work/_temp';
})