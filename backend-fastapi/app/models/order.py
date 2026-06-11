from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    guest_email = Column(String, nullable=True)
    guest_name = Column(String, nullable=True)
    order_ref = Column(String, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String, default="approved")
    items_json = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
