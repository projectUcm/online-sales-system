from fastapi import APIRouter, Request
from pydantic import BaseModel
from app.services.dynamo_service import put_event, list_events

router = APIRouter(prefix="/events", tags=["Audit"])


class EventCreate(BaseModel):
    event_type: str
    user_email: str = ""
    description: str = ""
    ip_address: str = ""


@router.post("/")
def create_event(data: EventCreate, request: Request):
    ip = data.ip_address or (request.client.host if request.client else "")
    item = put_event(data.event_type, data.user_email, data.description, ip)
    return item


@router.get("/")
def get_events(event_type: str = "", limit: int = 200):
    return list_events(event_type, limit)
