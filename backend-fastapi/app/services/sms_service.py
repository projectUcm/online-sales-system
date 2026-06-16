import boto3
from app.config.settings import settings


def send_file_upload_sms(phone_number: str, filename: str, upload_date: str, used_bytes: int, available_bytes: int):
    used_mb = used_bytes / (1024 * 1024)
    available_mb = available_bytes / (1024 * 1024)
    message = (
        f"NEXSTORE - Archivo subido: {filename}\n"
        f"Fecha: {upload_date}\n"
        f"Espacio usado: {used_mb:.1f} MB\n"
        f"Espacio disponible: {available_mb:.1f} MB"
    )
    _send_sms(phone_number, message)


def _send_sms(phone_number: str, message: str):
    if settings.twilio_account_sid:
        _send_via_twilio(phone_number, message)
    elif settings.sns_topic_arn or settings.aws_access_key_id:
        _send_via_sns(phone_number, message)
    else:
        print(f"[SMS MOCK] To: {phone_number} | {message}")


def _send_via_sns(phone_number: str, message: str):
    try:
        client = boto3.client(
            "sns",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
        client.publish(PhoneNumber=phone_number, Message=message)
    except Exception as e:
        print(f"[SNS ERROR] {e}")


def _whatsapp_number(number: str) -> str:
    n = number.strip()
    if n.startswith("whatsapp:"):
        return n
    if not n.startswith("+"):
        n = "+" + n
    return f"whatsapp:{n}"


def _send_via_twilio(phone_number: str, message: str):
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=message,
            from_=_whatsapp_number(settings.twilio_from_number),
            to=_whatsapp_number(phone_number),
        )
    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
