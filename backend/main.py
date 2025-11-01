import os
import json
from time import sleep
from dotenv import load_dotenv
from upstash_vector import Index
from supabase import create_client, Client
import incois_scraper
import netcdf_test
import generate_erd

# -----------------------------------
# INITIAL SETUP
# -----------------------------------

load_dotenv()

# ---- Supabase Setup ----
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials missing. Please add SUPABASE_URL and SUPABASE_KEY to your .env file.")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    supabase.table("floats").select("*").limit(1).execute()
    print("✅ Connected successfully to Supabase database.")
except Exception as e:
    print(f"❌ Failed to connect to Supabase: {e}")
    exit(1)

# ---- Upstash Vector Setup ----
UPSTASH_VECTOR_REST_URL = os.getenv("UPSTASH_VECTOR_REST_URL")
UPSTASH_VECTOR_REST_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN")

if not UPSTASH_VECTOR_REST_URL or not UPSTASH_VECTOR_REST_TOKEN:
    print("❌ Upstash Vector credentials missing. Please add them to your .env file.")
    exit(1)

try:
    index = Index(url=UPSTASH_VECTOR_REST_URL, token=UPSTASH_VECTOR_REST_TOKEN)
    index.query(data="connection test", top_k=1)
    print("✅ Connected successfully to Upstash Vector database.")
except Exception as e:
    print(f"❌ Failed to connect to Upstash Vector: {e}")
    exit(1)


# -----------------------------------
# OPTION 1: Generate profile URLs
# -----------------------------------

def generate_profile_urls():
    base_url = "https://data-argo.ifremer.fr/dac/incois/"
    cache_file = "valid_profiles.json"

    print("\n🌊 Fetching valid Argo profile URLs from INCOIS...\n")

    # Try to load from cache first
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                cached_data = json.load(f)
            if (
                isinstance(cached_data, list)
                and len(cached_data) > 0
                and all("url" in entry and entry["url"].startswith(base_url) for entry in cached_data)
            ):
                print(f"✅ Loaded {len(cached_data)} cached profiles from {cache_file}")
                print("Skipping fetch from API (cache is valid).")
                return
            else:
                print("⚠️ Cache invalid or empty — fetching new data.")
        except Exception as e:
            print(f"❌ Error reading cache: {e}")

    # Fetch fresh data from INCOIS
    float_ids = incois_scraper.fetch_incois_float_ids(base_url)
    if not float_ids:
        print("❌ No floats found. Check network or INCOIS URL.")
        return

    profile_urls = incois_scraper.get_valid_prof_urls(base_url, float_ids)
    if len(profile_urls) > 0:
        with open(cache_file, "w") as f:
            json.dump(profile_urls, f, indent=2)
        print(f"💾 Saved {len(profile_urls)} valid profile directories to {cache_file}")
    else:
        print("⚠️ No valid profiles found to save.")

    print(f"\n📊 Total usable profiles: {len(profile_urls)}")
    print("Example entries:")
    for entry in profile_urls[:3]:
        print(entry)


# -----------------------------------
# OPTION 2: Test DB Connection
# -----------------------------------

def test_database():
    print("\n🔍 Testing Supabase database connection...")
    netcdf_test.test_db_connection()


# -----------------------------------
# OPTION 3: Run NetCDF → Supabase ETL
# -----------------------------------

def run_pipeline():
    print("\n🚀 Starting NetCDF ingestion pipeline...\n")

    json_path = "valid_profiles.json"
    if not os.path.exists(json_path):
        print("⚠️ valid_profiles.json not found. Please run option 1 first.")
        return

    try:
        threshold = int(
            input(
                "Enter threshold value (e.g. 5 means only the first 5 entries from valid_profiles.json): "
            )
        )
    except ValueError:
        print("⚠️ Invalid number. Please enter an integer.")
        return

    with open(json_path, "r") as f:
        floats = json.load(f)

    if threshold > 0:
        floats = floats[:threshold]

    print(f"\n🚀 Starting ingestion for {len(floats)} float(s)...")
    for entry in floats:
        try:
            netcdf_test.process_float(entry)
        except Exception as e:
            print(f"❌ Error while processing float {entry.get('id')}: {e}")

    print("\n✅ All ingestion complete.")


# -----------------------------------
# OPTION 4: Generate ER Diagram
# -----------------------------------

def create_erd():
    print("\n🧩 Generating database ER diagram...")
    try:
        generate_erd.generate_erd(output_path="db_schema.svg", auto_open=True)
        print("✅ ER diagram generation complete!")
    except Exception as e:
        print(f"❌ Failed to generate ERD: {e}")


# -----------------------------------
# OPTION 5: Purge Database
# -----------------------------------

def purge_database():
    print("\n🚨 WARNING: This will delete ALL data from Supabase and Upstash Vector DB!")
    confirm = input("Type 'CONFIRM' to proceed: ")

    if confirm.strip().upper() != "CONFIRM":
        print("❌ Operation cancelled.")
        return

    # Purge Supabase data
    try:
        print("🧹 Clearing Supabase tables...")
        for table in ["float_measurements", "float_profiles", "floats"]:
            supabase.table(table).delete().neq("float_id", "").execute()
            print(f"   → Cleared table: {table}")
        print("✅ Supabase purge complete.")
    except Exception as e:
        print(f"⚠️ Failed to purge Supabase tables: {e}")

    # Purge Upstash Vector
    try:
        print("🧹 Clearing Upstash Vector entries...")
        result = index.query(data="*", top_k=1000, include_metadata=True)
        if result and "vectors" in result:
            ids_to_delete = [v["id"] for v in result["vectors"]]
            for vid in ids_to_delete:
                index.delete(id=vid)
            print(f"✅ Deleted {len(ids_to_delete)} vectors from Upstash Vector DB.")
        else:
            print("ℹ️ No vectors found in Upstash.")
    except Exception as e:
        print(f"⚠️ Failed to purge Upstash Vector: {e}")

    print("\n✅ All data purged successfully.")


# -----------------------------------
# MENU LOOP
# -----------------------------------

def main_menu():
    while True:
        print("\n" + "=" * 60)
        print("🎨 NetCDF Argo Pipeline — Team Picasso (Supabase + Upstash Edition)")
        print("=" * 60)
        print("Recommended order: 1 → 2 → 3 → 4")
        print("Choose 5 ONLY if you know what you’re doing!\n")
        print("1) Generate profile URLs (valid_profiles.json)")
        print("2) Test Supabase Connection")
        print("3) Fetch NetCDF files, normalize, and store in Supabase + Upstash")
        print("4) Create an ER Diagram")
        print("5) Purge Database (WARNING!! DESTRUCTIVE)")
        print("6) Exit")

        choice = input("\nEnter your choice (1–6): ").strip()

        if choice == "1":
            generate_profile_urls()
        elif choice == "2":
            test_database()
        elif choice == "3":
            run_pipeline()
        elif choice == "4":
            create_erd()
        elif choice == "5":
            purge_database()
        elif choice == "6":
            print("\n👋 Exiting. Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please select a valid option (1–6).")

        print("\nReturning to main menu...")
        sleep(2)


# -----------------------------------
# ENTRY POINT
# -----------------------------------

if __name__ == "__main__":
    main_menu()
