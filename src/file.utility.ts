import fs = require("fs");
import * as path from 'path';

/**
 * 
 * @param fileName The fileName in case of a file needs to be created in TEMP folder else the entire filepath
 * @param data File data
 * @param inTempFolder Boolean to indicate if file needs to be created in TEMP folder
 */
export function createFile(fileName: string, data: string, inTempFolder: boolean): string {
    const filePath = inTempFolder ? path.join(process.env['RUNNER_TEMP'], fileName) : fileName;
    try {
        fs.writeFileSync(filePath, data);
    }
    catch (err) {
        throw err;
    }
    return filePath;
}