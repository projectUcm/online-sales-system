from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./sales.db"
    secret_key: str = "change-me-in-production"
    payment_service_url: str = "http://online-sales-alb-667999176.us-east-1.elb.amazonaws.com/payment/pay"
    notification_service_url: str = "http://localhost:8002"

    # AWS (solo para S3)
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    # SMTP email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Twilio for SMS
    sns_topic_arn: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    # Amazon S3
    s3_bucket_name: str = "nexstore-user-files"
    s3_storage_limit_bytes: int = 2 * 1024 * 1024 * 1024  # 2 GB

    model_config = {"env_file": ".env"}


settings = Settings()
