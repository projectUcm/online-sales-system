import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config.settings import settings


def send_email(to: str, subject: str, body_html: str) -> dict:
    if not settings.smtp_user or not settings.smtp_password:
        print(f"[EMAIL MOCK] To:{to} | {subject}")
        return {"sent": True, "mock": True}
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
        return {"sent": True}
    except Exception as e:
        print(f"[SMTP ERROR] {e}")
        return {"sent": False, "error": str(e)}
