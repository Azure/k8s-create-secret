# Kubernetes create secret
Create a [generic secret or docker-registry secret](https://kubernetes.io/docs/concepts/configuration/secret/) in Kubernetes cluster.

The secret will be created in the cluster context which was set earlier in the workflow by using either [`azure/aks-set-context`](https://github.com/Azure/aks-set-context/tree/master) or [`azure/k8s-set-context`](https://github.com/Azure/k8s-set-context/tree/master)

Refer to the action metadata file for details about all the inputs https://github.com/Azure/k8s-create-secret/blob/master/action.yml

For `docker-registry` type secrets, the fields `.dockercfg` or `.dockerconfigjson` can be supplied in plaintext on the `string-data` JSON object, or base64 encoded on the `data` JSON object as included in the [docker-config-secrets](https://kubernetes.io/docs/concepts/configuration/secret/#docker-config-secrets) section.

## Sample workflow for docker-registry secret (imagepullsecret, stringData)
```yaml
# File: .github/workflows/workflow.yml

on: push

jobs:
  example-job:    
    runs-on: ubuntu-latest
    steps: 
    - name: Set imagePullSecret
      uses: azure/k8s-create-secret@v2
      with:
        namespace: 'myapp'
        secret-type: 'docker-registry'
        secret-name: 'contoso-cr'
        string-data: ${{ secrets.SECRET_STRING_DATA}}
      id: create-secret
```

## Sample workflow for generic secret (base64 data)
```yaml
# File: .github/workflows/workflow.yml

on: push

jobs:
  example-job:    
    runs-on: ubuntu-latest
    steps: 
    - uses: azure/k8s-create-secret@v1
      with:
        namespace: 'default'
        secret-type: 'generic'
        secret-name: azure-storage
        data:  ${{ secrets.AZURE_STORAGE_ACCOUNT_DATA }}
```

### Prerequisites
Get the username and password of your container registry and create secrets for them. For Azure Container registry refer to **admin [account document](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-authentication#admin-account)** for username and password.
```

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
