from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    price: float


class ProductCreate(ProductBase):
    stock: int = 0


class Product(ProductBase):
    id: int
    stock: int
    avg_rating: float | None = None
    review_count: int = 0

    model_config = {"from_attributes": True}
