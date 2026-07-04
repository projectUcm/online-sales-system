from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.product import Product
from app.models.review import Review
from app.schemas.product_schema import Product as ProductSchema, ProductCreate
from app.services.auth_service import require_admin
from app.services.notification_client import send_product_whatsapp, send_product_deleted_whatsapp

router = APIRouter(prefix="/products", tags=["Products"])


def _with_rating(product: Product, avg_rating: float | None, review_count: int) -> ProductSchema:
    return ProductSchema(
        id=product.id,
        name=product.name,
        price=product.price,
        stock=product.stock,
        avg_rating=round(avg_rating, 1) if avg_rating is not None else None,
        review_count=review_count or 0,
    )


@router.get("/", response_model=list[ProductSchema])
def get_products(db: Session = Depends(get_db)):
    rows = (
        db.query(Product, func.avg(Review.rating), func.count(Review.id))
        .outerjoin(Review, Review.product_id == Product.id)
        .group_by(Product.id)
        .all()
    )
    return [_with_rating(p, avg, count) for p, avg, count in rows]


@router.get("/{product_id}", response_model=ProductSchema)
def get_product(product_id: int, db: Session = Depends(get_db)):
    row = (
        db.query(Product, func.avg(Review.rating), func.count(Review.id))
        .outerjoin(Review, Review.product_id == Product.id)
        .filter(Product.id == product_id)
        .group_by(Product.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product, avg, count = row
    return _with_rating(product, avg, count)


@router.post("/", response_model=ProductSchema)
def create_product(data: ProductCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    product = Product(name=data.name, price=data.price, stock=data.stock)
    db.add(product)
    db.commit()
    db.refresh(product)
    if admin.phone:
        try:
            send_product_whatsapp(admin.phone, admin.name, product.name, product.price, product.stock)
        except Exception as e:
            print(f"[WARN] WhatsApp producto: {e}")
    return product


@router.put("/{product_id}", response_model=ProductSchema)
def update_product(
    product_id: int,
    data: ProductCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product.name = data.name
    product.price = data.price
    product.stock = data.stock
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    product_name, product_price = product.name, product.price
    db.delete(product)
    db.commit()
    if admin.phone:
        try:
            send_product_deleted_whatsapp(admin.phone, admin.name, product_name, product_price)
        except Exception as e:
            print(f"[WARN] WhatsApp eliminación producto: {e}")
    return {"message": "Producto eliminado"}
