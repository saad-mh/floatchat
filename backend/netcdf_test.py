import os
import json
import xarray as xr
import requests
import tempfile
import pandas as pd
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
from upstash_vector import Index, Vector
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client
import sys
import warnings

# -----------------------------------
# SETUP SECTION
# -----------------------------------

warnings.filterwarnings("ignore", message="Discarding nonzero nanoseconds")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials missing.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Connected to Supabase.")

UPSTASH_VECTOR_REST_URL = os.getenv("UPSTASH_VECTOR_REST_URL")
UPSTASH_VECTOR_REST_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN")

if not UPSTASH_VECTOR_REST_URL or not UPSTASH_VECTOR_REST_TOKEN:
    print("❌ Upstash Vector credentials missing.")
    sys.exit(1)

index = Index(url=UPSTASH_VECTOR_REST_URL, token=UPSTASH_VECTOR_REST_TOKEN)
print("✅ Connected to Upstash Vector database.")

embedder = SentenceTransformer("all-MiniLM-L6-v2")

# -----------------------------------
# UTILITIES
# -----------------------------------

def clean_value(val):
    """Normalize values to be JSON and database safe."""
    if isinstance(val, (float, np.floating)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (np.datetime64, pd.Timestamp)):
        try:
            if pd.isna(val):
                return None
            return float(pd.Timestamp(val).to_julian_date())
        except Exception:
            return None
    if isinstance(val, str):
        try:
            dt = datetime.fromisoformat(val)
            return float(pd.Timestamp(dt).to_julian_date())
        except Exception:
            return val.strip()
    if pd.isna(val) or val is pd.NaT or str(val) == "NaT":
        return None
    if isinstance(val, (bytes, np.bytes_)):
        try:
            return val.decode("utf-8").strip()
        except Exception:
            return str(val)
    return val


def clean_dataframe(df: pd.DataFrame):
    """Clean NaN, Inf, and invalid data across DataFrames."""
    df = df.replace([np.inf, -np.inf], np.nan, inplace=False)
    df = df.map(lambda x: clean_value(x))
    df = df.drop_duplicates()
    df = df.dropna(how="all")
    return df


