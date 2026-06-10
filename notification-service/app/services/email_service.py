import boto3
from botocore.exceptions import ClientError
from app.config.settings import settings


def _get_ses():
    return boto3.client(
        "ses",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def send_email(to: str, subject: str, body_html: str):
    if not settings.aws_access_key_id:
        print(f"[EMAIL MOCK] To:{to} | {subject}")
        return {"sent": True, "mock": True}
    try:
        _get_ses().send_email(
            Source=settings.ses_sender_email,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {"Html": {"Data": body_html, "Charset": "UTF-8"}},
            },
        )
        return {"sent": True}
    except ClientError as e:
        msg = e.response["Error"]["Message"]
        print(f"[SES ERROR] {msg}")
        return {"sent": False, "error": msg}
