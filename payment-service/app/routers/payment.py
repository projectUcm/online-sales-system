from fastapi import APIRouter
from pydantic import BaseModel
from app.services.mercadopago_service import process_payment

router = APIRouter(tags=["Payment"])

class PaymentRequest(BaseModel):
    card_number: str
    cardholder_name: str = ""
    expiry_month: int = 11
    expiry_year: int = 25
    security_code: str = ""
    amount: float = 0.0


@router.post("/pay")
def pay(data: PaymentRequest):
    return process_payment(
        card_number=data.card_number,
        cardholder_name=data.cardholder_name,
        expiry_month=data.expiry_month,
        expiry_year=data.expiry_year,
        security_code=data.security_code,
        amount=data.amount,
    )
