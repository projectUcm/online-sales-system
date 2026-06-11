import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.models.user import User
from app.services.auth_service import get_current_user, require_admin

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("/my")
def my_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(Order.id.desc())
        .all()
    )
    return [
        {
            "id": o.id,
            "order_ref": o.order_ref,
            "total": o.total,
            "status": o.status,
            "created_at": o.created_at,
            "items": json.loads(o.items_json),
        }
        for o in orders
    ]


@router.get("/stats")
def stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    from app.models.product import Product
    total_orders = db.query(Order).count()
    total_revenue = db.query(Order).all()
    revenue = sum(o.total for o in total_revenue)
    total_products = db.query(Product).count()
    total_users = db.query(User).filter(User.role == "client").count()
    return {
        "total_orders": total_orders,
        "total_revenue": revenue,
        "total_products": total_products,
        "total_clients": total_users,
    }


@router.get("/all")
def all_orders(db: Session = Depends(get_db), admin=Depends(require_admin)):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    users = {u.id: u.name for u in db.query(User).all()}
    return [
        {
            "id": o.id,
            "order_ref": o.order_ref,
            "user_name": users.get(o.user_id, "Invitado"),
            "user_email": o.guest_email if o.user_id is None else None,
            "total": o.total,
            "status": o.status,
            "created_at": o.created_at,
            "items": json.loads(o.items_json),
        }
        for o in orders
    ]