def upsert_to_supabase(table_name: str, records: list):
    """Safe bulk upsert to Supabase with NaN cleaning."""
    if not records:
        return

    def sanitize(obj):
        if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
            return None
        if isinstance(obj, dict):
            return {k: sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [sanitize(v) for v in obj]
        return obj

    safe_records = [sanitize(r) for r in records]

    try:
        supabase.table(table_name).upsert(safe_records).execute()
        print(f"📦 Upserted {len(safe_records)} rows into {table_name}.")
    except Exception as e:
        print(f"❌ Failed to upsert into {table_name}: {e}")


def insert_metadata_to_upstash(float_id: str, meta_dict: dict):
    """Send metadata to Upstash vector DB for semantic search."""
    try:
        text_data = "\n".join(f"{k}: {v}" for k, v in meta_dict.items() if v and not pd.isna(v))
        if not text_data.strip():
            print(f"⚠️ No valid metadata text for {float_id}. Skipping Upstash insert.")
            return
        index.upsert(vectors=[
            Vector(id=float_id, data=text_data, metadata={"float_id": float_id})
        ])
        print(f"🧠 Metadata for {float_id} inserted into Upstash Vector DB.")
    except Exception as e:
        print(f"❌ Failed to insert metadata for {float_id} into Upstash: {e}")


def open_with_best_engine(url: str):
    """Download and safely open .nc files."""
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


def normalize_variable_data(variable_data):
    """Pad variable arrays to equal lengths."""
    max_len = max(len(v) for v in variable_data.values() if isinstance(v, (list, np.ndarray)))
    for k, v in variable_data.items():
        arr = np.array(v, dtype=object)
        if len(arr) < max_len:
            pad_width = max_len - len(arr)
            arr = np.pad(arr, (0, pad_width), constant_values=np.nan)
        variable_data[k] = arr
    return variable_data


def process_prof_file(url: str, float_id: str):
    """Extract dataframes from NetCDF: metadata, measurements, locations."""
    ds = open_with_best_engine(url)
    variable_data = {}

    for var_name, var in ds.variables.items():
        try:
            data = var.values
            if data.size > 0:
                variable_data[var_name] = [clean_value(v) for v in data.flatten()]
        except Exception:
            continue

    ds.close()

    if not variable_data:
        print("⚠️ No valid variables found.")
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

    variable_data = normalize_variable_data(variable_data)
    df = pd.DataFrame(variable_data)
    df = clean_dataframe(df)
    df.columns = df.columns.str.lower()

    metadata_cols = [
        "data_type", "format_version", "handbook_version",
        "reference_date_time", "date_creation", "date_update",
        "platform_number", "project_name", "pi_name",
        "cycle_number", "direction", "data_mode",
    ]

    measurement_cols = [
        "pres_adjusted", "temp_adjusted", "psal_adjusted",
    ]

    location_cols = [
        "juld", "latitude", "longitude",
    ]

    meta_df = df[[c for c in df.columns if c in metadata_cols]].copy()
    meas_df = df[[c for c in df.columns if c in measurement_cols]].copy()
    loc_df = df[[c for c in df.columns if c in location_cols]].copy()

    meta_df = clean_dataframe(meta_df)
    meas_df = clean_dataframe(meas_df)
    loc_df = clean_dataframe(loc_df)

    cycle_number = (
        str(df["cycle_number"].dropna().iloc[0])
        if "cycle_number" in df.columns and not df["cycle_number"].dropna().empty
        else "unknown"
    )

    meta_df["float_id"] = float_id
    meta_df["cycle_number"] = cycle_number

    # ✅ Unique measurement IDs
    meas_df.insert(0, "measurement_id", [f"{float_id}_{cycle_number}_{i}" for i in range(len(meas_df))])
    meas_df.insert(1, "float_id", float_id)
    meas_df.insert(2, "cycle_number", cycle_number)

    # ✅ Independent location IDs (safe even if counts differ)
    if not loc_df.empty:
        loc_df.insert(0, "measurement_id", [f"{float_id}_{cycle_number}_loc_{i}" for i in range(len(loc_df))])
        loc_df["float_id"] = float_id
        loc_df["cycle_number"] = cycle_number
        loc_df = loc_df.dropna(subset=["juld", "latitude", "longitude"], how="all")

    return meta_df, meas_df, loc_df


def process_float(entry):
    """Handle full float ingestion: metadata, profiles, locations."""
    float_id = entry["id"]
    base_url = entry["url"]
    print(f"\n🌊 Processing Float {float_id}")

    prof_url = f"{base_url}{float_id}_prof.nc"
    meta_exists = entry.get("doMetaExist", False)

    # ✅ STEP 1: Ensure float entry exists
    upsert_to_supabase("floats", [{"float_id": float_id, "meta": {}}])

    try:
        # ✅ STEP 2: Process profile and insert dependent tables
        meta_df, meas_df, loc_df = process_prof_file(prof_url, float_id)

        meta_df = meta_df.drop_duplicates(subset=["float_id", "cycle_number"])
        meas_df = meas_df.drop_duplicates(subset=["measurement_id"])
        loc_df = loc_df.drop_duplicates(subset=["measurement_id"])

        upsert_to_supabase("float_profiles", meta_df.to_dict(orient="records"))
        upsert_to_supabase("float_measurements", meas_df.to_dict(orient="records"))
        upsert_to_supabase("float_locations", loc_df.to_dict(orient="records"))
    except Exception as e:
        print(f"❌ Error while processing {float_id}: {e}")
        return

    # ✅ STEP 3: Update floats meta (if available)
    if meta_exists:
        meta_url = f"{base_url}{float_id}_meta.nc"
        try:
            ds = open_with_best_engine(meta_url)
            meta_attrs = {k: clean_value(v) for k, v in ds.attrs.items()}
            ds.close()

            record = {"float_id": float_id, "meta": meta_attrs}
            upsert_to_supabase("floats", [record])
            insert_metadata_to_upstash(float_id, meta_attrs)
        except Exception as e:
            print(f"❌ Failed to process meta.nc for {float_id}: {e}")


# -----------------------------------
# ENTRY POINT
# -----------------------------------

if __name__ == "__main__":
    json_path = "valid_profiles.json"
    threshold = int(input("Enter threshold (e.g. 5 means first 5 floats): "))

    if not os.path.exists(json_path):
        print("⚠️ valid_profiles.json not found.")
        sys.exit(1)

    with open(json_path, "r") as f:
        floats = json.load(f)

    if threshold > 0:
        floats = floats[:threshold]

    print(f"\n🚀 Starting ingestion for {len(floats)} float(s)...")
    for entry in floats:
        process_float(entry)

    print("\n✅ All ingestion complete.")
