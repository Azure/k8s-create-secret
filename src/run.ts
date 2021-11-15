import * as core from '@actions/core';

const k8s = require('@kubernetes/client-node');

import { CoreV1Api, KubeConfig, V1ObjectMeta, V1Secret } from '@kubernetes/client-node';

function checkClusterContext() {
    if (!process.env["KUBECONFIG"]) {
        throw new Error('Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context');
    }
}

async function run() {
    checkClusterContext()

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
        let body = e?.response?.body
        console.log(`Failed with response body:`)
        console.log(body)
        core.setFailed(body)
    }

    console.log(result)
    return
}

run().catch(core.setFailed);