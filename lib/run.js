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
exports.buildSecret = exports.checkClusterContext = void 0;
const core = require("@actions/core");
const client_node_1 = require("@kubernetes/client-node");
function checkClusterContext() {
    if (!process.env["KUBECONFIG"]) {
        throw new Error('Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context');
    }
}
exports.checkClusterContext = checkClusterContext;
function buildSecret(secretName, namespace) {
    return __awaiter(this, void 0, void 0, function* () {
        // The secret type for the new secret
        const secretType = core.getInput('secret-type', { required: true });
        const metaData = {
            name: secretName,
            namespace: namespace
        };
        // The serialized form of the secret data is a base64 encoded string
        let data = {};
        if (core.getInput('data')) {
            core.debug(`loading 'data' field`);
            data = JSON.parse(core.getInput('data'));
        }
        // The plaintext form of the secret data
        let stringData = {};
        if (core.getInput('string-data')) {
            core.debug(`loading 'string-data' field`);
            stringData = JSON.parse(core.getInput('string-data'));
        }
        // Create secret object for passing to the api
        core.debug(`creating V1Secret`);
        const secret = {
            apiVersion: 'v1',
            type: secretType,
            data: data,
            stringData: stringData,
            metadata: metaData
        };
        return secret;
    });
}
exports.buildSecret = buildSecret;
function run() {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        checkClusterContext();
        // Create kubeconfig and load values from 'KUBECONFIG' environment variable
        const kc = new client_node_1.KubeConfig();
        core.debug(`loading kubeconfig from defaults...`);
        kc.loadFromDefault();
        const api = kc.makeApiClient(client_node_1.CoreV1Api);
        // The name of the new secret
        const secretName = core.getInput('secret-name', { required: true });
        // The namespace in which to place the secret
        const namespace = core.getInput('namespace') || 'default';
        // Delete if exists
        let deleteSecretResponse;
        try {
            deleteSecretResponse = yield api.deleteNamespacedSecret(secretName, namespace);
        }
        catch ({ response }) {
            core.warning(`Failed to delete secret with statusCode: ${response === null || response === void 0 ? void 0 : response.statusCode}`);
            core.warning((_a = response === null || response === void 0 ? void 0 : response.body) === null || _a === void 0 ? void 0 : _a.metadata);
        }
        core.info('Deleting secret:');
        core.info((_b = deleteSecretResponse === null || deleteSecretResponse === void 0 ? void 0 : deleteSecretResponse.response) === null || _b === void 0 ? void 0 : _b.body);
        const secret = yield buildSecret(secretName, namespace);
        let result;
        try {
            result = yield api.createNamespacedSecret(namespace, secret);
        }
        catch ({ response }) {
            core.error(`Failed to create secret with statusCode: ${response === null || response === void 0 ? void 0 : response.statusCode}`);
            core.error(response === null || response === void 0 ? void 0 : response.body);
        }
        const response = result === null || result === void 0 ? void 0 : result.response;
        core.debug((_c = response === null || response === void 0 ? void 0 : response.body) === null || _c === void 0 ? void 0 : _c.metadata);
    });
}
run().catch(core.setFailed);
