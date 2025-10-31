import os
import json
from time import sleep

# Import modules (these should be in the same folder)
import incois_scraper
import netcdf_test
import generate_erd
import purge_db


# -----------------------------------
# OPTION 1: Generate profile URLs
# -----------------------------------
def generate_profile_urls():
    base_url = "https://data-argo.ifremer.fr/dac/incois/"
    cache_file = "valid_profiles.json"

    print("\n🌊 Fetching valid Argo profile URLs from INCOIS...\n")

    # Check if valid_profiles.json already exists and is valid
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
                profile_urls = cached_data
            else:
                print("⚠️ Cache file invalid or empty. Fetching new data...")
                raise ValueError("Invalid cache")
        except Exception as e:
            print(f"❌ Could not read cache file: {e}")
            profile_urls = None
    else:
        print("ℹ️ No cache file found. Fetching data from INCOIS...")
        profile_urls = None

    # Only fetch from INCOIS if cache is missing or invalid
    if not profile_urls:
        float_ids = incois_scraper.fetch_incois_float_ids(base_url)
        if not float_ids:
            print("❌ No floats found. Check your internet connection or base URL.")
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
    print("\n🔍 Testing PostgreSQL database connection...")
    netcdf_test.test_db_connection()


# -----------------------------------
# OPTION 3: Run NetCDF → PostgreSQL ETL
# -----------------------------------
def run_pipeline():
    print("\n🚀 Starting NetCDF ingestion pipeline...\n")

    json_path = "valid_profiles.json"
    threshold = int(input("Enter the threshhold value\n(eg: threshold = 5 means only the first 5 entries from the valid_profiles.json will be selected.)\n"))

    if not os.path.exists(json_path):
        print("⚠️ valid_profiles.json not found.")
        raise SystemExit(1)

    with open(json_path, "r") as f:
        floats = json.load(f)

    if threshold and threshold > 0:
        floats = floats[:threshold]

    print(f"\n🚀 Starting ingestion for {len(floats)} float(s)...")
    for entry in floats:
        netcdf_test.process_float(entry)

    print("\n✅ All ingestion complete.")


# -----------------------------------
# OPTION 4: Generate ER Diagram
# -----------------------------------
def create_erd():
    print("\n🧩 Generating database ER diagram...")
    generate_erd.generate_erd(output_path="db_schema.svg", auto_open=True)
    print("✅ ER diagram generation complete!")


# -----------------------------------
# OPTION 5: Purge Database
# -----------------------------------
def purge_database():
    print("\n🚨 WARNING: This will delete ALL data from both PostgreSQL and ChromaDB!")
    confirm = input("Type 'CONFIRM' to proceed: ")

    if confirm.strip().upper() == "CONFIRM":
        purge_db.purge_postgres()
        purge_db.purge_chromadb()
        print("✅ All data purged successfully.")
    else:
        print("❌ Operation cancelled.")


# -----------------------------------
# MENU LOOP
# -----------------------------------
def main_menu():
    while True:
        print("\n" + "=" * 60)
        print("🎨 Welcome to NetCDF Argo Pipeline — Made by Team Picasso")
        print("=" * 60)
        print("Recommended order: 1 → 2 → 3 → 4")
        print("Choose 5 ONLY if you know what you’re doing!\n")
        print("1) Generate profile URLs (valid_profiles.json)")
        print("2) Test DB Connection")
        print("3) Fetch NetCDF files, normalize, and store in PostgreSQL")
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
