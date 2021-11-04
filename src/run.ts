import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import { ToolRunner, argStringToArray } from "@actions/exec/lib/toolrunner";

import * as path from 'path';
import * as os from 'os';
import * as io from '@actions/io';

const k8s = require('@kubernetes/client-node');

import fileUtility = require('./file.utility')
import { CoreV1Api, KubeConfig, V1ObjectMeta, V1Secret, HttpError } from '@kubernetes/client-node';

let kubectlPath = "";

async function checkAndSetKubectlPath() {
    kubectlPath = await io.which('kubectl', false);
    if (kubectlPath) {
        return;
    }

    const allVersions = toolCache.findAllVersions('kubectl');
    kubectlPath = allVersions.length > 0 ? toolCache.find('kubectl', allVersions[0]) : '';
    if (!kubectlPath) {
        throw new Error('Kubectl is not installed');
    }

    kubectlPath = path.join(kubectlPath, `kubectl${getExecutableExtension()}`);
}

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }

    return '';
}

async function createSecret() {
    const typeOfSecret = core.getInput('secret-type', { required: true });
    const secretName = core.getInput('secret-name', { required: true });
    const namespace = core.getInput('namespace');

    await deleteSecret(namespace, secretName);

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

    const toolRunner = new ToolRunner(kubectlPath, args);
    const code = await toolRunner.exec();
    if (code != 0) {
        throw new Error('Secret create failed.')
    }
    core.setOutput('secret-name', secretName);
}

async function deleteSecret(namespace: string, secretName: string) {
    let args = ['delete', 'secret', secretName];

    if (namespace) {
        args.push('-n', namespace);
    }

    const toolRunner = new ToolRunner(kubectlPath, args, { failOnStdErr: false, ignoreReturnCode: true, silent: true });
    await toolRunner.exec();
    core.debug(`Deleting ${secretName} if already exist.`);
}

function getDockerSecretArguments(secretName: string): string[] {
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

function getGenericSecretArguments(secretName: string): string[] {
    const secretArguments = core.getInput('arguments');
    const parsedArgument = fromLiteralsToFromFile(secretArguments);
    let args = ['create', 'secret', 'generic', secretName];
    args.push(...argStringToArray(parsedArgument));
    return args;
}

/**
 * Takes a valid kubectl arguments and parses --from-literal to --from-file
 * @param secretArguments 
 */
export function fromLiteralsToFromFile(secretArguments: string): string {
    const parsedArgument = secretArguments.split("--").reduce((argumentsBuilder, argument) => {
        if (argument && !argument.startsWith("from-literal=")) {
            argumentsBuilder = argumentsBuilder.trim() + " --" + argument;
        } else if (argument && argument.startsWith("from-literal=")) {
            const command = argument.substring("from-literal=".length);
            /* The command starting after 'from-literal=' contanis a 'key=value' format. The secret itself might contain a '=', 
            Hence the substring than a split*/
            if (command.indexOf("=") == -1) throw new Error('Invalid from-literal input. It should contain a key and value');
            const secretName = command.substring(0, command.indexOf("=")).trim();
            const secretValue = command.substring(command.indexOf("=") + 1).trim();
            //Secret with spaces will be enclosed in quotes -> "secret "
            if (secretValue && secretValue.indexOf("\"") == 0 && secretValue.lastIndexOf("\"") == secretValue.length - 1) {
                const secret = secretValue.substring(1, secretValue.lastIndexOf("\""));
                argumentsBuilder += " --from-file=" + fileUtility.createFile(secretName, secret, true);
            } else {
                const secret = secretValue.substring(0, secretValue.indexOf(" ") == -1 ? secretValue.length : secretValue.indexOf(" "));
                argumentsBuilder += " --from-file=" + fileUtility.createFile(secretName, secret, true);
            }
        }
        return argumentsBuilder;
    });
    return parsedArgument.trim();
}

function checkClusterContext() {
    if (!process.env["KUBECONFIG"]) {
        throw new Error('Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context');
    }
}

async function run() {
    checkClusterContext();
    await checkAndSetKubectlPath();
    await createSecret();
}

async function run2() {
    //checkClusterContext()

    // Create kubeconfig and load values from 'KUBECONFIG' environment variable
    const kc: KubeConfig = new k8s.KubeConfig();
    console.log(`loading kubeconfig from defaults...`)
    kc.loadFromDefault();

    const api: CoreV1Api = kc.makeApiClient(k8s.CoreV1Api);

    // The secret type for the new secret
    const secretType: string = core.getInput('secret-type', { required: true });
    const secretName: string = core.getInput('secret-name', { required: true });

    // The namespace in which to place the secret
    const namespace: string = core.getInput('namespace') || 'default';


    let metaData: V1ObjectMeta = {
        name: secretName,
        namespace: namespace
    }

    // The serialized form of the secret data is a base64 encoded string
    let data: { [key: string]: string } = {}
    if (core.getInput('data')) {
        console.log(`loading 'data' field`)
        data = JSON.parse(core.getInput('data'))
    }

    // The plaintext form of the secret data
    let stringData: { [key: string]: string } = {}
    if (core.getInput('string-data')) {
        console.log(`loading 'string-data' field`)
        stringData = JSON.parse(core.getInput('string-data'))
    }

    // Create secret object for passing to the api
    console.log(`creating V1Secret`)
    const secret: V1Secret = {
        apiVersion: 'v1',
        type: secretType,
        data: data,
        stringData: stringData,
        metadata: metaData
    }

    let result;

    try {
        result = await api.createNamespacedSecret(namespace, secret)
    } catch (e) {
        console.log(`Failed to create secret with error: ${e}`)
        console.log(e)
        console.log(e?.body)
    }

    console.log(result)
    return
}

run2().catch(core.setFailed);