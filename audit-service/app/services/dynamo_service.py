import uuid
from datetime import datetime, timezone
import boto3
from botocore.exceptions import ClientError
from app.config.settings import settings

_EVENT_GSI = "by_event_type"
_TIME_GSI = "by_time"


def _get_resource():
    return boto3.resource(
        "dynamodb",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def ensure_table_exists():
    if not settings.aws_access_key_id:
        return
    client = boto3.client(
        "dynamodb",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )
    try:
        client.describe_table(TableName=settings.audit_table_name)
        return
    except ClientError as e:
        if e.response["Error"]["Code"] != "ResourceNotFoundException":
            print(f"[DYNAMO] describe_table error: {e}")
            return
    try:
        client.create_table(
            TableName=settings.audit_table_name,
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
                {"AttributeName": "event_type", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"},
                {"AttributeName": "gsi_pk", "AttributeType": "S"},
            ],
            KeySchema=[{"AttributeName": "id", "KeyType": "HASH"}],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": _EVENT_GSI,
                    "KeySchema": [
                        {"AttributeName": "event_type", "KeyType": "HASH"},
                        {"AttributeName": "created_at", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": _TIME_GSI,
                    "KeySchema": [
                        {"AttributeName": "gsi_pk", "KeyType": "HASH"},
                        {"AttributeName": "created_at", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        client.get_waiter("table_exists").wait(TableName=settings.audit_table_name)
        print(f"[DYNAMO] Tabla {settings.audit_table_name} creada")
    except Exception as e:
        print(f"[DYNAMO] ensure_table_exists: {e}")


def put_event(event_type: str, user_email: str, description: str, ip_address: str = "") -> dict:
    table = _get_resource().Table(settings.audit_table_name)
    item = {
        "id": str(uuid.uuid4()),
        "gsi_pk": "EVENT",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "event_type": event_type,
        "user_email": user_email or "",
        "description": description or "",
        "ip_address": ip_address or "",
    }
    table.put_item(Item=item)
    return item


def list_events(event_type: str = "", limit: int = 200) -> list:
    table = _get_resource().Table(settings.audit_table_name)
    try:
        if event_type:
            resp = table.query(
                IndexName=_EVENT_GSI,
                KeyConditionExpression="event_type = :t",
                ExpressionAttributeValues={":t": event_type},
                ScanIndexForward=False,
                Limit=limit,
            )
        else:
            resp = table.query(
                IndexName=_TIME_GSI,
                KeyConditionExpression="gsi_pk = :p",
                ExpressionAttributeValues={":p": "EVENT"},
                ScanIndexForward=False,
                Limit=limit,
            )
        return resp.get("Items", [])
    except Exception as e:
        print(f"[DYNAMO] list_events: {e}")
        return []
