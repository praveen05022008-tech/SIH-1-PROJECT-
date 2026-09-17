from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from seed import init_db
from routers import auth, admin, reports, events, manager, voice, upload, analytics, meta

# Initialize DB tables and seed Admin on startup
init_db()

app = FastAPI(
    title="SIF-SHIELD AI Platform API",
    description="Enterprise SIF Safety Intelligence & Workflow Engine with Cerebras AI, Whisper, TiDB, and Cloudinary",
    version="2.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register All API Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(reports.router)
app.include_router(events.router)
app.include_router(manager.router)
app.include_router(voice.router)
app.include_router(upload.router)
app.include_router(analytics.router)
app.include_router(analytics.sif_router)
app.include_router(meta.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "SIF-SHIELD AI Safety Backend",
        "database": "TiDB Cloud MySQL (sif_shield)",
        "ai_engine": "Cerebras AI (SIF Category 3) + OpenAI Whisper-Small",
        "media_storage": "Cloudinary",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
