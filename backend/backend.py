from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import os
import mysql.connector

app = Flask(__name__)
cors = CORS(app) # allow CORS for all domains on all routes.
app.config['CORS_HEADERS'] = 'Content-Type'


def get_db_connection(database: str):
    params = {
        "host": os.getenv("MYSQL_HOST", "mysql"),
        "port": int(os.getenv("MYSQL_PORT", 3306)),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", "root"),
        "database": database,
    }
    return mysql.connector.connect(**params)


@app.route("/overview")
@cross_origin()
def overview():
    """
    Return the total number of parking spaces, the number of occupied spaces, the status, and the last update time for each parking lot.
    """

    try:
        conn = get_db_connection("open_data_rennes")
    except Exception as e:
        return jsonify({"error": f"database connection failed: {e}"}), 500

    try:
        cur = conn.cursor(dictionary=True)
        
        cur.execute(OVERVIEW_QUERY)
        rows = cur.fetchall()

        data = []
        for row in rows:
            # Rename the fields
            data.append({
                "parc_id": row["idparc"], # type: ignore
                "total_spaces": row["capacitesoliste"], # type: ignore
                "occupied_spaces": row["capacitesoliste"] - row["jrdinfosoliste"], # type: ignore
                "status": row["etatouverture"], # type: ignore
                "lastupdate": row["lastupdate"].isoformat(), # type: ignore
            })

        cur.close()
        conn.close()

        return jsonify(data)
    
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return jsonify({"error": f"query failed: {e}"}), 500


@app.route("/history/<parc_id>")
@cross_origin()
def history(parc_id):
    """
    Return the parking history for a specific parking lot.
    The history includes the total number of parking spaces, the number of occupied spaces, the status, and the last update time for each record.
    The number of records returned can be limited by the "limit" query parameter (default: 100, max: 10000).
    """

    try:
        conn = get_db_connection("open_data_rennes")
    except Exception as e:
        return jsonify({"error": f"database connection failed: {e}"}), 500
    
    limit = request.args.get('limit', default=100, type=int)

    if limit > 10000:
        return jsonify({"error": "limit must be less than or equal to 10000"}), 400

    try:
        cur = conn.cursor(dictionary=True)
        
        cur.execute(HISTORY_QUERY, (parc_id, limit))
        rows = cur.fetchall()

        data = []
        for row in rows:
            # Rename the fields
            data.append({
                "total_spaces": row["capacitesoliste"], # type: ignore
                "occupied_spaces": row["capacitesoliste"] - row["jrdinfosoliste"], # type: ignore
                "status": row["etatouverture"], # type: ignore
                "time": row["lastupdate"].isoformat(), # type: ignore
            })

        data.reverse()

        cur.close()
        conn.close()

        return jsonify(data)
    
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return jsonify({"error": f"query failed: {e}"}), 500


@app.route("/predictions/<parc_id>")
@cross_origin()
def predictions(parc_id):
    """
    Return the parking predictions for a specific parking lot.
    """

    try:
        conn = get_db_connection("predictions")
    except Exception as e:
        return jsonify({"error": f"database connection failed: {e}"}), 500
    
    limit = request.args.get('limit', default=100, type=int)

    if limit > 1000:
        return jsonify({"error": "limit must be less than or equal to 1000"}), 400

    try:
        cur = conn.cursor(dictionary=True)
        
        cur.execute(PREDICTIONS_QUERY, (parc_id, limit))
        rows = cur.fetchall()

        data = []
        for row in rows:
            # Rename the fields
            data.append({
                "total_spaces": int(row["capacity"]), # type: ignore
                "predicted_occupied": int(row["prediction"]), # type: ignore
                "predicted_lower_bound": int(row["lower_bound"]), # type: ignore
                "predicted_upper_bound": int(row["upper_bound"]), # type: ignore
                "time": row["target_time"].isoformat(), # type: ignore
            })

        cur.close()
        conn.close()

        return jsonify(data)
    
    except Exception as e:
        try:
            conn.close()
        except Exception:
            pass
        return jsonify({"error": f"query failed: {e}"}), 500


# ______________________________ QUERIES ______________________________ #

OVERVIEW_QUERY = '''
        SELECT t.idparc, t.lastupdate, t.etatouverture, t.capacitesoliste, t.jrdinfosoliste
        FROM `parcs-relais` t
        INNER JOIN (
            SELECT idparc, MAX(lastupdate) AS lastupdate
            FROM `parcs-relais`
            GROUP BY idparc
        ) m ON t.idparc = m.idparc AND t.lastupdate = m.lastupdate
        '''

HISTORY_QUERY = "SELECT * FROM `parcs-relais` WHERE idparc = %s ORDER BY `lastupdate` DESC LIMIT %s"

PREDICTIONS_QUERY = "SELECT * FROM `predictions` WHERE park_id = %s AND target_time > NOW() ORDER BY `target_time` LIMIT %s"