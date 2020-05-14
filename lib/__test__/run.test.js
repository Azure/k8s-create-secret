"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const run_1 = require("../src/run");
const file_utility_1 = require("../src/file.utility");
const utils_1 = require("ts-jest/utils");
jest.mock('../src/file.utility');
const fileUtility = utils_1.mocked(file_utility_1.createFile, true);
test('Literal converted to file', () => {
    fileUtility.mockReturnValue("./key");
    expect(run_1.fromLiteralsToFromFile("--from-literal=key=value")).toBe(' --from-file=./key');
});
test('File maintained as-is', () => {
    fileUtility.mockReturnValue("./key");
    expect(run_1.fromLiteralsToFromFile("--from-file=./filepath")).toBe(' --from-file=./filepath');
});
test('Any other arguments maintained as-is', () => {
    fileUtility.mockReturnValue("./key");
    expect(run_1.fromLiteralsToFromFile("--otherArgument=value")).toBe(' --otherArgument=value');
});
test('Invalid case, no value for secret', () => {
    expect(() => run_1.fromLiteralsToFromFile("--from-literal=key")).toThrow(Error);
});
test('Multiple commnads combined', () => {
    fileUtility.mockReturnValue("./key");
    expect(run_1.fromLiteralsToFromFile("--from-literal=key=value --from-file=./filepath --otherArgument=value"))
        .toBe(' --from-file=./key --from-file=./filepath  --otherArgument=value');
});
test('No separator ', () => {
    expect(run_1.fromLiteralsToFromFile("test=this")).toBe('test=this');
});
