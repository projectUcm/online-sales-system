from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mercadopago_access_token: str = ""
    mercadopago_public_key: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
