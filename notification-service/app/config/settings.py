from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # SMTP email
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""

    # Twilio SMS/WhatsApp
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
