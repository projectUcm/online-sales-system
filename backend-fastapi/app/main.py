from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.models.product import Product
from app.models.user import User  # noqa: F401
from app.models.cart import CartItem  # noqa: F401
from app.routers import products, users, cart, checkout, files

Base.metadata.create_all(bind=engine)

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
app.include_router(files.router)


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
