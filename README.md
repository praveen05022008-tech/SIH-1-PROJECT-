# 🛡️ SIF-SHIELD AI Safety Platform

**SIF-SHIELD** is an enterprise AI-driven **Serious Injury and Fatality (SIF)** prevention and safety workflow platform. It enables incident & precursor reporting, AI hazard classification, safety officer dispatch workflows, multi-tier approvals, and analytics for industrial and refinery environments.

---

## ⚡ Quick Start (TL;DR)

### 1. Prerequisites
- **Node.js**: `v18+` or `v20+` ([Download Node.js](https://nodejs.org/))
- **Python**: `3.10+` or `3.11+` ([Download Python](https://www.python.org/))

---

### 2. Fast Setup in 2 Terminals

#### 🔹 Terminal 1: Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate       # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy environment template if not configured
cp ../.env.example .env

# Run the backend (starts on http://127.0.0.1:8000)
python3 main.py
```
> Database tables and the default **System Administrator** account are automatically initialized on startup!

#### 🔹 Terminal 2: Frontend (React + Vite)
```bash
# In project root directory
npm install

# Start Vite dev server (starts on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Default Credentials & Role Testing

| Role | Email | Password | Access & Responsibilities |
|---|---|---|---|
| **System Administrator** | `admin@refinery.safe` | `password123` | User approvals, role assignments, system health, audit logs |
| **Safety Manager** | Register via signup / approve in Admin | Set during signup | Review reports, risk scoring, assign tasks to safety officers |
| **Safety Officer** | Register via signup / approve in Admin | Set during signup | On-site investigation, re-check tasks, corrective actions |
| **Field Worker** | Register via signup / approve in Admin | Set during signup | Incident/precursor reporting, voice transcripts, photo uploads |

> **Tip:** New user registrations default to `Pending` approval. Log in with the **Admin** account above to approve new users in the **Admin Management** panel.

---

## ⚙️ Environment Configuration

Create a `.env` file in the project root (or inside `backend/.env`) based on `.env.example`:

```env
# TiDB Cloud MySQL Connection
DB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=your_tidb_user
DB_PASSWORD=your_tidb_password
DB_NAME=sif_shield

# Groq AI & Fast Whisper
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b

# Hugging Face (Optional)
HF_TOKEN=your_hf_token
WHISPER_MODEL=openai/whisper-small

# Cloudinary (Media & Photo Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Security & JWT
JWT_SECRET=sif-shield-super-secret-jwt-key-2026-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
UNWATCHED_TIMEOUT_SECONDS=600
```

---

## 🏗️ Project Architecture

```
SIH-1-PROJECT-/
├── backend/                     # FastAPI Python Backend
│   ├── main.py                  # API entry point & startup initialization
│   ├── database.py              # SQLAlchemy engine & DB connection
│   ├── models.py                # SQL database models
│   ├── seed.py                  # Initial schema & Admin seeder
│   ├── requirements.txt         # Python dependencies
│   ├── routers/                 # Modular API endpoints
│   │   ├── admin.py             # User approval & audit logs
│   │   ├── auth.py              # Authentication (JWT)
│   │   ├── events.py            # Safety events & incidents
│   │   ├── manager.py           # Task assignment & rechecks
│   │   ├── reports.py           # Worker safety reports
│   │   ├── voice.py             # Whisper audio transcription
│   │   └── upload.py            # Cloudinary media uploads
│   └── services/                # External AI & media services
├── src/                         # React Frontend (Vite + TypeScript)
│   ├── components/              # Shared UI & layout components
│   ├── pages/                   # Application views (Dashboard, Reports, Admin, etc.)
│   ├── config/                  # API client & endpoint helpers
│   └── types/                   # TypeScript interfaces
├── package.json                 # Frontend scripts and dependencies
├── vite.config.ts               # Vite proxy config (/api -> localhost:8000)
└── README.md                    # Project documentation
```

---

## 🛠️ Useful Commands

### Frontend
- `npm run dev`: Start local development server on port `5173`.
- `npm run build`: Type-check with TypeScript and create production bundle in `dist/`.
- `npm run lint`: Run Oxlint fast linter.
- `npm run preview`: Preview production build locally.

### Backend
- `python3 main.py` or `uvicorn main:app --reload --port 8000`: Run backend server with hot reload.
- `python3 seed.py`: Re-run database seeding manually.

---

## ❓ Troubleshooting

<details>
<summary><b>1. Frontend cannot connect to Backend (API Errors / Network Error)</b></summary>

- Verify that the backend is running on `http://127.0.0.1:8000`.
- Vite dev server automatically proxies `/api/*` to port `8000` via `vite.config.ts`.
</details>

<details>
<summary><b>2. Database SSL / TiDB Connection Error</b></summary>

- Ensure `certifi` is installed (`pip install certifi`).
- Double-check database credentials in your `.env` file.
</details>

<details>
<summary><b>3. TypeScript Build Error</b></summary>

- Run `npm run build` to verify all TypeScript interfaces match the API responses.
</details>
