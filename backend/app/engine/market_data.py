import asyncio
import json
import random
from app.core.config import get_logger, settings
from app.core.event_manager import EventManager

logger = get_logger("market_data")

class MarketDataService:
    def __init__(self):
        self.connected = False
        self._stop_event = asyncio.Event()

    async def connect(self):
        """
        Connects to Upstox WebSocket (or starts simulation).
        """
        self.connected = True
        logger.info("Market Data Service Connected")
        # In a real app, we would initialize the Upstox WebSocket client here.
        # For this v1/demo, we'll start a simulation loop.
        asyncio.create_task(self._simulate_ticks())

    async def _simulate_ticks(self):
        """
        Simulates incoming tick data for NIFTY/BANKNIFTY and Options.
        """
        logger.info("Starting Market Data Simulation...")
        indices = ["NIFTY 50", "NIFTY BANK"]
        while self.connected:
            tick = {
                "timestamp": datetime.now().isoformat(),
                "symbol": random.choice(indices),
                "ltp": 22000 + random.uniform(-50, 50), # Mock NIFTY Price
                "volume": random.randint(1000, 5000)
            }
            await EventManager.publish("market_tick", tick)
            await asyncio.sleep(1) # 1 tick per second

    async def disconnect(self):
        self.connected = False
        logger.info("Market Data Service Disconnected")

market_data_service = MarketDataService()
