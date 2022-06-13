import * as core from '@actions/core';
import { CoreV1Api, KubeConfig, V1ObjectMeta, V1Secret } from '@kubernetes/client-node';

export function checkClusterContext() {
    if (!process.env["KUBECONFIG"]) {
        throw new Error('Cluster context not set. Use k8s-set-context/aks-set-context action to set cluster context');
    }
}

export type DockerConfigJSON = {
    auths: {
        [key: string]: {
            username: string;
            password: string;
            email?: string;
            auth: string;
        };
    };
};

export function buildContainerRegistryDockerConfigJSON(registryUrl: string, registryUserName: string, registryPassword: string, registryEmail): DockerConfigJSON {
    const authString = Buffer.from(`${registryUserName}:${registryPassword}`).toString('base64');
    const dockerConfigJson: DockerConfigJSON = {
        "auths": {
            [registryUrl]: {
                "username": registryUserName,
                "password": registryPassword,
                "auth": authString,
            }
        }
    }

    if (registryEmail) {
        dockerConfigJson.auths[registryUrl].email = registryEmail
    }
    return dockerConfigJson//Buffer.from(JSON.stringify(dockerConfigJson)).toString('base64');
}

export async function buildSecret(secretName: string, namespace: string): Promise<V1Secret> {
    // The secret type for the new secret
    const secretType: string = core.getInput('secret-type');

    const metaData: V1ObjectMeta = {
        name: secretName,
        namespace: namespace
    }

    const containerRegistryURL = core.getInput('container-registry-url');
    const containerRegistryUserName = core.getInput('container-registry-username');
    const containerRegistryPassword = core.getInput('container-registry-password');
    const containerRegistryEmail = core.getInput('container-registry-email');

    // Check if any container registry credentials are provided
    if (containerRegistryURL || containerRegistryUserName || containerRegistryPassword || containerRegistryEmail) {
        if (!containerRegistryURL) {
            core.setFailed('container-registry-url is required when container-registry-username or container-registry-password is provided');
        }
        if (!containerRegistryUserName) {
            core.setFailed('container-registry-username is required when container-registry-url or container-registry-password is provided');
        }
        if (!containerRegistryPassword) {
            core.setFailed('container-registry-password is required when container-registry-url or container-registry-username or container-registry-email is provided');
        }

        const dockerConfigJSON = buildContainerRegistryDockerConfigJSON(containerRegistryURL, containerRegistryUserName, containerRegistryPassword, containerRegistryEmail);
        const dockerConfigJSONString = JSON.stringify(dockerConfigJSON);
        const dockerConfigBase64 = Buffer.from(dockerConfigJSONString).toString('base64');

        const data = {
            ".dockerconfigjson": dockerConfigBase64
        }

        return {
            apiVersion: "v1",
            kind: "Secret",
            metadata: metaData,
            type: secretType,
            data: data
        }
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
    core.info('Creating secret')
    try {
        await api.createNamespacedSecret(namespace, secret)
    } catch (err) {
        core.info(JSON.stringify(err))
        core.setFailed(err.message)
    }

}

run().catch(core.setFailed);
