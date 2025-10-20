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