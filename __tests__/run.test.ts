import { fromLiteralsToFromFile } from "../src/run"
import * as fs from 'fs';
import * as path from 'path';

import { mocked } from 'ts-jest/utils'

const fileUtility = mocked(fs, true);

beforeAll(() => {
    process.env['RUNNER_TEMP'] = '/home/runner/work/_temp';
})

test('Literal converted to file', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key1");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key1=value")).toBe('--from-file=' + filePath);
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "value");
})

test('Multiple literal converted to file', () => {
    var filePath1 = path.join(process.env['RUNNER_TEMP'], "key1");
    var filePath2 = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key1=value1 --from-literal=key2=value2")).toBe('--from-file=' + filePath1 + ' --from-file=' + filePath2);
    expect(fileUtility.writeFileSync.mock.calls).toEqual([
        [filePath1, "value1"],
        [filePath2, "value2"]
    ])
})

test('File and other argument maintained maintained as-is', () => {
    expect(fromLiteralsToFromFile("--from-file=./filepath --otherArgument=value")).toBe('--from-file=./filepath --otherArgument=value')
})

test('File and other argument maintained with trailing spaces maintained as-is', () => {
    expect(fromLiteralsToFromFile("--from-file=./filepath          --otherArgument=value          "))
        .toBe('--from-file=./filepath --otherArgument=value')
})

test('File and other argument maintained with trailing spaces maintained as-is', () => {
    expect(fromLiteralsToFromFile("--from-file=./filepath      00    --otherArgument=value          "))
        .toBe('--from-file=./filepath      00 --otherArgument=value')
})

test('File and other argument maintained with trailing spaces maintained as-is', () => {
    expect(fromLiteralsToFromFile("--from-file=./filepath      00    --otherArgument=\"value     0\"     --otherArgument=value           "))
        .toBe('--from-file=./filepath      00 --otherArgument=\"value     0\" --otherArgument=value')
})

test('File and other argument maintained maintained as-is', () => {
    expect(fromLiteralsToFromFile("--from-file=./filepath --otherArgument=\"value     \""))
        .toBe('--from-file=./filepath --otherArgument=\"value     \"')
})

test('File maintained as-is', () => {
    expect(fromLiteralsToFromFile("--from-file=./filepath")).toBe('--from-file=./filepath')
})

test('Any other argument maintained as-is', () => {
    expect(fromLiteralsToFromFile("--otherArgument=value")).toBe('--otherArgument=value')
})

test('Any other arguments maintained as-is', () => {
    expect(fromLiteralsToFromFile("--otherArgument=value --otherArgument=value")).toBe('--otherArgument=value --otherArgument=value')
})

test('Invalid case, no value for secret', () => {
    expect(() => fromLiteralsToFromFile("--from-literal=key")).toThrow(Error);
})

test('Multiple commnads combined', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=value --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "value");
})

test('In-valid trailing space in secret is igonered', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=value           --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "value");
})

test('Missplaced values ignored', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=value     0       --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "value");
})

test('Valid Trailing space in secret', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=\"value     0\"       --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "value     0");
})

test('Valid space in secret Case1', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=\"value 023\"       --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "value 023");
})

test('Valid space in secret Case2', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=\"   Value 023\"       --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "   Value 023");
})

test('Valid " Case1', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=value\"ksk --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "value\"ksk");
})

test('Valid " Case2', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=\"valueksk     --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "\"valueksk");
})

test('Valid " Case3', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key2");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key2=valueksk\"     --from-file=./filepath --otherArgument=value"))
        .toBe('--from-file=' + filePath + ' --from-file=./filepath --otherArgument=value');
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "valueksk\"");
})

test('No separator ', () => {
    expect(fromLiteralsToFromFile("test=this")).toBe('test=this')
})

test('Special characters & in value', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key3");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key3=hello&world")).toBe('--from-file=' + filePath);
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "hello&world");
})

test('Special characters # in value', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key4");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key4=hello#world")).toBe('--from-file=' + filePath);
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "hello#world");
})

test('Special characters = in value', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key5");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key5=hello=world")).toBe('--from-file=' + filePath);
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "hello=world");
})

test('Special characters in value', () => {
    var filePath = path.join(process.env['RUNNER_TEMP'], "key6");
    fileUtility.writeFileSync = jest.fn();
    expect(fromLiteralsToFromFile("--from-literal=key6=&^)@!&^@)")).toBe('--from-file=' + filePath);
    expect(fileUtility.writeFileSync).toBeCalledWith(filePath, "&^)@!&^@)");
})