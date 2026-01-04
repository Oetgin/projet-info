# Crawler

## Proxies

In order to bypass API rate limits, we had to use proxies. We used cloudflare workers to create free proxies. You can find the code we used for the workers in the [worker-proxy.js](worker-proxy.js) file. The code is based on the [cloudflare-cors-anywhere](https://github.com/Zibri/cloudflare-cors-anywhere) and has been corrected to work properly. This is originally made to bypass CORS limitations but it works perfectly for our use case.

## SQL requests

```sql
-- parcs-relais --

CREATE TABLE IF NOT EXISTS `parcs-relais` (
  `idparc` varchar(10) NOT NULL,
  `lastupdate` datetime NOT NULL,
  `etatouverture` varchar(10) NOT NULL,
  `capacitesoliste` int NOT NULL,
  `jrdinfosoliste` int NOT NULL,
  PRIMARY KEY (`idparc`,`lastupdate`)
);

INSERT IGNORE INTO `parcs-relais` VALUES (%s, %s, %s, %s, %s);

-- bikes-stations --

CREATE TABLE IF NOT EXISTS `bikes-stations` (
  `idstation` int NOT NULL,
  `lastupdate` datetime NOT NULL,
  `nombreemplacementsactuels` int NOT NULL,
  `nombreemplacementsdisponibles` int NOT NULL,
  `nombrevelosdisponibles` int NOT NULL,
  `etat` varchar(255) NOT NULL,
  PRIMARY KEY (`idstation`,`lastupdate`)
);

INSERT IGNORE INTO `bikes-stations` VALUES (%s, %s, %s, %s, %s, %s);
```