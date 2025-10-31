import os
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv
import chromadb

# -----------------------------------
# SETUP
# -----------------------------------

load_dotenv()

# PostgreSQL connection
engine = create_engine(
    f"postgresql+psycopg2://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
)

# ChromaDB setup
chroma_client = chromadb.PersistentClient(path="./chroma_store")

# -----------------------------------
# PURGE FUNCTIONS
# -----------------------------------

def purge_postgres():
    """Drop all non-system tables from PostgreSQL."""
    print("🧹 Purging PostgreSQL database...")
    inspector = inspect(engine)

    with engine.begin() as conn:
        # Fetch all user tables (avoid system schemas)
        tables = inspector.get_table_names(schema="public")
        if not tables:
            print("⚠️ No user tables found in PostgreSQL.")
            return

        # Disable FK checks for clean deletion
        conn.execute(text("SET session_replication_role = 'replica';"))

        # Drop all tables
        for table in tables:
            try:
                conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
                print(f"✅ Dropped table: {table}")
            except Exception as e:
                print(f"❌ Failed to drop table {table}: {e}")

        # Re-enable FK constraints
        conn.execute(text("SET session_replication_role = 'origin';"))

    print("🎯 PostgreSQL purge complete.\n")


def purge_chromadb():
    """Delete all collections and embeddings in ChromaDB."""
    print("🧠 Purging ChromaDB collections...")
    try:
        collections = chroma_client.list_collections()
        if not collections:
            print("⚠️ No ChromaDB collections found.")
            return

        for coll in collections:
            try:
                chroma_client.delete_collection(name=coll.name)
                print(f"✅ Deleted ChromaDB collection: {coll.name}")
            except Exception as e:
                print(f"❌ Failed to delete ChromaDB collection {coll.name}: {e}")

        print("🎯 ChromaDB purge complete.\n")
    except Exception as e:
        print(f"❌ Error accessing ChromaDB: {e}")


# -----------------------------------
# MAIN
# -----------------------------------

if __name__ == "__main__":
    print("🚨 WARNING: This operation will delete ALL data from both PostgreSQL and ChromaDB!")
    print("Note: If you are not a superuser, then you will get an error!")
    confirm = input("Type 'CONFIRM' to proceed: ")

    if confirm.strip().upper() == "CONFIRM":
        purge_postgres()
        purge_chromadb()
        print("✅ All data purged successfully.")
    else:
        print("❌ Operation cancelled. No data was deleted.")
