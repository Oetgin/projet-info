from pathlib import Path
import pickle
import time
import datetime
import warnings
from typing import Tuple
import pandas as pd
import numpy as np
from prophet import Prophet
import mysql.connector

warnings.filterwarnings('ignore')

# ============================================================
# CONFIGURATION
# ============================================================

DB_CONFIG = {
    'host': 'mysql',
    'user': 'root',
    'password': 'root',
    'database': 'open_data_rennes'
}

# Predictions database config
PREDICTIONS_DB_BASE = {
    'host': 'mysql',
    'user': 'root',
    'password': 'root'
}

PREDICTIONS_DB_CONFIG = {
    **PREDICTIONS_DB_BASE,
    'database': 'predictions'
}

# Preprocessing parameters
RESAMPLE_FREQUENCY = '5min'
MAX_FORWARD_FILL = 10  # n consecutive gaps max
PREDICTION_HORIZON_HOURS = 24
PREDICTION_INTERVAL_MINUTES = 5
RETRAIN_INTERVAL_DAYS = 7

# Model storage
MODELS_DIR = Path(__file__).parent / 'models'
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Parks to predict
PARKS = ['CVI', 'HFR', 'JFK', 'LGA', 'POT', 'PRE', 'SJG', 'VU']

# ============================================================

def create_predictions_database_and_table(admin_cursor):
    """Create predictions database and table if missing."""
    # Create database if it doesn't exist
    admin_cursor.execute("CREATE DATABASE IF NOT EXISTS `predictions`")

    # Now switch to predictions DB to create table
    admin_cursor.execute("USE `predictions`")
    admin_cursor.execute("""
        CREATE TABLE IF NOT EXISTS `predictions` (
            `park_id` VARCHAR(10) NOT NULL,
            `prediction_time` DATETIME NOT NULL,
            `target_time` DATETIME NOT NULL,
            `prediction` FLOAT NOT NULL,
            `lower_bound` FLOAT NOT NULL,
            `upper_bound` FLOAT NOT NULL,
            `capacity` FLOAT NOT NULL,
            PRIMARY KEY (`park_id`, `prediction_time`, `target_time`)
        )
    """)
    print("Predictions database and table ready")


def load_park_data(connection, park_id: str, days_back: int = 60) -> pd.DataFrame | None:
    cutoff_date = (datetime.datetime.now() - datetime.timedelta(days=days_back)).strftime('%Y-%m-%d')
    
    query = f"""
        SELECT idparc, lastupdate, etatouverture, capacitesoliste, jrdinfosoliste
        FROM `parcs-relais`
        WHERE idparc = '{park_id}' AND lastupdate >= '{cutoff_date}'
        ORDER BY lastupdate ASC
    """
    
    df = pd.read_sql(query, connection)
    
    if len(df) == 0:
        return None
    
    # Calculate occupancy rate
    df['occupancy_rate'] = df['jrdinfosoliste'] / df['capacitesoliste']
    df['occupancy_rate'] = df['occupancy_rate'].clip(0, 1)
    
    return df


def get_park_capacity(connection, park_id: str) -> float | None:
    cursor = connection.cursor()
    cursor.execute(
        """
            SELECT capacitesoliste
            FROM `parcs-relais`
            WHERE idparc = %s AND capacitesoliste IS NOT NULL
            ORDER BY lastupdate DESC
            LIMIT 1
        """,
        (park_id,)
    )
    row = cursor.fetchone()
    cursor.close()

    if not row or row[0] is None:
        print(f"[{park_id}] Warning: No capacity found")
        return None

    try:
        capacity = float(row[0])
    except Exception:
        print(f"[{park_id}] Warning: Invalid capacity value {row[0]}")
        return None

    if capacity <= 0:
        print(f"[{park_id}] Warning: Non-positive capacity {capacity}")
        return None

    return capacity


def get_current_park_state(connection, park_id: str) -> dict | None:
    """Get the most recent open state for a park."""
    cursor = connection.cursor()
    cursor.execute(
        """
            SELECT lastupdate, capacitesoliste, jrdinfosoliste
            FROM `parcs-relais`
            WHERE idparc = %s 
              AND etatouverture = 'OUVERT'
              AND capacitesoliste IS NOT NULL 
              AND jrdinfosoliste IS NOT NULL
            ORDER BY lastupdate DESC
            LIMIT 1
        """,
        (park_id,)
    )
    row = cursor.fetchone()
    cursor.close()

    if not row:
        return None

    try:
        timestamp = pd.to_datetime(row[0])
        capacity = float(row[1])
        occupied = float(row[2])
        free_slots = capacity - occupied
        
        return {
            'timestamp': timestamp,
            'capacity': capacity,
            'occupied': occupied,
            'free_slots': max(0.0, min(capacity, free_slots)),
            'occupancy_rate': occupied / capacity if capacity > 0 else 0.0
        }
    except Exception as e:
        print(f"[{park_id}] Error parsing current state: {e}")
        return None


