import requests
from app.config.settings import settings


def log_event(event_type: str, user_email: str = "", description: str = "", ip_address: str = ""):
    try:
        requests.post(
            f"{settings.audit_service_url}/events/",
            json={
                "event_type": event_type,
                "user_email": user_email,
                "description": description,
                "ip_address": ip_address,
            },
            timeout=5,
        )
    except Exception as e:
        print(f"[AUDIT] No se pudo registrar evento '{event_type}': {e}")
