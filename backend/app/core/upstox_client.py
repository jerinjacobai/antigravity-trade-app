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
             # Get the most recently updated profile (likely the one who just logged in)
             response = supabase.table("user_profiles").select("upstox_access_token")\
                 .order("updated_at", desc=True)\
                 .limit(1).execute()
             
             logger.info(f"DEBUG: Token Query Result: {len(response.data) if response.data else 0} records")
             if response.data:
                 logger.info(f"DEBUG: First Record Token Length: {len(response.data[0].get('upstox_access_token') or '')}")
             
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
        
        logger.info("Upstox Session Initialized Successfully")
        return True

    def get_market_quote(self, symbol_list: list, mode="ltp"):
        """Fetch LTP or Full Quote for instruments."""
        try:
             # Example: symbol_list = ["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank"]
             if isinstance(symbol_list, list):
                 symbol_list = ",".join(symbol_list)
             
             logger.info(f"Fetching Quote for: {symbol_list}")
             api_response = self.market_quote_api.ltp(symbol_list, "2.0")
             return api_response.data
        except ApiException as e:
            logger.error(f"Upstox Quote Error: {e}")
            return None

    def fetch_order_book(self):
        """Fetch today's order book from Upstox."""
        if not self.api_instance: return None
        try:
            return self.api_instance.get_order_book("2.0")
        except ApiException as e:
            logger.error(f"Upstox OrderBook Error: {e}")
            return None

    def get_authorized_websocket_uri(self):
        """Fetch authorized WebSocket URI for Market Data Feed."""
        if not self.access_token: return None
        try:
            url = "https://api.upstox.com/v3/feed/market-data-feed/authorize"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Accept": "application/json"
            }
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return data.get("data", {}).get("authorizedRedirectUri")
            
            logger.error(f"Failed to authorize WebSocket: {response.text}")
            return None
        except Exception as e:
            logger.error(f"WebSocket Authorization Error: {e}")
            return None

    def search_instrument(self, query):
        """Search for an instrument by name."""
        if not self.access_token: return None
        try:
            url = "https://api.upstox.com/v2/market/search/instrument"
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Accept": "application/json"
            }
            # Search in NSE_FO for options, or generic
            response = requests.get(url, params={"q": query}, headers=headers)
            if response.status_code == 200:
                data = response.json().get("data", [])
                if data:
                    # Prefer NSE_FO if available
                    for item in data:
                        if item.get("segment") == "NSE_FO":
                             return item
                    return data[0]
            else:
                 logger.error(f"Search API Error: {response.text}")
            return None
        except Exception as e:
            logger.error(f"Search Instrument Error: {e}")
            return None

# Singleton Instance
upstox_app = UpstoxClient()
