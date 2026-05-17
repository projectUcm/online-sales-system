from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.models.product import Product
from app.models.user import User  # noqa: F401
from app.models.cart import CartItem  # noqa: F401
from app.routers import products, users, cart, checkout

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


@app.on_event("startup")
def seed_products():
    db = SessionLocal()
    if db.query(Product).count() == 0:
        db.add_all([
            Product(name="Notebook Gamer", price=999990, stock=10),
            Product(name="Mouse Logitech", price=29990, stock=50),
        ])
        db.commit()
    db.close()


@app.get("/")
def root():
    return {"message": "Backend funcionando correctamente"}


@app.get("/health")
def health():
    return {"status": "ok"}
