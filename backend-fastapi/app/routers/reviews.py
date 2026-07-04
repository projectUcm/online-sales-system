from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.database import get_db
from app.models.product import Product
from app.models.review import Review
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.s3_service import upload_review_photo, get_review_photo_url, get_user_review_storage_usage
from app.services.audit_client import log_event

router = APIRouter(prefix="/products", tags=["Reviews"])

MAX_PHOTO_BYTES = 5 * 1024 * 1024
STORAGE_LIMIT = settings.s3_review_storage_limit_bytes


def _serialize(review: Review) -> dict:
    return {
        "id": review.id,
        "product_id": review.product_id,
        "user_name": review.user_name,
        "rating": review.rating,
        "comment": review.comment or "",
        "photo_url": get_review_photo_url(review.photo_key) if review.photo_key else None,
        "created_at": review.created_at,
    }


@router.get("/reviews/storage")
def get_my_review_storage(current_user: User = Depends(get_current_user)):
    used = get_user_review_storage_usage(current_user.id)
    return {
        "used_bytes": used,
        "limit_bytes": STORAGE_LIMIT,
        "available_bytes": max(0, STORAGE_LIMIT - used),
        "used_mb": round(used / (1024 * 1024), 2),
        "limit_mb": round(STORAGE_LIMIT / (1024 * 1024)),
    }


@router.get("/{product_id}/reviews")
def list_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .filter(Review.product_id == product_id)
        .order_by(Review.id.desc())
        .all()
    )
    return [_serialize(r) for r in reviews]


@router.post("/{product_id}/reviews")
async def create_review(
    product_id: int,
    request: Request,
    rating: int = Form(...),
    comment: str = Form(""),
    photo: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ip = request.client.host if request.client else ""
    if not db.query(Product).filter(Product.id == product_id).first():
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="La calificación debe ser entre 1 y 5")

    photo_key = None
    if photo is not None and photo.filename:
        content = await photo.read()
        if len(content) > MAX_PHOTO_BYTES:
            raise HTTPException(status_code=400, detail="La foto no puede superar 5 MB")
        current_usage = get_user_review_storage_usage(current_user.id)
        if current_usage + len(content) > STORAGE_LIMIT:
            raise HTTPException(
                status_code=400,
                detail="Sin espacio disponible para fotos de reseña (límite 200 MB). Elimina reseñas anteriores con foto o sube una imagen más liviana.",
            )
        photo_key = upload_review_photo(
            product_id, current_user.id, photo.filename, content, photo.content_type or ""
        )
        log_event("file_upload", current_user.email, f"Foto subida en reseña de producto #{product_id}", ip)

    review = Review(
        product_id=product_id,
        user_id=current_user.id,
        user_name=current_user.name,
        rating=rating,
        comment=comment,
        photo_key=photo_key,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _serialize(review)
