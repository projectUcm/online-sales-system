from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    audit_table_name: str = "audit_events"

    model_config = {"env_file": ".env"}


settings = Settings()
