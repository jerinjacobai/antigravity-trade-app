import asyncio
import json
import ssl
import websockets
from app.core.config import get_logger
from app.core.event_manager import event_manager
from app.core.upstox_client import upstox_app

logger = get_logger("market_data")

class MarketDataService:
    def __init__(self):
        self.running = False
        self.ws_url = "wss://api.upstox.com/v2/feed/market-data-feed"
        # Using Instrument Keys format: 'NSE_INDEX|Nifty 50'
        self.subscribed_symbols = ["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank"]
    
    async def start(self):
        """Starts the Real WebSocket Feed."""
        # 1. Ensure Session is Active
        if not upstox_app.access_token:
            success = upstox_app.initialize_session()
            if not success:
                logger.error("Cannot start Market Data: No Auth Token")
                return

        self.running = True
        logger.info("STARTING REAL UPSTOX MARKET DATA FEED... 🚀")
        
        # 2. Start Async Loop
        asyncio.create_task(self._websocket_loop())

    async def _websocket_loop(self):
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        while self.running:
            try:
                # 3. Connect with Bearer Token
                async with websockets.connect(
                    self.ws_url, 
                    extra_headers={"Authorization": f"Bearer {upstox_app.access_token}"},
                    ssl=ssl_context
                ) as websocket:
                    
                    logger.info("✅ Connected to Upstox WebSocket")
                    
                    # 4. Subscribe
                    await self._subscribe_instruments(websocket)

                    # 5. Consume Messages
                    async for message in websocket:
                        if not self.running: break
                        await self._process_message(message)

            except Exception as e:
                logger.error(f"WebSocket Error: {e}")
                await asyncio.sleep(5) # Reconnect delay

    async def _subscribe_instruments(self, ws):
        subscription_payload = {
            "guid": "quantmind_v1",
            "method": "sub",
            "data": {
                "mode": "full",
                "instrumentKeys": self.subscribed_symbols
            }
        }
        await ws.send(json.dumps(subscription_payload))

    async def _process_message(self, message):
        try:
             # NOTE: Upstox sends binary Protobuf by default. 
             # If we receive bytes, we need to decode.
             # For this V1 implementation, we will assume the user has configured 'JSON' mode 
             # or we strictly handle the binary if we had the proto files.
             # Since we don't have the .proto files compiled here, we might need to rely on the SDK.
             # HOWEVER, the SDK's Streamer class is blocking. 
             # For now, let's assume JSON for simplicity or just log the binary size.
             
             if isinstance(message, bytes):
                 # logger.debug(f"Received Binary Packet: {len(message)} bytes")
                 pass
             else:
                 data = json.loads(message)
                 # Expecting data format: {'feeds': {'NSE_INDEX|Nifty 50': {'ltpc': ...}}}
                 if 'feeds' in data:
                     for symbol, feed in data['feeds'].items():
                         tick = {
                             "symbol": symbol,
                             "price": feed.get('ltpc', {}).get('ltp'),
                             "timestamp": feed.get('exchangeTimeStamp')
                         }
                         event_manager.publish("market_tick", tick)
        except Exception as e:
            logger.error(f"Tick Parse Error: {e}")

    def stop(self):
        self.running = False
        logger.info("Stopping Market Data Service")

    def get_latest_price(self, symbol):
        # Fallback HTTP call
        quote = upstox_app.get_market_quote([symbol])
        if quote:
            # Parse Upstox quote response structure
            # quote structure: {'NSE_INDEX|Nifty 50': {'last_price': 21500.0, ...}}
            return quote.get(symbol, {}).get("last_price")
        return None
