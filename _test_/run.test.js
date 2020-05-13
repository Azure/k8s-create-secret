const fromLiteralsToFromFile = require('../lib/run');
const fileUtility = require('../lib/file.utility');

beforeEach(() => {
    fileUtility.createFile = jest.fn();
});

test('Literal converted to file', () => {
    fileUtility.createFile.mockReturnValue("./key");
    expect(fromLiteralsToFromFile("--from-literal=key=value")).toBe(' --from-file=./key')
})

test('File maintained as-is', () => {
    fileUtility.createFile.mockReturnValue("./key");
    expect(fromLiteralsToFromFile("--from-file=./filepath")).toBe(' --from-file=./filepath')
})

test('Any other arguments maintained as-is', () => {
    fileUtility.createFile.mockReturnValue("./key");
    expect(fromLiteralsToFromFile("--otherArgument=value")).toBe(' --otherArgument=value')
})

test('Invalid case, no value for secret', () => {
    expect(() => fromLiteralsToFromFile("--from-literal=key")).toThrow(Error);
})

test('Multiple commnads combined', () => {
    fileUtility.createFile.mockReturnValue("./key");
    expect(fromLiteralsToFromFile("--from-literal=key=value --from-file=./filepath --otherArgument=value"))
        .toBe(' --from-file=./key --from-file=./filepath  --otherArgument=value')
})

test('No separator ', () => {
    expect(fromLiteralsToFromFile("test=this")).toBe('test=this')
})