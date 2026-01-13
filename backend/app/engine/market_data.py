import asyncio
import json
import ssl
import websockets
import random
from datetime import datetime
from typing import Optional, Dict

from app.core.config import get_logger
from app.core.event_manager import event_manager
from app.core.upstox_client import upstox_app
from app.engine.algo_state_manager import algo_state_manager

logger = get_logger("market_data")

# ==========================================
# 1. Base Adapter Interface
# ==========================================
class MarketDataAdapter:
    async def start(self):
        raise NotImplementedError
    
    async def stop(self):
        raise NotImplementedError
        
    async def get_ltp(self, symbol: str) -> Optional[float]:
        raise NotImplementedError

# ==========================================
# 2. Broker Adapter (Upstox WebSocket)
# ==========================================
class BrokerDataAdapter(MarketDataAdapter):
    def __init__(self):
        self.running = False
        self.ws_url = "wss://api.upstox.com/v2/feed/market-data-feed"
        self.subscribed_symbols = ["NSE_INDEX|Nifty 50", "BSE_INDEX|SENSEX"]
        self.latest_prices: Dict[str, float] = {}

    async def start(self):
        # Ensure Session
        if not upstox_app.access_token:
            logger.error("🚫 Broker Adapter: No Access Token")
            return

        self.running = True
        logger.info("🔌 Broker Adapter: Connecting to Upstox WebSocket...")
        asyncio.create_task(self._websocket_loop())

    async def _websocket_loop(self):
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        while self.running:
            try:
                async with websockets.connect(
                    self.ws_url, 
                    extra_headers={"Authorization": f"Bearer {upstox_app.access_token}"},
                    ssl=ssl_context
                ) as websocket:
                    logger.info("✅ Broker Adapter: Connected")
                    await self._subscribe_instruments(websocket)

                    async for message in websocket:
                        if not self.running: break
                        await self._process_message(message)

            except Exception as e:
                logger.error(f"Broker WS Error: {e}")
                await asyncio.sleep(5)

    async def _subscribe_instruments(self, ws):
        payload = {
            "guid": "quantmind_v1",
            "method": "sub",
            "data": { "mode": "full", "instrumentKeys": self.subscribed_symbols }
        }
        await ws.send(json.dumps(payload))

    async def _process_message(self, message):
        try:
            if isinstance(message, bytes): return # Skip binary for V1
            data = json.loads(message)
            if 'feeds' in data:
                for symbol, feed in data['feeds'].items():
                    price = feed.get('ltpc', {}).get('ltp')
                    if price:
                        self.latest_prices[symbol] = price
                        # Broadcast
                        event_manager.publish("market_tick", {
                            "symbol": symbol,
                            "price": price,
                            "timestamp": feed.get('exchangeTimeStamp'),
                            "source": "BROKER"
                        })
        except Exception:
            pass

    async def stop(self):
        self.running = False

    async def get_ltp(self, symbol: str) -> Optional[float]:
        return self.latest_prices.get(symbol) or await self._fetch_snapshot(symbol)

    async def _fetch_snapshot(self, symbol: str):
        # Fallback HTTP call
        quote = upstox_app.get_market_quote([symbol])
        if quote:
            return quote.get(symbol, {}).get("last_price")
        return None

# ==========================================
# 3. Public Adapter (Mock / Indicative)
# ==========================================
class PublicDataAdapter(MarketDataAdapter):
    def __init__(self):
        self.running = False
        self.latest_prices = {
            "NSE_INDEX|Nifty 50": 21500.00,
            "BSE_INDEX|SENSEX": 71500.00
        }
    
    async def start(self):
        self.running = True
        logger.info("🌍 Public Adapter: Starting Mock Feed...")
        asyncio.create_task(self._mock_loop())

    async def _mock_loop(self):
        while self.running:
            # Random Walk Logic
            for symbol in self.latest_prices:
                change = random.uniform(-5, 5)
                self.latest_prices[symbol] += change
                
                event_manager.publish("market_tick", {
                    "symbol": symbol,
                    "price": self.latest_prices[symbol],
                    "timestamp": datetime.now().timestamp() * 1000,
                    "source": "PUBLIC"
                })
            
            await asyncio.sleep(1) # 1 Tick per second

    async def stop(self):
        self.running = False

    async def get_ltp(self, symbol: str) -> Optional[float]:
        return self.latest_prices.get(symbol)

# ==========================================
# 4. Market Data Service (Router)
# ==========================================
class MarketDataService:
    def __init__(self):
        self.broker_adapter = BrokerDataAdapter()
        self.public_adapter = PublicDataAdapter()
        self.active_adapter = self.public_adapter # Default
        self.running_task = None
        self._check_routing()

    def _check_routing(self):
        """
        Determines which adapter should be active.
        """
        mode = algo_state_manager.get_mode()
        has_token = bool(upstox_app.access_token)
        
        previous_adapter = self.active_adapter
        
        # Routing Logic
        if mode == "live":
            self.active_adapter = self.broker_adapter
        elif mode == "paper":
            self.active_adapter = self.broker_adapter if has_token else self.public_adapter
        else:
            self.active_adapter = self.public_adapter

        if self.active_adapter != previous_adapter:
            logger.info(f"🔄 Market Data Switched: {type(previous_adapter).__name__} -> {type(self.active_adapter).__name__}")
            # In a full specific implementation, we might stop the old one and start the new one.
            # For V1, we simply rely on lazy start or ensure both are managed.
            # Let's ensure the active one is running.

    async def start(self):
        """
        Starts the service. We start BOTH adapters for simplicity in V1 
        so switching is instant, or we can manage state.
        Let's start both but only prioritize 'active_adapter' for get_ltp calls.
        """
        # Start Public (Always Available)
        await self.public_adapter.start()
        
        # Start Broker (If available)
        if upstox_app.access_token:
            await self.broker_adapter.start()
        
        # Periodic Routing Check
        asyncio.create_task(self._routing_monitor())

    async def _routing_monitor(self):
        while True:
            self._check_routing()
            
            # If broker adapter is active but not running, try to start it
            if self.active_adapter == self.broker_adapter and not self.broker_adapter.running:
                 await self.broker_adapter.start()
            
            await asyncio.sleep(5)

    async def get_ltp(self, symbol: str) -> Optional[float]:
        return await self.active_adapter.get_ltp(symbol)

    def stop(self):
        asyncio.create_task(self.public_adapter.stop())
        asyncio.create_task(self.broker_adapter.stop())

# Singleton
market_data_service = MarketDataService()
