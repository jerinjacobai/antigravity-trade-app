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
# ==========================================
# 2. Broker Adapter (Upstox SDK Streamer)
# ==========================================
from upstox_client.feeder.market_data_streamer_v3 import MarketDataStreamerV3

class BrokerDataAdapter(MarketDataAdapter):
    def __init__(self):
        self.streamer = None
        self.subscribed_symbols = ["NSE_INDEX|Nifty 50", "BSE_INDEX|SENSEX"]
        self.latest_prices: Dict[str, float] = {}
        self.running = False

    async def start(self):
        if not upstox_app.access_token:
            logger.error("Broker Adapter: No Access Token")
            return

        logger.info("Broker Adapter: Starting SDK Streamer...")
        # Capture the main loop
        self.loop = asyncio.get_running_loop()

        # Initialize Streamer
        self.streamer = MarketDataStreamerV3(
            api_client=upstox_app.api_instance.api_client,
            instrumentKeys=self.subscribed_symbols,
            mode="full"
        )
        
        # Register Callbacks
        self.streamer.on("open", self.on_open)
        self.streamer.on("message", self.on_message)
        self.streamer.on("error", self.on_error)
        
        # Connect (runs in background thread)
        self.streamer.connect()
        self.running = True

    def on_open(self, *args):
        logger.info("Broker Adapter: SDK Streamer Connected")
        self.running = True

    def on_error(self, error, *args):
        logger.error(f"Broker Adapter Error: {error}")

    def on_message(self, data):
        # Bridge to Async Loop
        try:
             # data is a dict (decoded from protobuf)
             if "feeds" in data:
                 for symbol, feed in data["feeds"].items():
                     # Handle V3 Structure: feed -> fullFeed -> (indexFF|marketFF) -> ltpc -> ltp
                     ltpc = feed.get("ltpc")
                     
                     if not ltpc:
                         # Check deep structure for Full Mode
                         full_feed = feed.get("fullFeed", {})
                         ltpc = full_feed.get("indexFF", {}).get("ltpc") or \
                                full_feed.get("marketFF", {}).get("ltpc")
                                
                     if ltpc and "ltp" in ltpc:
                         price = ltpc.get("ltp")
                         self.latest_prices[symbol] = price
                         
                         event_payload = {
                            "symbol": symbol,
                            "price": price,
                            "timestamp": int(feed.get("exchangeTimeStamp") or datetime.now().timestamp() * 1000),
                            "source": "BROKER"
                         }
                         logger.info(f"RX BROKER: {symbol} @ {price} ({event_payload['timestamp']})")
                         
                         self._schedule_publish(event_payload)
        except Exception as e:
            logger.error(f"Message Processing Error: {e}")

    def _schedule_publish(self, payload):
        # Use captured loop
        if self.loop and self.loop.is_running():
             asyncio.run_coroutine_threadsafe(
                 event_manager.publish("market_tick", payload), 
                 self.loop
             )

    async def stop(self):
        if self.streamer:
            # self.streamer.disconnect() # API might not have disconnect exposed cleanly?
            # It has close handler.
            pass

    async def get_ltp(self, symbol: str) -> Optional[float]:
        return self.latest_prices.get(symbol) or await self._fetch_snapshot(symbol)

    async def _fetch_snapshot(self, symbol: str):
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
        logger.info("Public Adapter: Starting Mock Feed...")
        asyncio.create_task(self._mock_loop())

    async def _mock_loop(self):
        while self.running:
            # Random Walk Logic
            for symbol in self.latest_prices:
                change = random.uniform(-5, 5)
                self.latest_prices[symbol] += change
                
                await event_manager.publish("market_tick", {
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
        # self._check_routing() - Moved to start() to avoid async loop issues

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

        if self.active_adapter == self.broker_adapter:
            logger.info("Switching to BROKER mode. Stopping Public Adapter.")
            asyncio.create_task(self.public_adapter.stop())
        elif self.active_adapter == self.public_adapter:
            if not self.public_adapter.running:
                 logger.info("Switching to PUBLIC mode. Starting Public Adapter.")
                 asyncio.create_task(self.public_adapter.start())

        if self.active_adapter != previous_adapter:
            logger.info(f"Market Data Switched: {type(previous_adapter).__name__} -> {type(self.active_adapter).__name__}")

    async def start(self):
        """
        Starts the service. We start BOTH adapters for simplicity in V1 
        so switching is instant, or we can manage state.
        Let's start both but only prioritize 'active_adapter' for get_ltp calls.
        """
        # Initial Check
        self._check_routing()

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
