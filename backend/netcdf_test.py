import os
import json
import xarray as xr
import requests
import tempfile
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv
import chromadb
from sentence_transformers import SentenceTransformer
import sys
from datetime import datetime

# -----------------------------------
# SETUP SECTION
# -----------------------------------

load_dotenv()

# PostgreSQL connection
engine = create_engine(
    f"postgresql+psycopg2://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

# ChromaDB setup
chroma_client = chromadb.PersistentClient(path="./chroma_store")
chroma_collection = chroma_client.get_or_create_collection(name="float_metadata")

# Embedding model
embedder = SentenceTransformer("all-MiniLM-L6-v2")


# -----------------------------------
# DATABASE TEST
# -----------------------------------

def test_db_connection():
    """Check if PostgreSQL connection is alive before anything else."""
    print("🔍 Testing PostgreSQL connection...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1;"))
            if result.scalar() == 1:
                print("✅ Database connection successful.")
            else:
                print("⚠️ Unexpected database response.")
                sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        sys.exit(1)


test_db_connection()


# -----------------------------------
# UTILITIES
# -----------------------------------

def clean_bytes(val):
    """Convert bytes to string safely."""
    if isinstance(val, (bytes, np.bytes_)):
        try:
            return val.decode("utf-8").strip()
        except Exception:
            return str(val)
    return val


def normalize_value(val):
    """Universal cleaner for NaN, NaT, and datetime issues."""
    if pd.isna(val) or val is pd.NaT or str(val) == "NaT":
        return None
    if isinstance(val, np.generic):
        val = val.item()
    if isinstance(val, (np.datetime64, pd.Timestamp)):
        try:
            if pd.isna(val):
                return None
            return pd.Timestamp(val).to_pydatetime()
        except Exception:
            return None
    return val


def clean_dataframe(df: pd.DataFrame):
    """Remove duplicates, all-NaN rows, and normalize values."""
    df = df.drop_duplicates()
    df = df.dropna(how="all")
    df = df.map(lambda x: normalize_value(x))
    return df


def ensure_table_exists(df: pd.DataFrame, table_name: str, primary_keys=None):
    """Ensure table exists; create it if missing."""
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        print(f"🧱 Creating new table: {table_name}")
        df.head(0).to_sql(table_name, engine, if_exists="replace", index=False)
        if primary_keys:
            with engine.begin() as conn:
                pk_cols = ", ".join(f'"{pk}"' for pk in primary_keys)
                conn.execute(text(f'ALTER TABLE "{table_name}" ADD PRIMARY KEY ({pk_cols});'))
    else:
        existing_cols = [col["name"] for col in inspector.get_columns(table_name)]
        missing_cols = [col for col in df.columns if col not in existing_cols]
        if missing_cols:
            print(f"⚠️ Adding missing columns to {table_name}: {missing_cols}")
            with engine.begin() as conn:
                for col in missing_cols:
                    conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{col}" TEXT;'))


def ensure_minimal_table(table_name: str, schema: dict, primary_keys=None):
    """Create a minimal table with given schema if it doesn't exist."""
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        cols = ", ".join(f'"{col}" {dtype}' for col, dtype in schema.items())
        pk = f", PRIMARY KEY ({', '.join(primary_keys)})" if primary_keys else ""
        create_sql = text(f'CREATE TABLE "{table_name}" ({cols}{pk});')
        with engine.begin() as conn:
            conn.execute(create_sql)
        print(f"🧱 Created minimal table '{table_name}' with schema: {list(schema.keys())}")


def upsert_dataframe(df: pd.DataFrame, table_name: str, conflict_cols: list):
    if df.empty:
        return

    ensure_table_exists(df, table_name, primary_keys=conflict_cols)

    cols = list(df.columns)
    columns_sql = ", ".join([f'"{c}"' for c in cols])
    values_sql = ", ".join([f":{c}" for c in cols])
    update_sql = ", ".join([f'"{c}" = EXCLUDED."{c}"' for c in cols if c not in conflict_cols])

    sql = text(f"""
        INSERT INTO "{table_name}" ({columns_sql})
        VALUES ({values_sql})
        ON CONFLICT ({', '.join(conflict_cols)}) DO UPDATE
        SET {update_sql};
    """)

    records = df.to_dict(orient="records")
    with engine.begin() as conn:
        for record in records:
            record = {k: normalize_value(v) for k, v in record.items()}
            conn.execute(sql, record)

    print(f"📦 Upserted {len(df)} rows into {table_name}")


# -----------------------------------
# FLOAT HANDLERS
# -----------------------------------

def ensure_float_exists(float_id: str):
    """Ensure 'floats' table and record exist before inserting."""
    ensure_minimal_table(
        "floats",
        {"float_id": "TEXT"},
        primary_keys=["float_id"]
    )
    with engine.begin() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM floats WHERE float_id = :fid'), {'fid': float_id})
        if result.scalar() == 0:
            conn.execute(text('INSERT INTO floats (float_id) VALUES (:fid)'), {'fid': float_id})
            print(f"🪣 Created parent float record for {float_id}")


# -----------------------------------
# MAIN ETL
# -----------------------------------

def open_with_best_engine(url: str):
    try:
        with tempfile.NamedTemporaryFile(suffix=".nc") as tmp:
            print(f"⬇️  Downloading file -> {url}")
            r = requests.get(url, stream=True)
            r.raise_for_status()
            tmp.write(r.content)
            tmp.flush()
            ds = xr.open_dataset(tmp.name, engine="netcdf4")
            print("✅ Opened successfully from temporary download.")
            return ds
    except Exception as e:
        print(f"❌ Failed to open dataset from {url}: {e}")
        raise


