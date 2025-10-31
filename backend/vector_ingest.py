import os
import glob
import pandas as pd
from tqdm import tqdm
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Initialize Chroma client
chroma_client = chromadb.Client(Settings(
    persist_directory="./chroma_store"
))

# Create or get collection
collection = chroma_client.get_or_create_collection(
    name="argo_metadata",
    metadata={"description": "Normalized Argo float metadata documents"}
)

# Load embedding model (local)
model = SentenceTransformer("all-MiniLM-L6-v2")


def flatten_value(v):
    """Convert NaN and arrays to readable strings."""
    if isinstance(v, (list, tuple)):
        return ", ".join(map(str, v))
    if pd.isna(v):
        return ""
    return str(v)


def metadata_row_to_text(row: pd.Series) -> str:
    """Convert one metadata row to readable natural-language text."""
    parts = []
    for k, v in row.items():
        if k.lower() not in ["float_id", "cycle_number"]:
            parts.append(f"{k.replace('_', ' ').title()}: {flatten_value(v)}")
    return ". ".join(parts)


def ingest_metadata_csv(csv_path: str):
    """Convert a metadata CSV to text and push to Chroma."""
    df = pd.read_csv(csv_path)
    if "float_id" not in df.columns:
        print(f"Skipping {csv_path} — missing float_id column.")
        return

    docs, metadatas, ids = [], [], []
    for i, row in df.iterrows():
        float_id = row.get("float_id", "unknown")
        cycle_number = row.get("cycle_number", "unknown")

        text = metadata_row_to_text(row)
        doc_id = f"{float_id}_{cycle_number}_{i}"

        docs.append(text)
        metadatas.append({
            "float_id": float_id,
            "cycle_number": cycle_number,
            "source": os.path.basename(csv_path)
        })
        ids.append(doc_id)

    if not docs:
        print(f"No documents found in {csv_path}")
        return

    embeddings = model.encode(docs, show_progress_bar=True)
    collection.add(
        documents=docs,
        embeddings=embeddings.tolist(),
        metadatas=metadatas,
        ids=ids
    )

    print(f"✅ Ingested {len(docs)} metadata entries from {csv_path}")


def bulk_ingest_metadata(folder="./"):
    """Scan folder for *_prof_metadata.csv files and ingest them."""
    csv_files = glob.glob(os.path.join(folder, "*_prof_metadata.csv"))
    if not csv_files:
        print("No metadata CSVs found.")
        return

    for path in tqdm(csv_files, desc="Ingesting metadata files"):
        ingest_metadata_csv(path)


if __name__ == "__main__":
    bulk_ingest_metadata()
    print("✅ All metadata ingested into Chroma successfully.")
