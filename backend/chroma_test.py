import chromadb
from sentence_transformers import SentenceTransformer

# Connect to ChromaDB (same path as before)
chroma_client = chromadb.PersistentClient(path="./chroma_store")
collection = chroma_client.get_or_create_collection(name="float_metadata")

# Load the same embedding model used in ingestion
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# Create a semantic query
query = "floats deployed in the Arabian Sea measuring temperature and salinity in 2025"

# Convert query to embedding
query_embedding = embedder.encode(query).tolist()

# Search top 3 most similar entries
results = collection.query(query_embeddings=[query_embedding])

# Show the results
for i, doc in enumerate(results["documents"][0]):
    meta = results["metadatas"][0][i]
    print(f"Result {i+1}:")
    print(f"Float ID: {meta.get('float_id', 'N/A')}")
    print(f"Snippet: {doc[:300]}...\n")
