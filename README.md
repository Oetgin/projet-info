# Projet INFO - S7 & S8

## Déploiement

Afin de déployer le projet, suivez les étapes suivantes :

1. Commencez par ajouter un *Personal Access Token* à votre compte GitHub avec la permission `read:packages`. Le guide pour se connecter est disponible [ici](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-with-a-personal-access-token-classic).
2. Copiez ensuite le fichier `compose.yml` dans un répertoire de votre choix.
3. Ouvrez un terminal dans ce répertoire et exécutez la commande suivante pour lancer les conteneurs Docker :
    ```bash
    docker compose  up -d
    ```
4. Attendez quelques instants que les conteneurs se lancent correctement.

## Accès aux services

Adminer est accessible à l'adresse [http://localhost:8080](http://localhost:8080) avec les identifiants suivants :
- **System** : MySQL/MariaDB
- **Server** : mysql
- **Username** : root
- **Password** : root

Pour se connecter et configuer Grafana, suivez [ce guide](graph/grafana.md).
