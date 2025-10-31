import os
import json
from incois_scraper import fetch_incois_float_ids, get_valid_prof_urls

def main():
    base_url = "https://data-argo.ifremer.fr/dac/incois/"
    cache_file = "valid_profiles.json"

    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                cached_data = json.load(f)

            if (
                isinstance(cached_data, list)
                and len(cached_data) > 0
                and all("url" in entry and entry["url"].startswith(base_url) for entry in cached_data)
            ):
                print(f"Loaded {len(cached_data)} cached profiles from {cache_file}")
                profile_urls = cached_data
            else:
                print("Cache file invalid or empty, refetching...")
                raise ValueError("Invalid cache")
        except Exception as e:
            print(f"Could not read cache file: {e}")
            profile_urls = None
    else:
        print("No cache file found. Fetching valid profile directories...")
        profile_urls = None

    if not profile_urls:
        float_ids = fetch_incois_float_ids(base_url)
        if not float_ids:
            print("No floats found. Check your internet connection or URL.")
            return

        profile_urls = get_valid_prof_urls(base_url, float_ids)

        if len(profile_urls) > 0:
            with open(cache_file, "w") as f:
                json.dump(profile_urls, f, indent=2)
            print(f"Saved {len(profile_urls)} valid profile directories to {cache_file}")
        else:
            print("No valid profiles found to save.")

    print(f"\nTotal usable profiles: {len(profile_urls)}")
    print("Example entries:")
    for entry in profile_urls[:3]:
        print(entry)

if __name__ == "__main__":
    main()
