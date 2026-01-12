import os
from supabase import create_client, Client
from app.core.config import get_logger

logger = get_logger("supabase_client")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase Client Initialized")
    else:
        logger.warning("Supabase credentials missing. Client not initialized.")
        supabase = None
except Exception as e:
    logger.error(f"Failed to init Supabase: {e}")
    supabase = None
