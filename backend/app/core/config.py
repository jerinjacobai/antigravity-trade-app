import os
import logging
from logging.handlers import RotatingFileHandler
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "QuantMind Trader"
    ENV: str = "dev"
    UPSTOX_API_KEY: str = ""
    UPSTOX_API_SECRET: str = ""
    UPSTOX_REDIRECT_URI: str = "http://localhost:8000/callback"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()

# Setup Logger
logger = logging.getLogger("quantmind_trader")
logger.setLevel(settings.LOG_LEVEL)

# Console Handler
c_handler = logging.StreamHandler()
c_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(c_handler)

# File Handler
if not os.path.exists("logs"):
    os.makedirs("logs")
f_handler = RotatingFileHandler("logs/app.log", maxBytes=5*1024*1024, backupCount=5)
f_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(f_handler)

def get_logger(name: str):
    return logging.getLogger(f"quantmind_trader.{name}")
