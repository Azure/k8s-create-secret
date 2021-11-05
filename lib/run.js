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
const core = require("@actions/core");
const k8s = require('@kubernetes/client-node');
function checkClusterContext() {
    if (!process.env["KUBECONFIG"]) {
        throw new Error('Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context');
    }
}
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        checkClusterContext();
        // Create kubeconfig and load values from 'KUBECONFIG' environment variable
        const kc = new k8s.KubeConfig();
        console.log(`loading kubeconfig from defaults...`);
        kc.loadFromDefault();
        const api = kc.makeApiClient(k8s.CoreV1Api);
        // The secret type for the new secret
        const secretType = core.getInput('secret-type', { required: true });
        const secretName = core.getInput('secret-name', { required: true });
        // The namespace in which to place the secret
        const namespace = core.getInput('namespace') || 'default';
        let metaData = {
            name: secretName,
            namespace: namespace
        };
        // The serialized form of the secret data is a base64 encoded string
        let data = {};
        if (core.getInput('data')) {
            console.log(`loading 'data' field`);
            data = JSON.parse(core.getInput('data'));
        }
        // The plaintext form of the secret data
        let stringData = {};
        if (core.getInput('string-data')) {
            console.log(`loading 'string-data' field`);
            stringData = JSON.parse(core.getInput('string-data'));
        }
        // Create secret object for passing to the api
        console.log(`creating V1Secret`);
        const secret = {
            apiVersion: 'v1',
            type: secretType,
            data: data,
            stringData: stringData,
            metadata: metaData
        };
        let result;
        try {
            result = yield api.createNamespacedSecret(namespace, secret);
        }
        catch (e) {
            console.log(`Failed to create secret with error: ${e}`);
            console.log(e);
            let body = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.body;
            console.log(`Failed with response rody:`);
            console.log(body);
            core.setFailed(body);
        }
        console.log(result);
        return;
    });
}
run().catch(core.setFailed);
