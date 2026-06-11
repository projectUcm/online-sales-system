from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.product import Product
from app.schemas.product_schema import Product as ProductSchema, ProductCreate
from app.services.auth_service import require_admin
from app.services.notification_client import send_product_whatsapp

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("/", response_model=list[ProductSchema])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


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
    db.delete(product)
    db.commit()
    return {"message": "Producto eliminado"}