def store_predictions(predictions_connection, predictions_cursor, predictions: pd.DataFrame):
    if len(predictions) == 0:
        return
    
    values = [
        (row['park_id'], row['prediction_time'], row['target_time'], 
         row['prediction'], row['lower_bound'], row['upper_bound'], row['capacity'])
        for _, row in predictions.iterrows()
    ]
    
    predictions_cursor.executemany(
        "INSERT IGNORE INTO `predictions`.`predictions` VALUES (%s, %s, %s, %s, %s, %s, %s)",
        values
    )
    predictions_connection.commit()



def preprocess_park_data(df: pd.DataFrame, park_id: str) -> pd.DataFrame | None:    
    # Filter out closed periods
    df_open = df[df['etatouverture'] == 'OUVERT'].copy()
    closed_count = len(df) - len(df_open)
    
    if len(df_open) == 0:
        print(f"[{park_id}] Warning: No open records found")
        return None
    
    # Create time index
    df_open['lastupdate'] = pd.to_datetime(df_open['lastupdate'], errors='coerce')
    df_open = df_open.dropna(subset=['lastupdate', 'occupancy_rate', 'capacitesoliste'])
    df_open = df_open.sort_values('lastupdate')

    # Deduplicate timestamps before reindex; multiple rows can share the same update time.
    duplicate_count = int(df_open['lastupdate'].duplicated().sum())
    if duplicate_count > 0:
        df_open = (
            df_open.groupby('lastupdate', as_index=False)
            .agg({
                'occupancy_rate': 'mean',
                'capacitesoliste': 'last'
            })
            .sort_values('lastupdate')
        )
        print(f"[{park_id}] Info: merged {duplicate_count} duplicate timestamps")
    
    start_time = df_open['lastupdate'].min()
    end_time = df_open['lastupdate'].max()
    
    full_index = pd.date_range(start=start_time, end=end_time, freq=RESAMPLE_FREQUENCY)
    df_resampled = df_open.set_index('lastupdate').reindex(full_index)
    
    # Forward fill missing values (with limit)
    df_resampled['occupancy_rate'] = df_resampled['occupancy_rate'].ffill(limit=MAX_FORWARD_FILL)
    df_resampled['capacitesoliste'] = df_resampled['capacitesoliste'].ffill(limit=MAX_FORWARD_FILL)
    
    # Remove remaining NaN
    df_resampled = df_resampled.dropna(subset=['occupancy_rate'])
    
    # Drop first day
    first_day_end = start_time + pd.Timedelta(days=1)
    df_resampled = df_resampled[df_resampled.index > first_day_end]
    
    if len(df_resampled) == 0:
        print(f"[{park_id}] Warning: No data after preprocessing")
        return None
    
    print(f"[{park_id}] Preprocessed: {len(df_resampled)} samples (removed {closed_count} closed records)")
    
    return df_resampled



def train_prophet_model(df: pd.DataFrame) -> Tuple[Prophet, float]:    
    # Prepare data for Prophet (ds = datetime, y = target)
    prophet_df = pd.DataFrame({
        'ds': df.index,
        'y': df['occupancy_rate'].values
    })
    
    # Configure Prophet
    model = Prophet(
        daily_seasonality='auto',
        weekly_seasonality='auto',
        yearly_seasonality='0', # = False
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10.0,
        interval_width=0.95
    )
    
    # Train
    model.fit(prophet_df)
    
    # Calculate max occupancy
    max_occupancy = df['occupancy_rate'].max()
    
    return model, max_occupancy


def save_model(model: Prophet, park_id: str, max_occupancy: float):
    model_path = MODELS_DIR / f'prophet_{park_id}.pkl'
    metadata_path = MODELS_DIR / f'metadata_{park_id}.pkl'
    
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    
    with open(metadata_path, 'wb') as f:
        pickle.dump({'max_occupancy': max_occupancy, 'trained_at': datetime.datetime.now()}, f)
    
    print(f"[{park_id}] Model saved: {model_path.name}")


