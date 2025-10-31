import os
import webbrowser
from sqlalchemy import create_engine, inspect, MetaData
from sqlalchemy_schemadisplay import create_schema_graph
from dotenv import load_dotenv
import inspect as pyinspect

# -----------------------------------
# SETUP
# -----------------------------------

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# -----------------------------------
# GENERATE ERD
# -----------------------------------

def generate_erd(output_path="db_schema.svg", auto_open=True):
    print("🧩 Connecting to PostgreSQL...")
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if not tables:
        print("⚠️ No tables found in the database.")
        return

    print(f"✅ Found tables: {', '.join(tables)}")
    print("📊 Generating schema graph...")

    # Reflect metadata (always safe)
    metadata = MetaData()
    metadata.reflect(bind=engine)

    # Detect if 'engine' argument exists in the current version
    sig = pyinspect.signature(create_schema_graph)
    if "engine" in sig.parameters:
        print("🔧 Detected hybrid version — using both engine and metadata.")
        graph = create_schema_graph(
            engine=engine,
            metadata=metadata,
            show_datatypes=True,
            show_indexes=False,
            rankdir='LR',
            concentrate=False
        )
    else:
        print("🔧 Using metadata-only mode.")
        graph = create_schema_graph(
            metadata=metadata,
            show_datatypes=True,
            show_indexes=False,
            rankdir='LR',
            concentrate=False
        )

    # 🎨 Apply table color categories
    for node in graph.get_nodes():
        label = node.get_name().strip('"')
        if label.startswith("float"):
            node.set_fillcolor("#B3E5FC")  # light blue
            node.set_style("filled")
        elif label in ("users", "sessions", "otp_verifications", "password_reset_tokens", "login_audits"):
            node.set_fillcolor("#C8E6C9")  # light green
            node.set_style("filled")
        elif label in ("email_notifications",):
            node.set_fillcolor("#FFF9C4")  # light yellow
            node.set_style("filled")
        else:
            node.set_fillcolor("#E1BEE7")  # violet
            node.set_style("filled")

    graph.write_svg(output_path)
    print(f"✅ ERD saved to: {output_path}")

    if auto_open:
        abs_path = os.path.abspath(output_path)
        webbrowser.open(f"file://{abs_path}")
        print("🌐 Opened ERD in your default browser.")


if __name__ == "__main__":
    generate_erd()
