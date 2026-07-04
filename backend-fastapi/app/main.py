from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal, get_db, run_migrations
from app.models.product import Product
from app.models.user import User
from app.models.cart import CartItem
from app.routers import products, users, cart, checkout, orders, reviews
from app.models.order import Order
from app.models.review import Review
from app.services.auth_service import hash_password
from app.services.auth_service import require_admin

Base.metadata.create_all(bind=engine)
run_migrations()

from app.services.s3_service import ensure_bucket_exists
ensure_bucket_exists()

app = FastAPI(title="Online Sales API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(users.router)
app.include_router(cart.router)
app.include_router(checkout.router)
app.include_router(orders.router)
app.include_router(reviews.router)


@app.on_event("startup")
def seed_admin():
    db = SessionLocal()
    admin_email = "admin@nexstore.com"
    if not db.query(User).filter(User.email == admin_email).first():
        db.add(User(
            name="Administrador",
            email=admin_email,
            hashed_password=hash_password("Nexstore2026!"),
            phone="",
            is_verified=True,
            verification_code=None,
            role="admin",
        ))
        db.commit()
    else:
        admin = db.query(User).filter(User.email == admin_email).first()
        if admin and admin.role != "admin":
            admin.role = "admin"
            db.commit()
    db.close()


@app.on_event("startup")
def seed_products():
    db = SessionLocal()
    if db.query(Product).count() == 0:
        db.add_all([
            Product(name="Notebook Gamer RTX 4060", price=999990, stock=10),
            Product(name="Mouse Logitech G502 X", price=49990, stock=50),
            Product(name="Monitor Samsung 27\" QHD", price=289990, stock=8),
            Product(name="Teclado Mecánico RGB HyperX", price=89990, stock=20),
            Product(name="Auriculares Sony WH-1000XM5", price=189990, stock=15),
            Product(name="Webcam Logitech C920 HD", price=59990, stock=25),
            Product(name="SSD Samsung 1TB NVMe", price=89990, stock=30),
            Product(name="RAM Corsair Vengeance 16GB", price=49990, stock=40),
            Product(name="Silla Gamer DXRacer Pro", price=399990, stock=5),
            Product(name="Mousepad XL RGB Razer", price=29990, stock=60),
        ])
        db.commit()
    db.close()


@app.get("/")
def root():
    return {"message": "Backend funcionando correctamente"}


@app.get("/health")
def health():
    return {"status": "ok"}


# TEMPORAL: endpoint de un solo uso para dejar la BD sin cuentas antes de la demo,
# confirmado explícitamente por el usuario (borra usuarios + carritos + órdenes +
# reseñas asociadas, ya que no pueden quedar huérfanos por integridad referencial).
# Requiere un token de administrador vigente. Se retira del código apenas se usa.
@app.post("/admin/reset-users")
def _reset_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    reviews_deleted = db.query(Review).delete()
    cart_deleted = db.query(CartItem).delete()
    orders_deleted = db.query(Order).delete()
    users_deleted = db.query(User).delete()
    db.commit()
    return {
        "users_deleted": users_deleted,
        "cart_items_deleted": cart_deleted,
        "orders_deleted": orders_deleted,
        "reviews_deleted": reviews_deleted,
    }