def load_model(park_id: str) -> Prophet | None:
    model_path = MODELS_DIR / f'prophet_{park_id}.pkl'
    metadata_path = MODELS_DIR / f'metadata_{park_id}.pkl'
    
    if not model_path.exists() or not metadata_path.exists():
        return None
    
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
        
    return model


def train_all_models(connection):
    print(f"\n{'='*60}")
    print("TRAINING MODELS")
    print(f"{'='*60}\n")
    
    start_time = time.time()
    trained_count = 0
    
    for park_id in PARKS:
        # try:
            # Load data
            df = load_park_data(connection, park_id, days_back=60)
            if df is None or len(df) < 100:
                print(f"[{park_id}] Skipped: insufficient data")
                continue
            
            # Preprocess
            df_processed = preprocess_park_data(df, park_id)
            if df_processed is None or len(df_processed) < 100:
                print(f"[{park_id}] Skipped: insufficient data after preprocessing")
                continue
            
            # Train
            model, max_occupancy = train_prophet_model(df_processed)
            
            # Save
            save_model(model, park_id, max_occupancy)
            trained_count += 1
            
        # except Exception as e:
        #     print(f"[{park_id}] Error during training: {e}")
    
    duration = time.time() - start_time
    print(f"\nTraining Complete: {trained_count}/{len(PARKS)} models trained in {duration:.1f}s")
    
    return trained_count > 0



def make_predictions(connection, predictions_connection, predictions_cursor):    
    prediction_time = datetime.datetime.now()
    prediction_anchor = pd.Timestamp(prediction_time).floor(f'{PREDICTION_INTERVAL_MINUTES}min')
    predictions_list = []
    
    for park_id in PARKS:
        try:
            # Get current park state
            current_state = get_current_park_state(connection, park_id)
            if current_state is None:
                continue
                
            capacity = current_state['capacity']
            current_occupancy_rate = current_state['occupancy_rate']
            
            # Get recent historical data for retraining (not using old model)
            recent_df = load_park_data(connection, park_id, days_back=7)
            if recent_df is None or len(recent_df) < 10:
                print(f"[{park_id}] Insufficient recent data for prediction")
                continue
            
            recent_processed = preprocess_park_data(recent_df, park_id)
            if recent_processed is None or len(recent_processed) < 10:
                print(f"[{park_id}] Insufficient processed data for prediction")
                continue
            
            # Build training dataframe with recent history
            context_df = pd.DataFrame({
                'ds': recent_processed.index,
                'y': recent_processed['occupancy_rate'].values
            })
            
            # Add current point to training data for continuity
            # This ensures Prophet's forecast starts from the observed current value
            last_training_time = context_df['ds'].max()
            if current_state['timestamp'] > last_training_time:
                current_point = pd.DataFrame({
                    'ds': [current_state['timestamp']],
                    'y': [current_occupancy_rate]
                })
                context_df = pd.concat([context_df, current_point], ignore_index=True)
            
            # Refit model with current data to ensure smooth continuity
            model = Prophet(
                daily_seasonality='auto',
                weekly_seasonality='auto',
                yearly_seasonality='0', # = False
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0,
                interval_width=0.95
            )
            model.fit(context_df)
            
            # Generate forecast
            future_periods = (PREDICTION_HORIZON_HOURS * 60) // PREDICTION_INTERVAL_MINUTES
            anchor_ts = max(
                prediction_anchor,
                pd.Timestamp(current_state['timestamp']),
                pd.Timestamp(context_df['ds'].max())
            )
            future_times = pd.date_range(
                start=anchor_ts + pd.Timedelta(minutes=PREDICTION_INTERVAL_MINUTES),
                periods=future_periods,
                freq=f'{PREDICTION_INTERVAL_MINUTES}min'
            )
            future = pd.DataFrame({'ds': future_times})
            forecast = model.predict(future)
            
            # Calculate offset to ensure continuity between current and first prediction
            if len(forecast) == 0:
                print(f"[{park_id}] No future forecast available")
                continue
            
            # Get the first future prediction to calculate offset
            first_future_rate = np.clip(forecast.iloc[0]['yhat'], 0, 1)
            # Offset = difference between current observed rate and first predicted rate
            rate_offset = current_occupancy_rate - first_future_rate
            
            # First, add the CURRENT point for continuity
            predictions_list.append({
                'park_id': park_id,
                'prediction_time': prediction_time,
                'target_time': current_state['timestamp'],
                'prediction': current_state['free_slots'],
                'lower_bound': current_state['free_slots'],
                'upper_bound': current_state['free_slots'],
                'capacity': capacity
            })
            
            # Then add future predictions with offset applied for continuity
            for _, row in forecast.iterrows():
                target_time = pd.to_datetime(row['ds'])
                
                # Apply offset to make predictions continuous with current observation
                rate_pred = np.clip(row['yhat'] + rate_offset, 0, 1)
                rate_lower = np.clip(row['yhat_lower'] + rate_offset, 0, 1)
                rate_upper = np.clip(row['yhat_upper'] + rate_offset, 0, 1)

                # Convert occupancy rate to free slots
                free_pred = capacity * (1 - rate_pred)
                free_lower = capacity * (1 - rate_upper)
                free_upper = capacity * (1 - rate_lower)

                # Clip to valid range [0, capacity]
                free_pred = max(0.0, min(capacity, free_pred))
                free_lower = max(0.0, min(capacity, free_lower))
                free_upper = max(0.0, min(capacity, free_upper))

                predictions_list.append({
                    'park_id': park_id,
                    'prediction_time': prediction_time,
                    'target_time': target_time,
                    'prediction': free_pred,
                    'lower_bound': free_lower,
                    'upper_bound': free_upper,
                    'capacity': capacity
                })
            
        except Exception as e:
            print(f"[{park_id}] Prediction error: {e}")
    
    if len(predictions_list) > 0:
        predictions_df = pd.DataFrame(predictions_list)
        store_predictions(predictions_connection, predictions_cursor, predictions_df)
        print(f"Stored {len(predictions_list)} predictions (including current points) for {len(predictions_df['park_id'].unique())} parks")
    else:
        print("No predictions generated")




