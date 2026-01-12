# backend/app/core/upstox_client.py
import os
import requests
import upstox_client
from upstox_client.rest import ApiException
from app.core.config import get_logger
from app.core.supabase_client import supabase

logger = get_logger("upstox_client")

class UpstoxClient:
    def __init__(self):
        self.api_key = None
        self.api_secret = None
        self.access_token = None
        self.configuration = upstox_client.Configuration()
        self.api_instance = None
        
    def _fetch_credentials(self):
        """Fetch API Key/Secret from Supabase user_credentials."""
        try:
             # Phase 3: Check user_credentials (legacy) or user_profiles (future)
             # For now, we still rely on the single user credentials concept for the Worker
             response = supabase.table("user_credentials").select("*").limit(1).execute()
             if response.data:
                 creds = response.data[0]
                 self.api_key = creds.get("upstox_api_key")
                 self.api_secret = creds.get("upstox_api_secret")
                 return True
        except Exception as e:
            logger.error(f"DB Creds Fetch Error: {e}")
        return False

    def _fetch_token_from_db(self):
        """Fetch the latest access token from user_profiles."""
        try:
             # Phase 3: Fetch from user_profiles
             # We look for a profile that has trading_enabled=True OR just the first one for MVP
             response = supabase.table("user_profiles").select("upstox_access_token").limit(1).execute()
             if response.data and response.data[0].get("upstox_access_token"):
                 return response.data[0]["upstox_access_token"]
                 
             # Fallback to daily_state (Phase 2 legacy)
             response = supabase.table("daily_state").select("upstox_token").eq("date", "now()").execute()
             if response.data and response.data[0].get("upstox_token"):
                 return response.data[0]["upstox_token"]
                 
        except Exception as e:
            logger.error(f"Failed to fetch Upstox token from DB: {e}")
        return None

    def initialize_session(self):
        """Initialize the Upstox API session using DB creds and token."""
        # 1. Get Credentials
        if not self.api_key:
            if not self._fetch_credentials():
                 logger.error("No API Credentials found in DB.")
                 return False

        # 2. Get Token
        token = self._fetch_token_from_db()
        if not token:
            logger.warning("No Upstox Token found in DB. Trading functionality disabled.")
            return False

        self.access_token = token
        self.configuration.access_token = token
        
        # Initialize API instances
        self.api_instance = upstox_client.OrderApi(upstox_client.ApiClient(self.configuration))
        self.market_quote_api = upstox_client.MarketQuoteApi(upstox_client.ApiClient(self.configuration))
        
        logger.info("✅ Upstox Session Initialized Successfully")
        return True

    def get_market_quote(self, symbol_list: list, mode="ltp"):
        """Fetch LTP or Full Quote for instruments."""
        try:
             # Example: symbol_list = ["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank"]
             api_response = self.market_quote_api.ltp(symbol_list, "2.0")
             return api_response.data
        except ApiException as e:
            logger.error(f"Upstox Quote Error: {e}")
            return None

# Singleton Instance
upstox_app = UpstoxClient()
