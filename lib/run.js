"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromLiteralsToFromFile = void 0;
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const toolrunner_1 = require("@actions/exec/lib/toolrunner");
const path = require("path");
const os = require("os");
const io = require("@actions/io");
const fileUtility = require("./file.utility");
let kubectlPath = "";
function checkAndSetKubectlPath() {
    return __awaiter(this, void 0, void 0, function* () {
        kubectlPath = yield io.which('kubectl', false);
        if (kubectlPath) {
            return;
        }
        const allVersions = toolCache.findAllVersions('kubectl');
        kubectlPath = allVersions.length > 0 ? toolCache.find('kubectl', allVersions[0]) : '';
        if (!kubectlPath) {
            throw new Error('Kubectl is not installed');
        }
        kubectlPath = path.join(kubectlPath, `kubectl${getExecutableExtension()}`);
    });
}
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
function createSecret() {
    return __awaiter(this, void 0, void 0, function* () {
        const typeOfSecret = core.getInput('secret-type', { required: true });
        const secretName = core.getInput('secret-name', { required: true });
        const namespace = core.getInput('namespace');
        yield deleteSecret(namespace, secretName);
        let args;
        if (typeOfSecret === "docker-registry") {
            args = getDockerSecretArguments(secretName);
        }
        else if (typeOfSecret === "generic") {
            args = getGenericSecretArguments(secretName);
        }
        else {
            throw new Error('Invalid secret-type input. It should be either docker-registry or generic');
        }
        if (namespace) {
            args.push('-n', namespace);
        }
        const toolRunner = new toolrunner_1.ToolRunner(kubectlPath, args);
        const code = yield toolRunner.exec();
        if (code != 0) {
            throw new Error('Secret create failed.');
        }
        core.setOutput('secret-name', secretName);
    });
}
function deleteSecret(namespace, secretName) {
    return __awaiter(this, void 0, void 0, function* () {
        let args = ['delete', 'secret', secretName];
        if (namespace) {
            args.push('-n', namespace);
        }
        const toolRunner = new toolrunner_1.ToolRunner(kubectlPath, args, { failOnStdErr: false, ignoreReturnCode: true, silent: true });
        yield toolRunner.exec();
        core.debug(`Deleting ${secretName} if already exist.`);
    });
}
function getDockerSecretArguments(secretName) {
    const userName = core.getInput('container-registry-username');
    const password = core.getInput('container-registry-password');
    const server = core.getInput('container-registry-url');
    let email = core.getInput('container-registry-email');
    let args = ['create', 'secret', 'docker-registry', secretName, '--docker-username', userName, '--docker-password', password];
    if (server) {
        args.push('--docker-server', server);
    }
    if (!email) {
        email = ' ';
    }
    args.push('--docker-email', email);
    return args;
}
function getGenericSecretArguments(secretName) {
    const secretArguments = core.getInput('arguments');
    const parsedArgument = fromLiteralsToFromFile(secretArguments);
    let args = ['create', 'secret', 'generic', secretName];
    args.push(...toolrunner_1.argStringToArray(parsedArgument));
    return args;
}
/**
 * Takes a valid kubectl arguments and parses --from-literal to --from-file
 * @param secretArguments
 */
function fromLiteralsToFromFile(secretArguments) {
    const parsedArgument = secretArguments.split("--").reduce((argumentsBuilder, argument) => {
        if (argument && !argument.startsWith("from-literal=")) {
            argumentsBuilder = argumentsBuilder.trim() + " --" + argument;
        }
        else if (argument && argument.startsWith("from-literal=")) {
            const command = argument.substring("from-literal=".length);
            /* The command starting after 'from-literal=' contanis a 'key=value' format. The secret itself might contain a '=',
            Hence the substring than a split*/
            if (command.indexOf("=") == -1)
                throw new Error('Invalid from-literal input. It should contain a key and value');
            const secretName = command.substring(0, command.indexOf("=")).trim();
            const secretValue = command.substring(command.indexOf("=") + 1).trim();
            //Secret with spaces will be enclosed in quotes -> "secret "
            if (secretValue && secretValue.indexOf("\"") == 0 && secretValue.lastIndexOf("\"") == secretValue.length - 1) {
                const secret = secretValue.substring(1, secretValue.lastIndexOf("\""));
                argumentsBuilder += " --from-file=" + fileUtility.createFile(secretName, secret, true);
            }
            else {
                const secret = secretValue.substring(0, secretValue.indexOf(" ") == -1 ? secretValue.length : secretValue.indexOf(" "));
                argumentsBuilder += " --from-file=" + fileUtility.createFile(secretName, secret, true);
            }
        }
        return argumentsBuilder;
    });
    return parsedArgument.trim();
}
exports.fromLiteralsToFromFile = fromLiteralsToFromFile;
function checkClusterContext() {
    if (!process.env["KUBECONFIG"]) {
        throw new Error('Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context');
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        return;
        checkClusterContext();
        yield checkAndSetKubectlPath();
        yield createSecret();
    });
}
run().catch(core.setFailed);
