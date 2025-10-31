import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

def fetch_incois_float_ids(base_url: str):
    try:
        response = requests.get(base_url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        float_ids = [a.text.strip("/") for a in soup.find_all("a") if a.text.strip("/").isdigit()]
        print(f"Found {len(float_ids)} floats under INCOIS")
        return float_ids
    except requests.exceptions.RequestException as e:
        print(f"Error fetching float IDs: {e}")
        return []

def check_file_exists(url: str):
    try:
        r = requests.head(url, timeout=10)
        return r.status_code == 200
    except requests.exceptions.RequestException:
        return False

def get_valid_prof_urls(base_url: str, float_ids: list):
    valid_profiles = []

    for fid in tqdm(float_ids, desc="Checking profiles"):
        base_float_url = f"{base_url}{fid}/"
        prof_url = f"{base_float_url}{fid}_prof.nc"

        if check_file_exists(prof_url):
            profile_entry = {
                "id": fid,
                "url": base_float_url,
                "doMetaExist": check_file_exists(f"{base_float_url}{fid}_meta.nc"),
                "doRTrajExist": check_file_exists(f"{base_float_url}{fid}_Rtraj.nc"),
                "doDTrajExist": check_file_exists(f"{base_float_url}{fid}_Dtraj.nc"),
                "doTechExist": check_file_exists(f"{base_float_url}{fid}_tech.nc")
            }
            valid_profiles.append(profile_entry)

    print(f"Found {len(valid_profiles)} valid profile directories under INCOIS")
    return valid_profiles
