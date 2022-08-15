## 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-develop)

```
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-start)

```
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/developer-docs/latest/developer-resources/cli/CLI.html#strapi-build)

```
yarn build
```

## Supporting Tools for Development

Different containerized services to use in the development process like postgresql and pgadmn

### Linux prerequisites

```bash
# Create the data/postgresql folder
mkdir -p data/postgresql
# Add the UID 1001 (non-root user of postgresql) as the folder owner
chown -R 1001:1001 data/postgresql
```

### Docker-Compose

This will startup a local postgresDB with a RDMS system (pgadmin).

#### Start

```bash
# docker version < 20.10.x
docker-compose up -d
# docker version >= 20.10.x
docker compose up -d
```

> 💡 If you have trouble with the creation of the containers use: `docker compose up -d --force-recreate`

#### Stop

```bash
# docker version < 20.10.x
docker-compose down
# docker version >= 20.10.x
docker compose down
```

### PGAdmin

A postgresql databas management tool

- PostgreSQL:
  - User: postgres
  - Password: supersecret123

#### Create a database

1. Open [pgadmin](http://localhost:7050/)
2. Login
   - Email: info@zskarte.ch
   - Password: zskarte
3. Add Server (right click on Servers)
   - Register -> Server
     - Name: postgres-local
     - Host: postgresql-zskarte
     - Port: 5432
     - Username: postgres
     - Password: supersecret123
     - Save-Password: yes
4. Create database (right click on Servers -> Server -> Databases)
   - Create -> Database
     - Name: zskarte

#### Persist database connections

```bash
# Execute inside pgadmin docker container
docker exec -it pgadmin sh
# Dump Actual connections into servers.json file to
/venv/bin/python setup.py --dump-servers servers.json --user info@zskarte.ch
```

## Azure

### Kubernetes Connect

Connect to the AKS cluster with the following commands

```bash
# Install azure cli on MAC
brew update && brew install azure-cli

az login
az aks get-credentials --subscription zskarte --resource-group zskare --name zskare-aks --admin
# Switch your kubeconfig context (install kubectx first)
kubectx zskarte-aks-admin
# Switch to Test namespace (kubens doesn't work)
kubectl config set-context --current --namespace zskarte-test
# Switch to Prod namespace (kubens doesn't work)
kubectl config set-context --current --namespace zskarte-prod
```

#### Connect to pgadmin on AKS

```bash
kubectl port-forward service/pgadmin 7050:80
```

### Cheap AKS Cluster

https://georgepaw.medium.com/how-to-run-the-cheapest-kubernetes-cluster-at-1-per-day-tutorial-9673f062b903

```bash
# Fill env variables
export SUBSCRIPTION=66961ec5-0870-43fb-a5cc-35e73d6d49d2
export LOCATION=switzerlandnorth
export RESOURCE_GROUP=zskarte
export AKS_CLUSTER=zskarte-aks
export VM_SIZE=Standard_B2s

# Create SSH key pair to login to instance in the future filename: zskarte
ssh-keygen -t rsa -b 4096 -C "zskarte"

# Create resource group
az group create --name $RESOURCE_GROUP \
		--subscription $SUBSCRIPTION \
		--location $LOCATION

# Create a basic single-node AKS cluster
az aks create \
	--subscription $SUBSCRIPTION \
	--resource-group $RESOURCE_GROUP \
	--name $AKS_CLUSTER \
	--vm-set-type VirtualMachineScaleSets \
	--node-count 1 \
	--ssh-key-value zskarte.pub \
	--load-balancer-sku basic \
	--enable-cluster-autoscaler \
	--min-count 1 \
	--max-count 1 \
    --node-vm-size $VM_SIZE \
    --nodepool-name default \
    --node-osdisk-size 32 \
    --node-osdisk-type managed

# Get credentials of AKS cluster
az aks get-credentials \
	--subscription $SUBSCRIPTION \
	--resource-group $RESOURCE_GROUP \
	--name $AKS_CLUSTER \
    --admin
```

### Disable AKS SLA
```bash
AKSResourceID=$(az aks show --subscription $SUBSCRIPTION --name $AKS_CLUSTER --resource-group $RESOURCE_GROUP --query id -o tsv)
az resource update --ids $AKSResourceID --subscription $SUBSCRIPTION --set sku.tier="Free"
```

## Helm add Bitnami repo

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
```

### Install NGINX Ingress
```bash
helm upgrade --install nginx-ingress bitnami/nginx-ingress-controller --create-namespace -n nginx-ingress -f .azure/aks/nginx/values.yml
```

### Install Cert-Manager
```bash
helm upgrade --install cert-manager bitnami/cert-manager --create-namespace -n cert-manager -f .azure/aks/cert-manager/values.yml
kubectl apply -f .azure/aks/cert-manager/letsencrpyt-staging.yml
kubectl apply -f .azure/aks/cert-manager/letsencrpyt-prod.yml
```
