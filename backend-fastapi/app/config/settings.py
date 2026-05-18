from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./sales.db"
    secret_key: str = "change-me-in-production"
    payment_service_url: str = "http://online-sales-alb-667999176.us-east-1.elb.amazonaws.com/pay"

    model_config = {"env_file": ".env"}


settings = Settings()
