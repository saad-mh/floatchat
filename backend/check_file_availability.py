import json
import pandas as pd

def summarize_file_availability(json_path="valid_profiles.json"):
    """Summarize counts of .nc file availability from the valid_profiles.json file."""
    with open(json_path, "r") as f:
        data = json.load(f)

    df = pd.DataFrame(data)

    # Ensure missing columns (if any) are filled with False
    for col in ["doMetaExist", "doRTrajExist", "doDTrajExist", "doTechExist"]:
        if col not in df.columns:
            df[col] = False

    print("\n=== Summary of File Availability ===")
    print(f"Total floats: {len(df)}")
    print(df[["doMetaExist", "doRTrajExist", "doDTrajExist", "doTechExist"]].sum())

    print("\n=== Percentage Availability ===")
    percent = (df[["doMetaExist", "doRTrajExist", "doDTrajExist", "doTechExist"]].sum() / len(df)) * 100
    print(percent.round(2).astype(str) + "%")

    print("\n=== Missing Entries Breakdown ===")
    missing_counts = (~df[["doMetaExist", "doRTrajExist", "doDTrajExist", "doTechExist"]]).sum()
    print(missing_counts)

    print("\n=== Entries Missing Files ===")
    missing_entries = df[
        (~df["doMetaExist"]) | (~df["doRTrajExist"]) | (~df["doDTrajExist"]) | (~df["doTechExist"])
    ]
    print(f"Total missing entries: {len(missing_entries)}")
    print(missing_entries.head(10))  # show first 10 missing entries

if __name__ == "__main__":
    summarize_file_availability("valid_profiles.json")
