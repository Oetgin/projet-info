import mysql.connector, datetime, requests, time

def iso_to_sql_datetime(iso_time: str):
    return datetime.datetime.fromisoformat(iso_time).strftime("%Y-%m-%d %H:%M:%S")

class DataQuery:

    def __init__(self, url) -> None:
        self.url = url


    def get_data(self):
        try:
            result = requests.get(self.url)
            result.raise_for_status()
            return result.json()
        except:
            pass


    def create_table(self, cursor):
        pass


    def store(self, data, connection, cursor):
        pass


# ===== parcs-relais ===== #

class PRQuery(DataQuery):

    def __init__(self) -> None:
        super().__init__(
            "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/tco-parcsrelais-star-etat-tr/records?select=idparc%2C%20lastupdate%2C%20etatouverture%2C%20capacitesoliste%2C%20jrdinfosoliste&limit=-1"
        ) # idparc, lastupdate, etatouverture, capacitesoliste, jrdinfosoliste

    
    def create_table(self, cursor):
        cursor.execute("CREATE TABLE IF NOT EXISTS `parcs-relais` (`idparc` varchar(10) NOT NULL, `lastupdate` datetime NOT NULL, `etatouverture` varchar(10) NOT NULL, `capacitesoliste` int NOT NULL, `jrdinfosoliste` int NOT NULL, PRIMARY KEY (`idparc`,`lastupdate`));")

    
    def store(self, data, connection, cursor):
        values = [(e["idparc"], iso_to_sql_datetime(e["lastupdate"]), e["etatouverture"], e["capacitesoliste"], e["jrdinfosoliste"]) for e in data["results"]]
        cursor.executemany("INSERT IGNORE INTO `parcs-relais` VALUES (%s, %s, %s, %s, %s);", values)

        connection.commit()


# ===== bikes-stations ===== #

class BikesStationsQuery(DataQuery):

    def __init__(self) -> None:
        super().__init__(
            "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/etat-des-stations-le-velo-star-en-temps-reel/records?select=idstation%2C%20lastupdate%2C%20nombreemplacementsactuels%2C%20nombreemplacementsdisponibles%2C%20nombrevelosdisponibles%2C%20etat&limit=-1"
        ) # idstation, lastupdate, nombreemplacementsactuels, nombreemplacementsdisponibles, nombrevelosdisponibles, etat

    
    def create_table(self, cursor):
        cursor.execute("CREATE TABLE IF NOT EXISTS `bikes-stations` (`idstation` int NOT NULL, `lastupdate` datetime NOT NULL, `nombreemplacementsactuels` int NOT NULL, `nombreemplacementsdisponibles` int NOT NULL, `nombrevelosdisponibles` int NOT NULL, `etat` varchar(255) NOT NULL, PRIMARY KEY (`idstation`,`lastupdate`));")

    
    def store(self, data, connection, cursor):
        values = [(int(e["idstation"]), iso_to_sql_datetime(e["lastupdate"]), e["nombreemplacementsactuels"], e["nombreemplacementsdisponibles"], e["nombrevelosdisponibles"], ";".join(e["etat"])) for e in data["results"]]
        cursor.executemany("INSERT IGNORE INTO `bikes-stations` VALUES (%s, %s, %s, %s, %s, %s);", values)

        connection.commit()


# ===== Main ===== #

if __name__ == "__main__":

    print("Waiting 10 seconds for the database to start...")
    time.sleep(10) # Most dirty fix you will ever see in your entire life (wait for the database to start when using docker compose)

    QUERIES = [PRQuery(), BikesStationsQuery()]

    print("Connecting to the database...")
    connection = mysql.connector.connect(
        host="mysql",
        user="root",
        password="root",
        database="open_data_rennes"
    )

    cursor = connection.cursor()

    for q in QUERIES:
        q.create_table(cursor)

    print("Starting crawler...")
    while True:
        try:
            start = time.time()

            for q in QUERIES:
                data = q.get_data()
                if data:
                    q.store(data, connection, cursor)

            time.sleep(max(0, 30 - time.time() + start))
        except KeyboardInterrupt:
            print("Exiting crawler...")
            break

    cursor.close()
    connection.close()