import uuid
import requests
from app.config.settings import settings


def process_payment(
    card_number: str,
    cardholder_name: str,
    expiry_month: int,
    expiry_year: int,
    security_code: str,
    amount: float,
) -> dict:
    if not card_number:
        return {"status": "error", "message": "Número de tarjeta inválido"}

    if not settings.mercadopago_access_token or not settings.mercadopago_public_key:
        return {"status": "error", "message": "Servicio de pago no configurado"}

    try:
        year = expiry_year if expiry_year > 2000 else 2000 + expiry_year

        # Step 1: tokenize card
        token_response = requests.post(
            f"https://api.mercadopago.com/v1/card_tokens?public_key={settings.mercadopago_public_key}",
            json={
                "card_number": card_number,
                "expiration_month": expiry_month,
                "expiration_year": year,
                "security_code": security_code,
                "cardholder": {
                    "name": cardholder_name or "APRO",
                    "identification": {"type": "RUT", "number": "14357293-K"},
                },
            },
            headers={"Content-Type": "application/json"},
            timeout=20,
        )

        if token_response.status_code != 201:
            return {
                "status": "error",
                "message": f"Error al tokenizar tarjeta: {token_response.text}",
            }

        card_token = token_response.json()["id"]

        # Step 2: process payment
        payment_response = requests.post(
            "https://api.mercadopago.com/v1/payments",
            json={
                "token": card_token,
                "transaction_amount": float(amount) if amount > 0 else 100.0,
                "description": "Compra en NEXSTORE",
                "installments": 1,
                "payment_method_id": _get_payment_method(card_number),
                "payer": {"email": "test_user_123@testuser.com"},
            },
            headers={
                "Authorization": f"Bearer {settings.mercadopago_access_token}",
                "Content-Type": "application/json",
                "X-Idempotency-Key": str(uuid.uuid4()),
            },
            timeout=20,
        )

        payment = payment_response.json()
        status = payment.get("status", "error")

        return {
            "status": "approved" if status == "approved" else "rejected",
            "transaction_id": str(payment.get("id", "")),
            "amount": payment.get("transaction_amount", amount),
            "message": payment.get("status_detail", ""),
        }

    except Exception as e:
        return {"status": "error", "message": f"Error procesando pago: {str(e)}"}


def _get_payment_method(card_number: str) -> str:
    first = card_number[0] if card_number else "4"
    if first == "4":
        return "visa"
    if first == "5":
        return "master"
    if first == "3":
        return "amex"
    return "visa"
