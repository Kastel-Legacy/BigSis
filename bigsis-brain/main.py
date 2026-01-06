from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import router as api_router
from core.db.database import engine, Base

app = FastAPI(title="Big SIS API", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # TODO: Restrict in Prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup():
    # Optional: Connect DB logs
    pass

@app.on_event("shutdown")
async def shutdown():
    pass
