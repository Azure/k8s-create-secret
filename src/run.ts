import * as core from '@actions/core';
import { CoreV1Api, KubeConfig, V1ObjectMeta, V1Secret } from '@kubernetes/client-node';

export function checkClusterContext() {
    if (!process.env["KUBECONFIG"]) {
        throw new Error('Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context');
    }
}

export async function buildSecret(secretName: string, namespace: string): Promise<V1Secret> {
    // The secret type for the new secret
    const secretType: string = core.getInput('secret-type', { required: true });

    const metaData: V1ObjectMeta = {
        name: secretName,
        namespace: namespace
    }

    // The serialized form of the secret data is a base64 encoded string
    let data: { [key: string]: string } = {}
    if (core.getInput('data')) {
        core.debug(`loading 'data' field`)
        data = JSON.parse(core.getInput('data'))
    }

    // The plaintext form of the secret data
    let stringData: { [key: string]: string } = {}
    if (core.getInput('string-data')) {
        core.debug(`loading 'string-data' field`)
        stringData = JSON.parse(core.getInput('string-data'))
    }

    // Create secret object for passing to the api
    core.debug(`creating V1Secret`)
    const secret: V1Secret = {
        apiVersion: 'v1',
        type: secretType,
        data: data,
        stringData: stringData,
        metadata: metaData
    }

    return secret;
}

async function run() {
    checkClusterContext()

    // Create kubeconfig and load values from 'KUBECONFIG' environment variable
    const kc: KubeConfig = new KubeConfig();
    core.debug(`loading kubeconfig from defaults...`)
    kc.loadFromDefault()

    const api: CoreV1Api = kc.makeApiClient(CoreV1Api)

    // The name of the new secret
    const secretName: string = core.getInput('secret-name', { required: true });

    // The namespace in which to place the secret
    const namespace: string = core.getInput('namespace') || 'default';

    // Delete if exists
    let deleteSecretResponse;
    try {
        deleteSecretResponse = await api.deleteNamespacedSecret(secretName, namespace)
    } catch ({ response }) {
        core.warning(`Failed to delete secret with statusCode: ${response?.statusCode}`)
        core.warning(response?.body?.metadata)
    }
    core.info('Deleting secret:')
    core.info(deleteSecretResponse?.response?.body)


    const secret = await buildSecret(secretName, namespace)
    let result
    try {
        result = await api.createNamespacedSecret(namespace, secret)
    } catch ({ response }) {
        core.error(`Failed to create secret with statusCode: ${response?.statusCode}`)
        core.error(response?.body)
    }

    let response = result?.response
    core.debug(response?.body?.metadata)
    return
}

run().catch(core.setFailed);
