import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.cart import CartItem
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.payment_service import process_payment
from app.services.notification_client import send_purchase_email, send_payment_email, send_purchase_whatsapp

router = APIRouter(prefix="/checkout", tags=["Checkout"])


class CheckoutRequest(BaseModel):
    card_number: str
    cardholder_name: str = ""
    expiry_month: int = 11
    expiry_year: int = 25
    security_code: str = ""


class GuestItem(BaseModel):
    product_id: int
    quantity: int = 1


class GuestCheckoutRequest(BaseModel):
    email: str
    card_number: str
    cardholder_name: str = ""
    expiry_month: int = 11
    expiry_year: int = 25
    security_code: str = ""
    items: List[GuestItem]


def _build_items(items_raw, db: Session):
    total = 0.0
    items_detail = []
    for item in items_raw:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            total += product.price * item.quantity
            items_detail.append({
                "name": product.name,
                "quantity": item.quantity,
                "price": product.price * item.quantity,
            })
    return total, items_detail


@router.post("/")
def checkout(
    data: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    total, items_detail = _build_items(cart_items, db)

    result = process_payment({
        "card_number": data.card_number,
        "cardholder_name": data.cardholder_name,
        "expiry_month": data.expiry_month,
        "expiry_year": data.expiry_year,
        "security_code": data.security_code,
        "amount": total,
    })

    if result.get("status") == "approved":
        db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        order_ref = str(uuid.uuid4())[:8].upper()
        db.add(Order(
            user_id=current_user.id,
            order_ref=order_ref,
            total=total,
            status="approved",
            items_json=json.dumps(items_detail, ensure_ascii=False),
            created_at=now,
        ))
        db.commit()
        try:
            send_purchase_email(current_user.email, current_user.name, order_ref, now, items_detail, total)
            send_payment_email(current_user.email, result.get("transaction_id", "N/A"), "Aprobado", now, total, f"Compra #{order_ref} en NEXSTORE")
            if current_user.phone:
                send_purchase_whatsapp(current_user.phone, current_user.name, order_ref, now, items_detail, total)
        except Exception as e:
            print(f"[WARN] Notificación no enviada: {e}")

    return result


@router.post("/guest")
def guest_checkout(data: GuestCheckoutRequest, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío")

    total, items_detail = _build_items(data.items, db)
    if total == 0:
        raise HTTPException(status_code=400, detail="No se encontraron productos válidos")

    result = process_payment({
        "card_number": data.card_number,
        "cardholder_name": data.cardholder_name,
        "expiry_month": data.expiry_month,
        "expiry_year": data.expiry_year,
        "security_code": data.security_code,
        "amount": total,
    })

    if result.get("status") == "approved":
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        order_ref = str(uuid.uuid4())[:8].upper()
        db.add(Order(
            user_id=None,
            order_ref=order_ref,
            total=total,
            status="approved",
            items_json=json.dumps(items_detail, ensure_ascii=False),
            created_at=now,
        ))
        db.commit()
        try:
            send_purchase_email(data.email, "Invitado", order_ref, now, items_detail, total)
            send_payment_email(data.email, result.get("transaction_id", "N/A"), "Aprobado", now, total, f"Compra #{order_ref} en NEXSTORE")
        except Exception as e:
            print(f"[WARN] Email invitado no enviado: {e}")

    return result
