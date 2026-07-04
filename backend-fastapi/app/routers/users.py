from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.user_schema import UserRegister, UserLogin, UserVerify, Token
from app.services.auth_service import hash_password, verify_password, create_token, generate_verification_code, get_current_user
from app.services.notification_client import send_verification_email

router = APIRouter(prefix="/users", tags=["Users"])


class PhoneUpdate(BaseModel):
    phone: str


class ResendCode(BaseModel):
    email: str


@router.post("/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    code = generate_verification_code()
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        phone=data.phone or "",
        is_verified=False,
        verification_code=code,
        storage_used=0,
        role="client",
    )
    db.add(user)
    db.commit()
    try:
        send_verification_email(data.email, data.name, code)
    except Exception as e:
        print(f"[WARN] Email no enviado: {e}")
    return {"message": "Usuario registrado. Revisa tu correo para validar tu cuenta.", "email": data.email}


@router.post("/verify")
def verify_account(data: UserVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.is_verified:
        return {"message": "Cuenta ya verificada"}
    if user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Código de verificación incorrecto")
    user.is_verified = True
    user.verification_code = None
    db.commit()
    return {"message": "Cuenta verificada correctamente"}


@router.post("/resend-code")
def resend_code(data: ResendCode, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.is_verified:
        return {"message": "Cuenta ya verificada"}
    code = generate_verification_code()
    user.verification_code = code
    db.commit()
    try:
        send_verification_email(user.email, user.name, code)
    except Exception as e:
        print(f"[WARN] Email no enviado: {e}")
    return {"message": "Código reenviado. Revisa tu correo."}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_verified": current_user.is_verified,
    }


@router.patch("/me/phone")
def update_phone(data: PhoneUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.phone = data.phone
    db.commit()
    return {"message": "Teléfono actualizado", "phone": current_user.phone}


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Cuenta no verificada. Revisa tu correo.")
    return {
        "access_token": create_token(user.id),
        "token_type": "bearer",
        "user_id": user.id,
        "name": user.name,
        "role": user.role or "client",
    }
