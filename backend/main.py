from incois_scraper import fetch_incois_float_ids,get_valid_prof_urls

def main():
    base_url="https://data-argo.ifremer.fr/dac/incois/"
    float_ids=fetch_incois_float_ids(base_url)
    if not float_ids:
        print("No floats found. Check your internet connection or URL.")
        return

    print(f"First 10 floats: {float_ids[:10]}")
    first_float = float_ids[0]
    prof_url = f"https://data-argo.ifremer.fr/dac/incois/{first_float}/{first_float}_prof.nc"
    print(f"Example profile URL: {prof_url}")
    profile_urls=get_valid_prof_urls(base_url,float_ids)
    print("Example URLs:")
    print(profile_urls)


if __name__ == "__main__":
    main()