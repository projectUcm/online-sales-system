from fastapi import FastAPI
from app.routers.payment import router

app = FastAPI(title="Payment Service")

app.include_router(router, prefix="/payment")


@app.get("/")
def root():
    return {"message": "Payment service funcionando"}


@app.get("/payment/health")
def health():
    return {"status": "ok"}