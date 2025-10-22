import mysql.connector, datetime, requests, time, urllib.parse

def iso_to_sql_datetime(iso_time: str):
    return datetime.datetime.fromisoformat(iso_time).strftime("%Y-%m-%d %H:%M:%S")

class DataQuery:

    def __init__(self, url: str) -> None:
        self.url = url


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

        if "results" not in data:
            print(f"Warning: unable to find 'results' in {data}")
            return

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

        if "results" not in data:
            print(f"Warning: unable to find 'results' in {data}")
            return

        values = [(int(e["idstation"]), iso_to_sql_datetime(e["lastupdate"]), e["nombreemplacementsactuels"], e["nombreemplacementsdisponibles"], e["nombrevelosdisponibles"], ";".join(e["etat"])) for e in data["results"]]
        cursor.executemany("INSERT IGNORE INTO `bikes-stations` VALUES (%s, %s, %s, %s, %s, %s);", values)

        connection.commit()


# ===== Proxy =====#

CALL_LIMIT = 30
RESET_DELAY = 3600 # 1h

# We use proxies to bypass rate limit but we also need to bypass proxies restrictions...
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:144.0) Gecko/20100101 Firefox/144.0"} 

class ProxyUsage:

    def __init__(self) -> None:
        self.calls: list[float] = [] # timestamps


    def register_usage(self):
        self.calls.append(time.time())


    # Update usages and check
    def has_remaining(self):
        current = time.time()
        self.calls = list(filter(lambda t: current - t < RESET_DELAY, self.calls))

        return len(self.calls) < CALL_LIMIT


class Proxy:

    def __init__(self, proxy_url: str, need_uri_encoding: bool) -> None:
        self.proxy_url = proxy_url
        self.need_uri_encoding = need_uri_encoding
        self.usages: dict[str, ProxyUsage] = {} # api_url, ProxyUsage


    def has_remaining(self, api_url):
        return self.usages[api_url].has_remaining() if api_url in self.usages else True

    
    def make_request(self, api_url):

        if self.need_uri_encoding:
            api_url = urllib.parse.quote_plus(api_url)

        result = requests.get(self.proxy_url + api_url, headers=HEADERS)

        if result.status_code == 500:
            return False
        
        if api_url not in self.usages:
            self.usages[api_url] = ProxyUsage()
        
        self.usages[api_url].register_usage()

        if result.status_code == 200:
            return result.json()


PROXIES = [
    Proxy("https://corsproxy.io/?url=", False),
    Proxy("https://api.allorigins.win/raw?url=", True),
    Proxy("https://api.codetabs.com/v1/proxy?quest=", True),
    Proxy("", False), # Local ip
]


def get_data(url):
    for p in PROXIES:
        if p.has_remaining(url):
            result = p.make_request(url)
            if result == False:
                print(f"Warning: {p.proxy_url} failed.")
            else:
                return result
        
    print("Warning: Unable to make request, all proxies reached call limit.")


# ===== Main ===== #

if __name__ == "__main__":

    print("Waiting 10 seconds for the database to start...")
    time.sleep(10) # Most dirty fix you will ever see in your entire life (wait for the database to start when using docker compose)

    QUERIES: list[DataQuery] = [PRQuery(), BikesStationsQuery()]

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
                data = get_data(q.url)
                if data:
                    q.store(data, connection, cursor)

            time.sleep(max(0, 30 - time.time() + start))
        except KeyboardInterrupt:
            print("Exiting crawler...")
            break

    cursor.close()
    connection.close()