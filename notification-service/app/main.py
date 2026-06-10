from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.notifications import router

app = FastAPI(title="Notification Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Notification service funcionando"}


@app.get("/health")
def health():
    return {"status": "ok"}
