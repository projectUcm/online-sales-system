import boto3
from botocore.exceptions import ClientError
from app.config.settings import settings


def _get_ses_client():
    return boto3.client(
        "ses",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def send_verification_email(to_email: str, name: str, code: str):
    subject = "Valida tu cuenta en NEXSTORE"
    body_html = f"""
    <html><body>
    <h2>Bienvenido a NEXSTORE, {name}!</h2>
    <p>Tu código de verificación es:</p>
    <h1 style="letter-spacing:8px; color:#2563eb;">{code}</h1>
    <p>Ingresa este código en la plataforma para activar tu cuenta.</p>
    <p>El código expira en 24 horas.</p>
    </body></html>
    """
    _send_email(to_email, subject, body_html)


def send_purchase_email(to_email: str, name: str, order_id: str, date: str, items: list, total: float):
    items_html = "".join(
        f"<tr><td>{i['name']}</td><td>{i['quantity']}</td><td>${i['price']:,.0f}</td></tr>"
        for i in items
    )
    subject = f"Confirmación de compra #{order_id} - NEXSTORE"
    body_html = f"""
    <html><body>
    <h2>Gracias por tu compra, {name}!</h2>
    <p><strong>Número de compra:</strong> {order_id}</p>
    <p><strong>Fecha:</strong> {date}</p>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr></thead>
      <tbody>{items_html}</tbody>
    </table>
    <h3>Total pagado: ${total:,.0f}</h3>
    </body></html>
    """
    _send_email(to_email, subject, body_html)


def send_payment_email(to_email: str, transaction_id: str, status: str, date: str, amount: float, summary: str):
    subject = f"Confirmación de pago - NEXSTORE"
    body_html = f"""
    <html><body>
    <h2>Detalle de pago - NEXSTORE</h2>
    <p><strong>ID Transacción:</strong> {transaction_id}</p>
    <p><strong>Estado:</strong> {status}</p>
    <p><strong>Fecha:</strong> {date}</p>
    <p><strong>Monto pagado:</strong> ${amount:,.0f}</p>
    <p><strong>Resumen:</strong> {summary}</p>
    </body></html>
    """
    _send_email(to_email, subject, body_html)


def _send_email(to_email: str, subject: str, body_html: str):
    if not settings.aws_access_key_id:
        print(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        return
    try:
        client = _get_ses_client()
        client.send_email(
            Source=settings.ses_sender_email,
            Destination={"ToAddresses": [to_email]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": body_html, "Charset": "UTF-8"}},
            },
        )
    except ClientError as e:
        print(f"[SES ERROR] {e.response['Error']['Message']}")
