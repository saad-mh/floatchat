import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

def fetch_incois_float_ids(base_url:str): #We found 587 floats under incois
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

def get_valid_prof_urls(base_url:str, float_ids:list): #Out of 587, only 569 were valid
    valid_profiles=[]
    for fid in tqdm(float_ids,desc="Checking profiles"):
        prof_url = f"{base_url}{fid}/{fid}_prof.nc"
        try:
            r = requests.head(prof_url, timeout=10)
            if r.status_code == 200:
                valid_profiles.append(prof_url)
        except requests.exceptions.RequestException:
            continue
    print(f"Found {len(valid_profiles)} valid profile files.")
    return valid_profiles
