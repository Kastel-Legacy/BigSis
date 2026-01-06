from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import router as api_router
from core.db.database import engine, Base
from sqlalchemy import text

app = FastAPI(title="Big SIS API", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup():
    # Create tables on startup
    async with engine.begin() as conn:
        # Enable vector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # await conn.run_sync(Base.metadata.drop_all) # Optional: Reset DB
        await conn.run_sync(Base.metadata.create_all)

@app.on_event("shutdown")
async def shutdown():
    pass