def process_prof_file(url: str, float_id: str):
    ds = open_with_best_engine(url)
    variable_data = {}

    for var_name, var in ds.variables.items():
        try:
            data = var.values
            if data.size > 0:
                variable_data[var_name] = [clean_bytes(v) for v in data.flatten()]
        except Exception:
            continue

    ds.close()

    if not variable_data:
        print("⚠️ No valid variables found.")
        return pd.DataFrame(), pd.DataFrame()

    max_len = max(len(v) for v in variable_data.values())
    for k, v in variable_data.items():
        arr = np.array(v, dtype=object)
        if len(arr) < max_len:
            arr = np.pad(arr, (0, max_len - len(arr)), constant_values=np.nan)
        variable_data[k] = arr

    df = pd.DataFrame(variable_data)
    df = clean_dataframe(df)

    metadata_cols = [
        "DATA_TYPE", "FORMAT_VERSION", "HANDBOOK_VERSION",
        "REFERENCE_DATE_TIME", "DATE_CREATION", "DATE_UPDATE",
        "PLATFORM_NUMBER", "PROJECT_NAME", "PI_NAME", "STATION_PARAMETERS",
        "CYCLE_NUMBER", "DIRECTION", "DATA_CENTRE", "DC_REFERENCE",
        "DATA_STATE_INDICATOR", "DATA_MODE", "PLATFORM_TYPE", "FLOAT_SERIAL_NO",
        "FIRMWARE_VERSION", "WMO_INST_TYPE", "POSITIONING_SYSTEM",
        "VERTICAL_SAMPLING_SCHEME", "CONFIG_MISSION_NUMBER",
        "PARAMETER", "SCIENTIFIC_CALIB_EQUATION", "SCIENTIFIC_CALIB_COEFFICIENT",
        "SCIENTIFIC_CALIB_COMMENT", "SCIENTIFIC_CALIB_DATE"
    ]

    measurement_cols = [
        "JULD", "JULD_QC", "JULD_LOCATION", "LATITUDE", "LONGITUDE", "POSITION_QC",
        "PROFILE_PRES_QC", "PROFILE_TEMP_QC", "PROFILE_PSAL_QC",
        "PRES_QC", "PRES_ADJUSTED", "PRES_ADJUSTED_QC", "PRES_ADJUSTED_ERROR",
        "TEMP_QC", "TEMP_ADJUSTED", "TEMP_ADJUSTED_QC", "TEMP_ADJUSTED_ERROR",
        "PSAL_QC", "PSAL_ADJUSTED", "PSAL_ADJUSTED_QC", "PSAL_ADJUSTED_ERROR"
    ]

    meta_df = clean_dataframe(df[[c for c in df.columns if c in metadata_cols]])
    meas_df = clean_dataframe(df[[c for c in df.columns if c in measurement_cols]])

    cycle_number = str(df["CYCLE_NUMBER"].dropna().iloc[0]) if "CYCLE_NUMBER" in df.columns and not df["CYCLE_NUMBER"].dropna().empty else "unknown"
    meta_df["float_id"] = float_id
    meta_df["cycle_number"] = cycle_number
    meas_df.insert(0, "measurement_id", [f"{float_id}_{cycle_number}_{i}" for i in range(len(meas_df))])
    meas_df.insert(1, "float_id", float_id)
    meas_df.insert(2, "cycle_number", cycle_number)

    return meta_df, meas_df


def process_float(entry):
    float_id = entry["id"]
    base_url = entry["url"]
    print(f"\n🌊 Processing Float {float_id}")

    ensure_float_exists(float_id)

    prof_url = f"{base_url}{float_id}_prof.nc"
    meta_exists = entry.get("doMetaExist", False)

    meta_df, meas_df = process_prof_file(prof_url, float_id)

    upsert_dataframe(meta_df, "float_profiles", conflict_cols=["float_id", "cycle_number"])
    upsert_dataframe(meas_df, "float_measurements", conflict_cols=["measurement_id"])

    if meta_exists:
        meta_url = f"{base_url}{float_id}_meta.nc"
        try:
            ds = open_with_best_engine(meta_url)
            meta_attrs = {k: clean_bytes(v) for k, v in ds.attrs.items()}
            ds.close()
            meta_df = pd.DataFrame([meta_attrs]).assign(float_id=float_id)
            upsert_dataframe(meta_df, "floats", conflict_cols=["float_id"])
        except Exception as e:
            print(f"❌ Failed to process meta.nc for {float_id}: {e}")


# -----------------------------------
# ENTRY POINT
# -----------------------------------

if __name__ == "__main__":
    json_path = "valid_profiles.json"
    threshold = int(input("Enter the threshhold value (eg: threshold = 5 means only the first 5 entries from the valid_profiles.json will be selected.)"))

    if not os.path.exists(json_path):
        print("⚠️ valid_profiles.json not found.")
        raise SystemExit(1)

    with open(json_path, "r") as f:
        floats = json.load(f)

    if threshold and threshold > 0:
        floats = floats[:threshold]

    print(f"\n🚀 Starting ingestion for {len(floats)} float(s)...")
    for entry in floats:
        process_float(entry)

    print("\n✅ All ingestion complete.")
