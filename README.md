# Kubernetes create secret 
Create a [generic secret or docker-registry secret](https://kubernetes.io/docs/concepts/configuration/secret/) in Kubernetes cluster.

The secret will be created in the cluster context which was set earlier in the workflow by using either [`azure/aks-set-context`](https://github.com/Azure/aks-set-context/tree/master) or [`azure/k8s-set-context`](https://github.com/Azure/k8s-set-context/tree/master)

Refer to the action metadata file for details about all the inputs https://github.com/Azure/k8s-create-secret/blob/master/action.yml

## For docker-registry secret (imagepullsecret)
```yaml
    - name: Set imagePullSecret
      uses: azure/k8s-create-secret@v1
      with:
        namespace: 'myapp'
        container-registry-url: 'containerregistry.contoso.com'
        container-registry-username: ${{ secrets.REGISTRY_USERNAME }}
        container-registry-password: ${{ secrets.REGISTRY_PASSWORD }}
        secret-name: 'contoso-cr'
      id: create-secret
```

## For generic secret
```yaml
    - uses: azure/k8s-create-secret@v1
      with:
        namespace: 'default'
        secret-type: 'generic'
        arguments:  --from-literal=account-name=${{ secrets.AZURE_STORAGE_ACCOUNT }} --from-literal=access-key=${{ secrets.AZURE_STORAGE_ACCESS_KEY }}
        secret-name: azure-storage
```

### Prerequisites
Get the username and password of your container registry and create secrets for them. For Azure Container registry refer to **admin [account document](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-authentication#admin-account)** for username and password.

Now add the username and password as [a secret](https://developer.github.com/actions/managing-workflows/storing-secrets/) in the GitHub repository.

In the above example the secret name is `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` and it can be used in the workflow by using the following syntax:
```yaml
container-registry-username: ${{ secrets.REGISTRY_USERNAME }}
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
