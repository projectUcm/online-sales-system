import boto3
from app.config.settings import settings


def send_sms(to: str, message: str):
    if settings.twilio_account_sid:
        return _twilio(to, message)
    if settings.aws_access_key_id:
        return _sns(to, message)
    print(f"[SMS MOCK] To:{to} | {message}")
    return {"sent": True, "mock": True}


def _sns(to: str, message: str):
    try:
        client = boto3.client(
            "sns",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
        client.publish(PhoneNumber=to, Message=message)
        return {"sent": True}
    except Exception as e:
        print(f"[SNS ERROR] {e}")
        return {"sent": False, "error": str(e)}


def _twilio(to: str, message: str):
    try:
        from twilio.rest import Client
        Client(settings.twilio_account_sid, settings.twilio_auth_token).messages.create(
            body=message, from_=settings.twilio_from_number, to=to
        )
        return {"sent": True}
    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
        return {"sent": False, "error": str(e)}
