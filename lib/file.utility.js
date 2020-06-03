"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFile = void 0;
const fs = require("fs");
const path = require("path");
/**
 *
 * @param fileName The fileName in case of a file needs to be created in TEMP folder else the entire filepath
 * @param data File data
 * @param inTempFolder Boolean to indicate if file needs to be created in TEMP folder
 */
function createFile(fileName, data, inTempFolder) {
    const filePath = inTempFolder ? path.join(process.env['RUNNER_TEMP'], fileName) : fileName;
    try {
        fs.writeFileSync(filePath, data);
    }
    catch (err) {
        throw err;
    }
    return filePath;
}
exports.createFile = createFile;
