import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config.settings import settings


def send_verification_email(to_email: str, name: str, code: str):
    subject = "Valida tu cuenta en NEXSTORE"
    body = f"""
    <html><body>
    <h2>Bienvenido a NEXSTORE, {name}!</h2>
    <p>Tu código de verificación es:</p>
    <h1 style="letter-spacing:8px; color:#2563eb;">{code}</h1>
    <p>Ingresa este código en la plataforma para activar tu cuenta.</p>
    <p>El código expira en 24 horas.</p>
    </body></html>
    """
    _send(to_email, subject, body)


def send_purchase_email(to_email: str, name: str, order_id: str, date: str, items: list, total: float):
    rows = "".join(
        f"<tr><td>{i['name']}</td><td>{i['quantity']}</td><td>${i['price']:,.0f}</td></tr>"
        for i in items
    )
    subject = f"Confirmación de compra #{order_id} - NEXSTORE"
    body = f"""
    <html><body>
    <h2>Gracias por tu compra, {name}!</h2>
    <p><strong>Número de compra:</strong> {order_id}</p>
    <p><strong>Fecha:</strong> {date}</p>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <thead><tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
    <h3>Total pagado: ${total:,.0f}</h3>
    </body></html>
    """
    _send(to_email, subject, body)


def send_payment_email(to_email: str, transaction_id: str, status: str, date: str, amount: float, summary: str):
    subject = "Confirmación de pago - NEXSTORE"
    body = f"""
    <html><body>
    <h2>Detalle de pago - NEXSTORE</h2>
    <p><strong>ID Transacción:</strong> {transaction_id}</p>
    <p><strong>Estado:</strong> {status}</p>
    <p><strong>Fecha:</strong> {date}</p>
    <p><strong>Monto pagado:</strong> ${amount:,.0f}</p>
    <p><strong>Resumen:</strong> {summary}</p>
    </body></html>
    """
    _send(to_email, subject, body)


def _send(to: str, subject: str, body_html: str):
    if not settings.smtp_user or not settings.smtp_password:
        print(f"[EMAIL MOCK] To: {to} | Subject: {subject}")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg.attach(MIMEText(body_html, "html", "utf-8"))

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to, msg.as_string())
    except Exception as e:
        print(f"[SMTP ERROR] {e}")
