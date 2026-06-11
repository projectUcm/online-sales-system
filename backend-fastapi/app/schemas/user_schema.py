from pydantic import BaseModel


class UserRegister(BaseModel):
    name: str
    email: str
    password: str
    phone: str = ""


class UserLogin(BaseModel):
    email: str
    password: str


class UserVerify(BaseModel):
    email: str
    code: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int = 0
    name: str = ""
    role: str = "client"
