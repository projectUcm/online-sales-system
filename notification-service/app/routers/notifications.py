from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.email_service import send_email
from app.services.sms_service import send_sms

router = APIRouter(prefix="/notify", tags=["Notifications"])


class EmailRequest(BaseModel):
    to: str
    subject: str
    body_html: str


class SmsRequest(BaseModel):
    to: str
    message: str


class VerificationEmailRequest(BaseModel):
    to: str
    name: str
    code: str


class PurchaseEmailRequest(BaseModel):
    to: str
    name: str
    order_id: str
    date: str
    items: List[dict]
    total: float


class PaymentEmailRequest(BaseModel):
    to: str
    transaction_id: str
    status: str
    date: str
    amount: float
    summary: str


class FileUploadSmsRequest(BaseModel):
    to: str
    filename: str
    upload_date: str
    used_bytes: int
    available_bytes: int


class PurchaseWhatsappRequest(BaseModel):
    to: str
    name: str
    order_id: str
    date: str
    items: List[dict]
    total: float


class ProductCreatedRequest(BaseModel):
    to: str
    admin_name: str
    product_name: str
    price: float
    stock: int


@router.post("/email")
def notify_email(req: EmailRequest):
    return send_email(req.to, req.subject, req.body_html)


@router.post("/sms")
def notify_sms(req: SmsRequest):
    return send_sms(req.to, req.message)


@router.post("/email/verification")
def send_verification(req: VerificationEmailRequest):
    subject = "Valida tu cuenta en NEXSTORE"
    body = f"""
    <html><body>
    <h2>Bienvenido a NEXSTORE, {req.name}!</h2>
    <p>Tu código de verificación es:</p>
    <h1 style="letter-spacing:8px;color:#2563eb;">{req.code}</h1>
    <p>Ingresa este código para activar tu cuenta.</p>
    </body></html>
    """
    return send_email(req.to, subject, body)


@router.post("/email/purchase")
def send_purchase(req: PurchaseEmailRequest):
    rows = "".join(
        f"<tr><td>{i['name']}</td><td>{i['quantity']}</td><td>${i['price']:,.0f}</td></tr>"
        for i in req.items
    )
    subject = f"Confirmación de compra #{req.order_id} - NEXSTORE"
    body = f"""
    <html><body>
    <h2>Gracias por tu compra, {req.name}!</h2>
    <p><b>Número de compra:</b> {req.order_id}</p>
    <p><b>Fecha:</b> {req.date}</p>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
    <h3>Total pagado: ${req.total:,.0f}</h3>
    </body></html>
    """
    return send_email(req.to, subject, body)


@router.post("/email/payment")
def send_payment(req: PaymentEmailRequest):
    subject = "Confirmación de pago - NEXSTORE"
    body = f"""
    <html><body>
    <h2>Detalle de pago - NEXSTORE</h2>
    <p><b>ID Transacción:</b> {req.transaction_id}</p>
    <p><b>Estado:</b> {req.status}</p>
    <p><b>Fecha:</b> {req.date}</p>
    <p><b>Monto pagado:</b> ${req.amount:,.0f}</p>
    <p><b>Resumen:</b> {req.summary}</p>
    </body></html>
    """
    return send_email(req.to, subject, body)


@router.post("/sms/file-upload")
def send_file_sms(req: FileUploadSmsRequest):
    used_mb = req.used_bytes / (1024 * 1024)
    avail_mb = req.available_bytes / (1024 * 1024)
    message = (
        f"NEXSTORE - Archivo subido: {req.filename}\n"
        f"Fecha: {req.upload_date}\n"
        f"Espacio usado: {used_mb:.1f} MB\n"
        f"Espacio disponible: {avail_mb:.1f} MB"
    )
    return send_sms(req.to, message)


@router.post("/sms/product-created")
def send_product_created(req: ProductCreatedRequest):
    message = (
        f"NEXSTORE Admin - Nuevo producto publicado!\n"
        f"Nombre: {req.product_name}\n"
        f"Precio: ${req.price:,.0f} CLP\n"
        f"Stock: {req.stock} unidades\n"
        f"Publicado por: {req.admin_name}"
    )
    return send_sms(req.to, message)


@router.post("/sms/purchase")
def send_purchase_whatsapp(req: PurchaseWhatsappRequest):
    lines = "\n".join(
        f"  - {i['name']} x{i['quantity']} = ${i['price']:,.0f}"
        for i in req.items
    )
    message = (
        f"NEXSTORE - Compra confirmada!\n"
        f"Hola {req.name}, tu pedido #{req.order_id} fue aprobado.\n"
        f"Fecha: {req.date}\n"
        f"Productos:\n{lines}\n"
        f"Total: ${req.total:,.0f} CLP\n"
        f"Gracias por tu compra."
    )
    return send_sms(req.to, message)
