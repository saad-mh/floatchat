# FloatChat: AI-Powered Conversational Interface for Argo Ocean Data

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![Mistral](https://img.shields.io/badge/LLM-Mistral%207B-orange.svg)](https://mistral.ai/)

> **Transform complex oceanographic data into conversational insights**

---

## 🎯 Overview

**FloatChat** is an AI-driven conversational platform that makes global **Argo float ocean data** accessible to everyone—from scientists and policymakers to students and enthusiasts. It bridges the gap between complex NetCDF datasets and intuitive natural language queries.

### ✨ Key Features

- 🤖 **Natural Language Queries** - Ask questions in plain English
- 🗄️ **Real-time Data** - Live data from Supabase PostgreSQL (79,934 location records, 451 floats)
- 📊 **Auto Visualizations** - Maps, charts, and tables generated automatically
- 🌍 **Interactive Maps** - 2D (Leaflet) and 3D (Globe.gl) visualizations
- 📈 **Depth Profiles** - Temperature and salinity vs depth charts
- 🔍 **SQL Transparency** - View generated SQL queries
- ⚡ **Fast API** - FastAPI backend with async support
- 🌐 **Geographic Intelligence** - Understands locations like "equator", "Arabian Sea", "India"
- 📅 **Temporal Awareness** - Parses dates like "March 2023", "2020"
- 🎨 **Complete Data Access** - No artificial limits, all matching data returned

---

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- HuggingFace API token ([Get one here](https://huggingface.co/settings/tokens))
- Supabase account
- Upstash Vector account

### One-Command Setup

```bash
# Clone and start
git clone https://github.com/your-org/floatchat.git
cd floatchat
./start_floatchat.sh
```

Then open http://localhost:3000 and try:
- *"Show me salinity profiles near the equator"*
- *"Find floats in the Arabian Sea"*
- *"Show temperature data in 2020"*

### Manual Setup

<details>
<summary>Click to expand detailed setup instructions</summary>

#### 1. System Dependencies (Recommended)

Some libraries need native dependencies for NetCDF processing.

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3-dev \
     libhdf5-dev libnetcdf-dev graphviz
```

**macOS (Homebrew):**
```bash
brew install hdf5 netcdf graphviz
```

#### 2. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

**Backend requirements.txt includes:**
```txt
# Web Framework
fastapi
uvicorn
python-multipart

# Database
supabase
psycopg2-binary
sqlalchemy
sqlalchemy_schemadisplay

# Data Processing
xarray
netCDF4
h5netcdf
pydap
fsspec
numpy
pandas
matplotlib

# Web Scraping
requests
beautifulsoup4
tqdm

# AI/ML
langchain
langchain-community
sentence-transformers
chromadb
upstash-vector

# Utilities
python-dotenv
loguru
jinja2
aiohttp
pydot
graphviz
```

Create `backend/.env`:
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Upstash Vector
UPSTASH_VECTOR_REST_URL=https://your-upstash-url
UPSTASH_VECTOR_REST_TOKEN=your-upstash-token

# HuggingFace
HUGGINGFACE_API_TOKEN=your_hf_token
```

#### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 4. Database Setup

Run this SQL in Supabase SQL Editor:

```sql
-- ===============================
-- 🚨 Clean reset (drops old tables)
-- ===============================
DROP TABLE IF EXISTS float_locations;
DROP TABLE IF EXISTS float_measurements;
DROP TABLE IF EXISTS float_profiles;
DROP TABLE IF EXISTS floats;

-- ===============================
-- 🧭 Table 1: floats
-- ===============================
CREATE TABLE floats (
  float_id TEXT PRIMARY KEY,
  meta JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- ===============================
-- 📋 Table 2: float_profiles
-- ===============================
CREATE TABLE float_profiles (
  float_id TEXT NOT NULL,
  cycle_number TEXT NOT NULL,
  data_mode TEXT,
  date_creation TEXT,
  date_update TEXT,
  data_type TEXT,
  format_version TEXT,
  handbook_version TEXT,
  reference_date_time TEXT,
  platform_number TEXT,
  project_name TEXT,
  pi_name TEXT,
  direction TEXT,
  PRIMARY KEY (float_id, cycle_number),
  FOREIGN KEY (float_id) REFERENCES floats (float_id) ON DELETE CASCADE
);

-- ===============================
-- 🌊 Table 3: float_measurements
-- ===============================
CREATE TABLE float_measurements (
  measurement_id TEXT PRIMARY KEY,
  float_id TEXT NOT NULL,
  cycle_number TEXT,
  pres_adjusted DOUBLE PRECISION,
  temp_adjusted DOUBLE PRECISION,
  psal_adjusted DOUBLE PRECISION,
  FOREIGN KEY (float_id) REFERENCES floats (float_id) ON DELETE CASCADE
);

-- ===============================
-- 📍 Table 4: float_locations
-- ===============================
CREATE TABLE float_locations (
  measurement_id TEXT PRIMARY KEY,
  float_id TEXT NOT NULL,
  cycle_number TEXT,
  juld DOUBLE PRECISION,  -- Astronomical Julian Date
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  FOREIGN KEY (float_id) REFERENCES floats (float_id) ON DELETE CASCADE
);

-- ===============================
-- ⚡ Indexes for performance
-- ===============================
CREATE INDEX idx_float_profiles_float_id ON float_profiles (float_id);
CREATE INDEX idx_float_measurements_float_id ON float_measurements (float_id);
CREATE INDEX idx_float_measurements_cycle_number ON float_measurements (cycle_number);
CREATE INDEX idx_float_locations_float_id ON float_locations (float_id);
CREATE INDEX idx_float_locations_cycle_number ON float_locations (cycle_number);
CREATE INDEX idx_float_locations_lat_lon ON float_locations (latitude, longitude);
CREATE INDEX idx_float_locations_juld ON float_locations (juld);

-- ===============================
-- ✅ Verification message
-- ===============================
SELECT '✅ All tables recreated successfully with normalized schema.' AS status;
```

#### 5. Data Ingestion (Menu-Driven Pipeline)

The backend includes a menu-driven pipeline for NetCDF data ingestion:

```bash
cd backend
python main.py
```

You'll see an interactive menu:
```
============================================================
NetCDF Argo Pipeline — Team Picasso (Supabase + Upstash)
============================================================
Recommended order: 1 → 2 → 3 → 4

1) Generate profile URLs (valid_profiles.json)
2) Test Supabase Connection
3) Fetch NetCDF files, normalize, and store in Supabase + Upstash
4) Create an ER Diagram
5) Purge Database (WARNING!! DESTRUCTIVE)
6) Exit
```

**Typical workflow:**
1. **Option 1** → Generate `valid_profiles.json` from INCOIS Argo data
2. **Option 2** → Test database connection
3. **Option 3** → Fetch and ingest NetCDF profiles into Supabase + Upstash
4. **Option 4** → Generate ER diagram (requires Graphviz)

**What gets ingested:**
- Float metadata → `floats` table
- Profile information → `float_profiles` table
- Measurements (pressure, temp, salinity) → `float_measurements` table
- Location data (lat, lon, date) → `float_locations` table
- Metadata vectors → Upstash Vector for RAG

#### 6. Start Services

```bash
# Terminal 1: Backend API
cd backend
source .venv/bin/activate
python api_server.py

# Terminal 2: Frontend
cd frontend
npm run dev
```

Open http://localhost:3000

</details>

---

## � Data Paipeline & Ingestion

### NetCDF Processing Pipeline

The backend includes a complete pipeline for fetching and processing Argo float data from INCOIS:

**Pipeline Components:**
- `incois_scraper.py` - Scrapes Argo profile URLs from INCOIS data repository
- `main.py` - Menu-driven ingestion system
- `netcdf_test.py` - NetCDF file validation and testing

**Data Flow:**
1. **Scrape** → Fetch profile URLs from https://data-argo.ifremer.fr/dac/incois/
2. **Download** → Retrieve NetCDF files for each float/cycle
3. **Parse** → Extract measurements, locations, and metadata using xarray
4. **Normalize** → Handle NaN/Inf values, convert Julian dates
5. **Store** → Insert into Supabase (4 normalized tables)
6. **Index** → Create vector embeddings in Upstash for RAG

**Normalized Schema:**
- `floats` - One row per float (metadata as JSONB)
- `float_profiles` - One row per cycle (profile metadata)
- `float_measurements` - One row per depth measurement (pressure, temp, salinity)
- `float_locations` - One row per cycle (lat, lon, date)

**Key Features:**
- Handles sparse data gracefully (NaN → NULL)
- Julian date storage for temporal queries
- Separate location table to avoid sparse columns
- Foreign key constraints for data integrity
- Optimized indexes for geographic and temporal queries

### Data Ingestion Notes

- `juld` is stored as Julian date (numeric). Convert to timestamps in queries if needed.
- The pipeline automatically normalizes `NaN` and `Inf` values to `NULL`
- For large ingestions, you can adjust the threshold in Option 3
- If you change table schemas, rerun the SQL script and re-ingest
- `valid_profiles.json` is generated once and can be reused

---

## 📊 Your Database

### Data Range
- **From:** October 24, 2002
- **To:** October 31, 2025
- **Duration:** 23 years (8,407 days)

### Data Volume
- **Location records:** 79,934
- **Unique floats:** 451
- **Geographic coverage:** Global (Indian Ocean, Arabian Sea, Bay of Bengal, etc.)

### Data by Year
| Year | Records | Year | Records |
|------|---------|------|---------|
| 2005 | 3,308   | 2020 | 4,121   |
| 2010 | 2,686   | 2021 | 2,408   |
| 2015 | 5,144   | 2022 | 1,520   |
| 2018 | 6,557   | 2023 | 950     |
| 2019 | 5,110   | 2024 | 958     |

---

## 💬 Example Queries

### By Location
```
"Show me floats near the equator"
"Find floats in the Arabian Sea"
"Show data near 15°N, 70°E"
"Temperature in the Indian Ocean"
```

### By Date
```
"Show floats in 2020"
"Salinity data in October 2002"
"Find floats from 2018 to 2020"
```

### Combined
```
"Show salinity near the equator in 2020"
"Temperature in the Arabian Sea in 2024"
"Find floats in the Indian Ocean in 2018"
```

### By Parameter
```
"Show all salinity profiles"
"Temperature depth profiles"
"Find floats with salinity above 35 PSU"
```

---

## 🏗️ Architecture

### System Flow
```
User Query
    ↓
Frontend (Next.js)
    ↓
Backend API (FastAPI)
    ↓
LLM Query Engine (Mistral 7B)
    ├─ Parse Location (equator → lat [-5, 5])
    ├─ Parse Date (March 2023 → Julian dates)
    └─ Generate SQL with filters
    ↓
Smart JOIN Execution
    ├─ Query float_locations (with filters)
    ├─ Get float/cycle pairs
    ├─ Query float_measurements
    └─ Merge in Python
    ↓
Data Processing
    ├─ Map markers (lat/lon)
    ├─ Chart traces (depth profiles)
    ├─ Table rows
    └─ Summary
    ↓
Frontend Visualizations
    ├─ 3D Globe (Globe.gl)
    ├─ 2D Map (Leaflet)
    ├─ Charts (Custom SVG)
    └─ Tables (Sortable/Searchable)
```

### Technology Stack

**Frontend:**
- Next.js 15 + TypeScript
- React 19
- Tailwind CSS
- Leaflet.js (2D maps)
- Globe.gl (3D globe)
- Custom SVG charts

**Backend:**
- FastAPI (Python)
- LangChain
- Mistral 7B (HuggingFace)
- Supabase Python SDK
- Upstash Vector

**Data Pipeline:**
- xarray (NetCDF processing)
- PostgreSQL (Supabase)
- Vector database (Upstash)

---

## 🧠 AI Features

### Geographic Intelligence
Understands location names and converts to coordinates:
- **Equator** → lat [-5, 5]
- **Arabian Sea** → lat [10, 25], lon [60, 75]
- **Bay of Bengal** → lat [5, 22], lon [80, 95]
- **India** → lat [8, 35], lon [68, 97]
- **15°N, 70°E** → ±5° range around point

### Temporal Intelligence
Parses dates and converts to Julian dates:
- **"March 2023"** → Julian [2460004, 2460035]
- **"2020"** → Julian [2458850, 2459215]
- **"October 2002"** → Julian [2452572, 2452603]

### Smart Query Execution
Handles Supabase limitations with intelligent JOIN strategy:
1. Query `float_locations` with geographic/date filters
2. Extract matching (float_id, cycle_number) pairs
3. Query `float_measurements` for those pairs
4. Merge data in Python using join keys
5. Return complete dataset with no artificial limits

---

## 📈 Data Processing

### Map Data
```json
{
  "markers": [
    {
      "lat": -4.337,
      "lon": 48.444,
      "label": "2901085",
      "popup": "Float: 2901085<br>Cycle: 1.0<br>Salinity: 34.70 PSU",
      "id": "2901085"
    }
  ]
}
```

### Chart Data
```json
{
  "traces": [
    {
      "id": "2901085_salinity",
      "float": "2901085",
      "depths": [5.3, 10.1, 14.6, 19.8, ...],
      "values": [34.70, 34.71, 34.72, 34.73, ...]
    }
  ],
  "variable": "Salinity",
  "units": "PSU"
}
```

### Table Data
```json
{
  "columns": ["float_id", "latitude", "longitude", "psal_adjusted"],
  "rows": [
    {
      "float_id": "2901085",
      "latitude": -4.337,
      "longitude": 48.444,
      "psal_adjusted": 34.70
    }
  ]
}
```

---

## 🔧 API Endpoints

### Query Endpoint
```bash
POST /api/chat
Content-Type: application/json

{
  "query": "Show me salinity profiles near the equator",
  "user_id": "user123",
  "use_rag": true
}
```

**Response:**
```json
{
  "success": true,
  "sql_query": "SELECT fm.float_id, fm.psal_adjusted, fl.latitude, fl.longitude...",
  "processed_data": {
    "map_data": { "markers": [...] },
    "chart_data": { "traces": [...] },
    "table_data": { "columns": [...], "rows": [...] },
    "summary": "Found 49,822 records from 50 floats..."
  }
}
```

### Other Endpoints
- `GET /health` - Health check
- `GET /schema` - Database schema
- `GET /floats` - List floats
- `POST /query/stream` - Streaming responses
- `GET /history/{user_id}` - Query history
- `POST /favorites/toggle` - Toggle favorites
- `POST /export` - Export data

---

## 🎨 Visualization Features

### Maps
- **3D Globe:** Interactive globe with float markers
- **2D Map:** Leaflet map with clustering
- **Always visible:** Maps shown for every query (with real or demo data)

### Charts
- **Depth Profiles:** Salinity/temperature vs depth
- **Multiple Traces:** Up to 100 profiles per query
- **Interactive:** Toggle traces, hover for details
- **NaN Handling:** Gracefully skips invalid data points

### Tables
- **Sortable:** Click headers to sort
- **Searchable:** Filter rows
- **Paginated:** 6 rows per page
- **Smart Formatting:** Numbers with 2 decimals, NaN as "N/A"

---

## 🧪 Testing

### Check Date Range
```bash
cd backend
python check_date_range.py
```

### Test API
```bash
# Test simple query
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me salinity profiles", "user_id": "test"}'

# Test location filter
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Show floats near the equator", "user_id": "test"}'

# Test date filter
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Show data in 2020", "user_id": "test"}'
```

### Run Test Suite
```bash
cd backend
python test_api.py
```

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** "No module named 'supabase'"
```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

**Problem:** "HUGGINGFACE_API_TOKEN not found"
```bash
# Add to backend/.env
HUGGINGFACE_API_TOKEN=your_token_here
```

**Problem:** "No data found for your query"
- Check your date range (data: 2002-2025)
- Try broader queries first
- Use `python check_date_range.py` to see available data

**Problem:** NetCDF processing errors
- Ensure system dependencies are installed (HDF5, NetCDF)
- Linux: `sudo apt-get install libhdf5-dev libnetcdf-dev`
- macOS: `brew install hdf5 netcdf`

**Problem:** "JSON serialization error" or "NaN in database"
- Fixed! The pipeline automatically normalizes NaN/Inf to NULL
- If you see this, re-run the ingestion (Option 3 in main.py)

**Problem:** Database connection timeout
- Check Supabase credentials in `.env`
- Verify your Supabase project is active
- Test connection with Option 2 in main.py

**Problem:** Upstash Vector errors
- Verify `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN`
- Check your Upstash Vector index is active
- Ensure you have sufficient quota

### Frontend Issues

**Problem:** "Failed to fetch"
- Ensure backend is running on port 8000
- Check `frontend/.env.local` has correct API URL

**Problem:** "NaN in chart"
- Fixed! Charts now handle invalid values gracefully
- Shows "N/A" for missing data

**Problem:** "Only 1 float showing"
- Fixed! No more limits, all matching floats returned

---

## 📁 Project Structure

```
floatchat/
├── backend/
│   ├── api_server.py              # FastAPI server
│   ├── llm_query_engine.py        # LLM + SQL generation
│   ├── enhanced_llm_engine.py     # RAG features
│   ├── main.py                    # Menu-driven data ingestion
│   ├── incois_scraper.py          # NetCDF scraper (INCOIS)
│   ├── netcdf_test.py             # NetCDF validation
│   ├── check_date_range.py        # Database analysis
│   ├── generate_erd.py            # ER diagram generator
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables
│   ├── .gitignore                 # Git ignore rules
│   └── valid_profiles.json        # Generated profile URLs
├── frontend/
│   ├── app/
│   │   └── page.tsx               # Main page
│   ├── components/
│   │   ├── chat-interface.tsx     # Chat UI
│   │   ├── llm-chat-interface.tsx # LLM chat UI
│   │   ├── report-panel.tsx       # Visualization panel
│   │   └── cards/
│   │       ├── map-card.tsx       # 3D globe
│   │       ├── flat-map-card.tsx  # 2D map
│   │       ├── chart-card.tsx     # Depth profiles
│   │       ├── table-card.tsx     # Data table
│   │       └── heatmap-card.tsx   # Heatmaps
│   ├── lib/
│   │   ├── chat-api.ts            # API utilities
│   │   └── demo-data.ts           # Fallback data
│   ├── package.json               # Node dependencies
│   └── .env.local                 # Environment variables
├── start_floatchat.sh             # Startup script
├── README.md                      # This file (comprehensive docs)
├── DEPLOYMENT_CHECKLIST.md        # Production deployment guide
├── LLM_IMPLEMENTATION_SUMMARY.md  # LLM architecture details
└── VISUAL_GUIDE.md                # Visual documentation
```

---

## 🌟 Advanced Features

### RAG (Retrieval-Augmented Generation)
- Context-aware queries using Upstash Vector
- Semantic search over float metadata
- Improved query understanding

### Multi-turn Conversations
- Follow-up questions with context
- Conversation history tracking
- Context-aware responses

### Query History
- Track all queries
- Search past queries
- Favorite frequently used queries

### Export Capabilities
- CSV, JSON, PDF, NetCDF formats
- Downloadable from UI
- Batch export support

### Analytics
- User query statistics
- Popular queries
- Usage insights

---

## 🎯 Use Cases

### For Scientists
- Quick exploratory analysis
- Profile comparisons
- Spatial/temporal patterns
- Data quality checks

### For Policymakers
- Access insights without technical barriers
- Regional ocean conditions
- Trend analysis
- Decision support

### For Educators
- Interactive ocean data exploration
- Student engagement
- Real-world data examples
- Teaching tool

### For Students
- Learn about oceanography
- Explore real data
- Understand ocean processes
- Research projects

---

## 🚢 Deployment

### Production Checklist
- [ ] Set production environment variables
- [ ] Configure CORS for production domain
- [ ] Set up SSL certificates
- [ ] Configure database connection pooling
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up backup strategy
- [ ] Test with production data
- [ ] Load testing
- [ ] Security audit

### Environment Variables (Production)
```env
# Backend
SUPABASE_URL=https://prod.supabase.co
SUPABASE_KEY=prod_key
HUGGINGFACE_API_TOKEN=prod_token
UPSTASH_VECTOR_REST_URL=https://prod-upstash
UPSTASH_VECTOR_REST_TOKEN=prod_token

# Frontend
NEXT_PUBLIC_API_URL=https://api.floatchat.com
```

---

## 📝 License

This project is developed for INCOIS/MoES (Ministry of Earth Sciences, India).

---

## 👥 Team

**Team Picasso**
- [Saad](https://github.com/saad-mh) - Project Lead
- [Khushi](https://github.com/khushimehta18) - Frontend Developer
- [Nirmalya](https://github.com/devniru2704) - Backend Developer
- [Ariyan](https://github.com/ariyan-cmd) - Data Engineer
- [Priyan](https://github.com/priyan212) - Full Stack Developer
- [Mizan](https://github.com/octopus) - DevOps Engineer

---

## 🙏 Acknowledgments

- **Ministry of Earth Sciences (MoES)**
- **Indian National Centre for Ocean Information Services (INCOIS)**
- **Argo Program** - Global ocean observing system
- **Ifremer** - Argo data distribution
- **HuggingFace** - LLM infrastructure
- **Supabase** - Database platform
- **Upstash** - Vector database

---

## 📞 Support

For issues or questions:
- 📧 Email: support@floatchat.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/floatchat/issues)
- 📚 Docs: [Full Documentation](https://docs.floatchat.com)
- 💬 Discord: [Join our community](https://discord.gg/floatchat)

---

## 🔗 Related Links

- [Indian Argo Project](https://incois.gov.in/OON/index.jsp)
- [Argo Data](https://data-argo.ifremer.fr/dac/aoml/)
- [Argo Program](https://argo.ucsd.edu/)
- [INCOIS](https://incois.gov.in/)

---

---

## 📋 Deployment Checklist

### Pre-Deployment

**Environment Setup:**
- [ ] Backend `.env` configured (Supabase, Upstash, HuggingFace tokens)
- [ ] Frontend `.env.local` configured (Backend API URL)
- [ ] Python 3.8+ and Node.js 18+ installed
- [ ] All dependencies installed (`pip install -r requirements.txt`, `npm install`)

**Database:**
- [ ] Supabase tables created and indexed
- [ ] Data ingested via NetCDF pipeline
- [ ] Connection tested successfully

**External Services:**
- [ ] HuggingFace API token obtained and tested
- [ ] Upstash Vector index created
- [ ] All service connections verified

**Testing:**
- [ ] Backend health check passes (`curl http://localhost:8000/health`)
- [ ] Frontend loads successfully
- [ ] Test queries work end-to-end
- [ ] Visualizations render correctly

**Security:**
- [ ] `.env` files not committed to git
- [ ] API tokens secured
- [ ] CORS configured correctly
- [ ] Input validation working

### Production Deployment

**Backend (Docker/Cloud):**
```bash
cd backend
docker build -t floatchat-backend .
docker run -p 8000:8000 floatchat-backend
```
- [ ] Container deployed to AWS/GCP/Azure
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Monitoring and logging configured

**Frontend (Vercel):**
```bash
cd frontend
npm run build
vercel deploy
```
- [ ] Deployment successful
- [ ] Environment variables configured
- [ ] Custom domain configured
- [ ] HTTPS enabled

**Post-Deployment:**
- [ ] All functionality tests pass
- [ ] Performance metrics acceptable (< 5s response time)
- [ ] No console or network errors
- [ ] Monitoring and alerts configured

---

**Made with ❤️ for ocean science**