def main():    
    print(f"\n{'='*60}")
    print("MODEL CONFIGURATION")
    print(f"{'='*60}\n")
    print(f"Prediction interval: {PREDICTION_INTERVAL_MINUTES} minutes")
    print(f"Prediction horizon: {PREDICTION_HORIZON_HOURS} hours")
    print(f"Retrain interval: {RETRAIN_INTERVAL_DAYS} days")
    print(f"Resampling frequency: {RESAMPLE_FREQUENCY}")
    print(f"Parks: {', '.join(PARKS)}\n")
    
    # Connect to open_data_rennes database
    print("Connecting to open_data_rennes database...")
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor()
    
    # Ensure predictions database exists, then connect
    print("Ensuring predictions database exists...")
    admin_conn = mysql.connector.connect(**PREDICTIONS_DB_BASE)
    admin_cursor = admin_conn.cursor()
    create_predictions_database_and_table(admin_cursor)
    admin_cursor.close()
    admin_conn.close()

    print("Connecting to predictions database...")
    predictions_connection = mysql.connector.connect(**PREDICTIONS_DB_CONFIG)
    predictions_cursor = predictions_connection.cursor()
    
    # Initial training
    last_training_time = None
    models_exist = all((MODELS_DIR / f'prophet_{p}.pkl').exists() for p in PARKS)
    
    if not models_exist:
        print("\nNo existing models found, training initial models...")
        if train_all_models(connection):
            last_training_time = datetime.datetime.now()
        else:
            print("Failed to train initial models, exiting...")
            return
    
    print(f"\n{'='*60}")
    print("STARTING PREDICTION LOOP")
    print(f"{'='*60}\n")
    
    # Main loop
    iteration = 0
    try:
        while True:
            iteration += 1
            loop_start = time.time()
            
            print(f"\n[{iteration}] {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Check if retraining is needed
            if last_training_time:
                days_since_training = (datetime.datetime.now() - last_training_time).days
                if days_since_training >= RETRAIN_INTERVAL_DAYS:
                    print(f"{days_since_training} days since last training, retraining models...")
                    if train_all_models(connection):
                        last_training_time = datetime.datetime.now()
            
            # Make predictions
            make_predictions(connection, predictions_connection, predictions_cursor)
            
            # Wait for next iteration
            elapsed = time.time() - loop_start
            wait_time = max(0, PREDICTION_INTERVAL_MINUTES * 60 - elapsed)
            
            if wait_time > 0:
                next_run = datetime.datetime.now() + datetime.timedelta(seconds=wait_time)
                print(f"Next prediction at {next_run.strftime('%H:%M:%S')} ({wait_time:.0f}s)")
                time.sleep(wait_time)
            
    except KeyboardInterrupt:
        print("\n\nReceived interrupt signal, shutting down...")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
    finally:
        cursor.close()
        connection.close()
        predictions_cursor.close()
        predictions_connection.close()
        print("Database connections closed")
        print("Service stopped\n")


if __name__ == "__main__":
    main()