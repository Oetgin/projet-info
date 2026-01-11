# Setup

Pour l'affichage des graphiques, nous utilisons Grafana. Voici un guide pour configurer Grafana et afficher les données.

## Installation

L'installation se fait automatiquement lors du lancement du fichier `Docker compose`. Vous pouvez accéder à Grafana via l'URL suivante : `http://localhost:3002`. Les identifiants par défaut sont :
- **Utilisateur** : admin
- **Mot de passe** : admin

## Configuration de la source de données

1. Connectez-vous à Grafana.
2. Allez dans **Connections** > **Data sources**.
3. Cliquez sur **Add new data source**.
4. Sélectionnez **MySQL**.
5. Configurez la source de données avec les informations suivantes :
   - **Host** : `mysql`
   - **Username** : `root`
   - **Password** : `root`
6. Cliquez sur **Save & Test** pour vérifier la connexion.

## Importation du tableau de bord

1. Allez dans **Dashboards**
2. Cliquez sur **Import** (ou **New** > **Import**).
3. Importez le fichier `dashboard.json` ou collez le contenu JSON.
4. Cliquez sur **Load** puis sur **Import**.
5. Vous allez peut-être avoir une erreur sur les tableaux. Si c'est le cas, cliquez sur **Edit** (3 petits points en haut à droite du tableau) sur le premier tableau. Cliquez ensuite une fois sur le bouton **Run query**. Vous pouvez ensuite cliquer sur **Save dashboard** en haut à droite de l'écran.

