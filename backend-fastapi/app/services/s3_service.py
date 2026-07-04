import uuid
import boto3
from botocore.exceptions import ClientError
from app.config.settings import settings


def _get_s3_client():
    return boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id or None,
        aws_secret_access_key=settings.aws_secret_access_key or None,
    )


def ensure_bucket_exists():
    if not settings.aws_access_key_id:
        return
    try:
        client = _get_s3_client()
        try:
            client.head_bucket(Bucket=settings.s3_bucket_name)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                if settings.aws_region == "us-east-1":
                    client.create_bucket(Bucket=settings.s3_bucket_name)
                else:
                    client.create_bucket(
                        Bucket=settings.s3_bucket_name,
                        CreateBucketConfiguration={"LocationConstraint": settings.aws_region},
                    )
                client.put_bucket_cors(
                    Bucket=settings.s3_bucket_name,
                    CORSConfiguration={
                        "CORSRules": [{
                            "AllowedHeaders": ["*"],
                            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                            "AllowedOrigins": ["*"],
                            "MaxAgeSeconds": 3000,
                        }]
                    },
                )
                print(f"[S3] Bucket {settings.s3_bucket_name} creado")
    except Exception as e:
        print(f"[S3] ensure_bucket_exists: {e}")


def _user_prefix(user_id: int) -> str:
    return f"reviews/user-{user_id}/"


def upload_review_photo(product_id: int, user_id: int, filename: str, file_bytes: bytes, content_type: str = "") -> str:
    key = f"{_user_prefix(user_id)}{product_id}-{uuid.uuid4().hex}-{filename}"
    client = _get_s3_client()
    client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=file_bytes,
        ContentType=content_type or "application/octet-stream",
    )
    return key


def get_review_photo_url(key: str, expiration: int = 86400) -> str:
    try:
        return _get_s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key},
            ExpiresIn=expiration,
        )
    except Exception as e:
        print(f"[S3 ERROR] get_review_photo_url: {e}")
        return ""


def get_user_review_storage_usage(user_id: int) -> int:
    """Bytes used by a user's review photos, for the per-user S3 storage quota."""
    if not settings.aws_access_key_id:
        return 0
    try:
        client = _get_s3_client()
        prefix = _user_prefix(user_id)
        total = 0
        continuation = {}
        while True:
            resp = client.list_objects_v2(Bucket=settings.s3_bucket_name, Prefix=prefix, **continuation)
            total += sum(obj["Size"] for obj in resp.get("Contents", []))
            if not resp.get("IsTruncated"):
                break
            continuation = {"ContinuationToken": resp["NextContinuationToken"]}
        return total
    except Exception as e:
        print(f"[S3 ERROR] get_user_review_storage_usage: {e}")
        return 0
