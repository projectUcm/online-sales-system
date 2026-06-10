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


def upload_file(user_id: int, filename: str, file_bytes: bytes, content_type: str = "application/octet-stream") -> dict:
    key = f"user-{user_id}/{filename}"
    try:
        client = _get_s3_client()
        client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
        return {"success": True, "key": key, "size": len(file_bytes)}
    except Exception as e:
        return {"success": False, "error": str(e)}


def list_user_files(user_id: int) -> list:
    prefix = f"user-{user_id}/"
    try:
        client = _get_s3_client()
        response = client.list_objects_v2(Bucket=settings.s3_bucket_name, Prefix=prefix)
        files = []
        for obj in response.get("Contents", []):
            name = obj["Key"].replace(prefix, "")
            if name:
                files.append({
                    "name": name,
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                    "key": obj["Key"],
                })
        return files
    except Exception as e:
        print(f"[S3 ERROR] list_user_files: {e}")
        return []


def get_user_storage_usage(user_id: int) -> int:
    return sum(f["size"] for f in list_user_files(user_id))


def delete_file(user_id: int, filename: str) -> bool:
    key = f"user-{user_id}/{filename}"
    try:
        _get_s3_client().delete_object(Bucket=settings.s3_bucket_name, Key=key)
        return True
    except Exception as e:
        print(f"[S3 ERROR] delete_file: {e}")
        return False


def get_presigned_url(user_id: int, filename: str, expiration: int = 3600) -> str:
    key = f"user-{user_id}/{filename}"
    try:
        url = _get_s3_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key},
            ExpiresIn=expiration,
        )
        return url
    except Exception as e:
        print(f"[S3 ERROR] presigned_url: {e}")
        return ""
