from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.s3_service import upload_file, list_user_files, delete_file, get_presigned_url
from app.config.settings import settings

router = APIRouter(prefix="/files", tags=["Files"])

STORAGE_LIMIT = settings.s3_storage_limit_bytes


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    phone: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    file_size = len(content)
    current_usage = current_user.storage_used
    if current_usage + file_size > STORAGE_LIMIT:
        raise HTTPException(status_code=400, detail="Sin espacio disponible (límite 2 GB)")

    storage_used_after = current_usage + file_size
    sms_phone = phone or current_user.phone or ""

    result = upload_file(
        current_user.id,
        file.filename,
        content,
        file.content_type or "application/octet-stream",
        phone=sms_phone,
        storage_used_after=storage_used_after,
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {result.get('error')}")

    current_user.storage_used = storage_used_after
    db.commit()

    available = STORAGE_LIMIT - current_user.storage_used
    return {
        "message": "Archivo subido correctamente",
        "filename": file.filename,
        "size": file_size,
        "storage_used": current_user.storage_used,
        "storage_available": available,
    }


@router.get("/")
def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    files = list_user_files(current_user.id)
    available = STORAGE_LIMIT - current_user.storage_used
    return {
        "files": files,
        "storage_used": current_user.storage_used,
        "storage_available": available,
        "storage_limit": STORAGE_LIMIT,
    }


@router.get("/storage")
def storage_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    available = STORAGE_LIMIT - current_user.storage_used
    return {
        "used_bytes": current_user.storage_used,
        "available_bytes": available,
        "limit_bytes": STORAGE_LIMIT,
        "used_mb": round(current_user.storage_used / (1024 * 1024), 2),
        "available_mb": round(available / (1024 * 1024), 2),
        "limit_gb": round(STORAGE_LIMIT / (1024 * 1024 * 1024), 1),
    }


@router.get("/download/{filename}")
def get_download_url(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    url = get_presigned_url(current_user.id, filename)
    if not url:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return {"url": url}


@router.delete("/{filename}")
def remove_file(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    files = list_user_files(current_user.id)
    file_obj = next((f for f in files if f["name"] == filename), None)
    if not file_obj:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    success = delete_file(current_user.id, filename)
    if success:
        current_user.storage_used = max(0, current_user.storage_used - file_obj["size"])
        db.commit()
    return {"message": "Archivo eliminado"}
