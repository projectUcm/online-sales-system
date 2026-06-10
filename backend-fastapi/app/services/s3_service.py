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
            key = obj["Key"]
            name = key.replace(prefix, "")
            if name:
                files.append({
                    "name": name,
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                    "key": key,
                })
        return files
    except Exception as e:
        print(f"[S3 ERROR] list_user_files: {e}")
        return []


def get_user_storage_usage(user_id: int) -> int:
    files = list_user_files(user_id)
    return sum(f["size"] for f in files)


def delete_file(user_id: int, filename: str) -> bool:
    key = f"user-{user_id}/{filename}"
    try:
        client = _get_s3_client()
        client.delete_object(Bucket=settings.s3_bucket_name, Key=key)
        return True
    except Exception as e:
        print(f"[S3 ERROR] delete_file: {e}")
        return False


def get_presigned_url(user_id: int, filename: str, expiration: int = 3600) -> str:
    key = f"user-{user_id}/{filename}"
    try:
        client = _get_s3_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket_name, "Key": key},
            ExpiresIn=expiration,
        )
        return url
    except Exception as e:
        print(f"[S3 ERROR] presigned_url: {e}")
        return ""
