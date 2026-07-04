from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import events
from app.services.dynamo_service import ensure_table_exists

ensure_table_exists()

app = FastAPI(title="Audit Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)


@app.get("/")
def root():
    return {"message": "Audit service funcionando"}


@app.get("/health")
def health():
    return {"status": "ok"}
