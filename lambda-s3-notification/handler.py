import os
import urllib.parse
from datetime import datetime, timezone

import boto3
from twilio.rest import Client as TwilioClient

STORAGE_LIMIT = 2 * 1024 * 1024 * 1024  # 2 GB


def _wa(number: str) -> str:
    n = number.strip()
    if n.startswith("whatsapp:"):
        return n
    if not n.startswith("+"):
        n = "+" + n
    return f"whatsapp:{n}"


def lambda_handler(event, context):
    for record in event.get("Records", []):
        if record.get("eventSource") != "aws:s3":
            continue

        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])
        file_size = record["s3"]["object"].get("size", 0)

        parts = key.split("/", 1)
        if len(parts) < 2 or not parts[0].startswith("user-"):
            continue

        filename = parts[1]

        s3_client = boto3.client("s3")
        try:
            head = s3_client.head_object(Bucket=bucket, Key=key)
            metadata = head.get("Metadata", {})
            phone = metadata.get("user-phone", "")
            storage_used = int(metadata.get("storage-used", str(file_size)))
        except Exception as e:
            print(f"[LAMBDA] head_object error: {e}")
            continue

        if not phone:
            print(f"[LAMBDA] Sin telefono en metadata para {key}, omitiendo")
            continue

        available = max(0, STORAGE_LIMIT - storage_used)
        upload_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        used_mb = round(storage_used / (1024 * 1024), 2)
        available_gb = round(available / (1024 * 1024 * 1024), 2)

        message = (
            f"Archivo subido exitosamente\n"
            f"Nombre: {filename}\n"
            f"Fecha: {upload_date}\n"
            f"Espacio usado: {used_mb} MB\n"
            f"Espacio disponible: {available_gb} GB"
        )

        account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        from_number = os.environ.get("TWILIO_FROM_NUMBER", "")

        if not (account_sid and auth_token and from_number):
            print("[LAMBDA] Credenciales Twilio incompletas")
            continue

        try:
            client = TwilioClient(account_sid, auth_token)
            client.messages.create(body=message, from_=_wa(from_number), to=_wa(phone))
            print(f"[LAMBDA] WhatsApp enviado a {phone} por archivo {filename}")
        except Exception as e:
            print(f"[LAMBDA] Error Twilio: {e}")
