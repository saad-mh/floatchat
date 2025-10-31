import pandas as pd
from itertools import combinations

def check_candidate_key(df: pd.DataFrame, cols: list[str]) -> bool:
    """True if cols uniquely identify rows (i.e., no duplicates)."""
    if not cols:
        return False
    return df.duplicated(subset=cols, keep=False).sum() == 0

def analyze_fd_candidates(df: pd.DataFrame, key_cols: list[str]) -> list[str]:
    """
    Detect columns functionally dependent on key_cols by checking
    nunique per group == 1 for all groups.
    Returns dependent columns list.
    """
    if not key_cols:
        print("No key columns provided.")
        return []
    if any(c not in df.columns for c in key_cols):
        print(f"Some key columns not in DataFrame: {key_cols}")
        return []

    print(f"\nAnalyzing FD candidates for key: {key_cols}")
    grouped = df.groupby(key_cols, dropna=False)
    dependent_cols = []
    for col in df.columns:
        if col in key_cols:
            continue
        nun = grouped[col].nunique(dropna=False)
        if (nun <= 1).all():
            dependent_cols.append(col)

    print(f"Possible FDs: {key_cols} -> {dependent_cols}")
    return dependent_cols

def find_minimal_candidate_keys(df: pd.DataFrame, candidate_pool: list[str], max_width: int = 3) -> list[list[str]]:
    """
    Brute-force search of minimal candidate keys from candidate_pool up to max_width.
    Returns list of minimal keys.
    """
    minimal_keys = []
    for r in range(1, min(max_width, len(candidate_pool)) + 1):
        for cols in combinations(candidate_pool, r):
            cols = list(cols)
            if check_candidate_key(df, cols):
                # minimality check: no proper subset is a key
                is_minimal = True
                for r2 in range(1, len(cols)):
                    for sub in combinations(cols, r2):
                        if check_candidate_key(df, list(sub)):
                            is_minimal = False
                            break
                    if not is_minimal:
                        break
                if is_minimal:
                    minimal_keys.append(cols)
    return minimal_keys

def summarize_nulls(df: pd.DataFrame):
    """Print null counts and percentage per column."""
    n = len(df)
    nulls = df.isna().sum().sort_values(ascending=False)
    pct = (nulls / n * 100).round(2)
    summary = pd.DataFrame({"nulls": nulls, "percent": pct})
    print("\nNull summary (top 20):")
    print(summary.head(20))
    return summary

def verify_lossless_join(meta_df: pd.DataFrame,
                         meas_df: pd.DataFrame,
                         join_keys: list[str]) -> bool:
    """
    Practical lossless-join check: if join(meta, meas) on join_keys preserves all measurement rows.
    """
    missing_keys = [k for k in join_keys if k not in meta_df.columns or k not in meas_df.columns]
    if missing_keys:
        print(f"Join keys missing in dataframes: {missing_keys}")
        return False

    left_count = len(meas_df)
    merged = meas_df.merge(meta_df[join_keys].drop_duplicates(), on=join_keys, how="left", indicator=True)
    matched = (merged["_merge"] == "both").sum()
    print(f"\nLossless-join check on keys {join_keys}: matched {matched} of {left_count} measurement rows.")
    return matched == left_count

def bcnf_hint_report(meta_df: pd.DataFrame, meas_df: pd.DataFrame):
    """
    Prints practical hints for BCNF targets based on observed FDs.
    """
    print("\n=== BCNF Hint Report ===")
    # Common candidate pools
    meta_pool = [c for c in ["float_id", "cycle_number"] if c in meta_df.columns]
    meas_pool = [c for c in ["measurement_id", "float_id", "cycle_number", "PRES"] if c in meas_df.columns]

    # Keys
    if meta_pool:
        meta_keys = find_minimal_candidate_keys(meta_df, meta_pool, max_width=2)
        print(f"Metadata minimal keys (from {meta_pool}): {meta_keys}")
    else:
        print("Metadata: no candidate pool found for key search.")
    if meas_pool:
        meas_keys = find_minimal_candidate_keys(meas_df, meas_pool, max_width=3)
        print(f"Measurements minimal keys (from {meas_pool}): {meas_keys}")
    else:
        print("Measurements: no candidate pool found for key search.")

    # FDs
    if "float_id" in meta_df.columns:
        analyze_fd_candidates(meta_df, ["float_id"])
    if all(c in meta_df.columns for c in ["float_id", "cycle_number"]):
        analyze_fd_candidates(meta_df, ["float_id", "cycle_number"])
    if "measurement_id" in meas_df.columns:
        analyze_fd_candidates(meas_df, ["measurement_id"])

    # Lossless join suggestion
    if all(c in meta_df.columns for c in ["float_id", "cycle_number"]) and \
       all(c in meas_df.columns for c in ["float_id", "cycle_number"]):
        ok = verify_lossless_join(meta_df, meas_df, ["float_id", "cycle_number"])
        print(f"Lossless join (metadata ⨝ measurements on [float_id, cycle_number]): {ok}")
    else:
        print("Lossless join check skipped (join keys not present).")
