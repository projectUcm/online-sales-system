"""
Calls the notification-service microservice (running on EC2).
Falls back to direct boto3 calls if the service is unavailable.
"""
import requests
from app.config.settings import settings


def _post(path: str, payload: dict) -> bool:
    try:
        url = f"{settings.notification_service_url}{path}"
        r = requests.post(url, json=payload, timeout=10)
        return r.status_code == 200
    except Exception as e:
        print(f"[NOTIFY CLIENT] {path} failed: {e}")
        return False


def send_verification_email(to: str, name: str, code: str):
    ok = _post("/notify/email/verification", {"to": to, "name": name, "code": code})
    if not ok:
        from app.services.email_service import send_verification_email as _direct
        _direct(to, name, code)


def send_purchase_email(to: str, name: str, order_id: str, date: str, items: list, total: float):
    ok = _post("/notify/email/purchase", {
        "to": to, "name": name, "order_id": order_id,
        "date": date, "items": items, "total": total,
    })
    if not ok:
        from app.services.email_service import send_purchase_email as _direct
        _direct(to, name, order_id, date, items, total)


def send_payment_email(to: str, transaction_id: str, status: str, date: str, amount: float, summary: str):
    ok = _post("/notify/email/payment", {
        "to": to, "transaction_id": transaction_id, "status": status,
        "date": date, "amount": amount, "summary": summary,
    })
    if not ok:
        from app.services.email_service import send_payment_email as _direct
        _direct(to, transaction_id, status, date, amount, summary)


def send_purchase_whatsapp(phone: str, name: str, order_id: str, date: str, items: list, total: float):
    _post("/notify/sms/purchase", {
        "to": phone, "name": name, "order_id": order_id,
        "date": date, "items": items, "total": total,
    })


def send_product_whatsapp(phone: str, admin_name: str, product_name: str, price: float, stock: int):
    _post("/notify/sms/product-created", {
        "to": phone, "admin_name": admin_name,
        "product_name": product_name, "price": price, "stock": stock,
    })


def send_product_deleted_whatsapp(phone: str, admin_name: str, product_name: str, price: float):
    _post("/notify/sms/product-deleted", {
        "to": phone, "admin_name": admin_name,
        "product_name": product_name, "price": price,
    })
