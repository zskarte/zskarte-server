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

* PostgreSQL: 
    * User: postgres
    * Password: supersecret123
#### Create a database
1. Open [pgadmin](http://localhost:7050/)
2. Login
    * Email: info@zskarte.ch
    * Password: zskarte
3. Add Server (right click on Servers)
    * Register -> Server
        * Name: postgres-local
        * Host: postgresql-zskarte
        * Port: 5432
        * Username: postgres
        * Password: supersecret123
        * Save-Password: yes
4. Create database (right click on Servers -> Server -> Databases)
    * Create -> Database
        * Name: zskarte
#### Persist database connections
```bash
# Execute inside pgadmin docker container
docker exec -it pgadmin sh
# Dump Actual connections into servers.json file to
/venv/bin/python setup.py --dump-servers servers.json --user info@zskarte.ch
```

### Kubernetes Connect
Connect to the AKS cluster with the following commands

```bash
# Install azure cli on MAC
brew update && brew install azure-cli

az login
az aks get-credentials -n mgb-aks1-prod-ch -g mgb-aks1-prod-ch --subscription mgb-coreinfra-prod-ch
# Switch your kubeconfig context (install kubectx first)
kubectx mgb-aks1-prod-ch
# Switch to Test namespace (kubens doesn't work)
kubectl config set-context --current --namespace gmaa-mangelverwaltung-dev
# Switch to Prod namespace (kubens doesn't work)
kubectl config set-context --current --namespace gmaa-mangelverwaltung-prod
```

#### Connect to Strapi Backend on AKS
The strapi /admin UI is secured from the ingress. To access the Ui anyways 
you have to use the following command.

```bash
kubectl port-forward service/migros-defectmgmt-api-service 1337:80
```

#### Connect to pgadmin on AKS
```bash
kubectl port-forward service/pgadmin 7050:80
```

Add the server config with data from bitwarden => hostname, username & password
