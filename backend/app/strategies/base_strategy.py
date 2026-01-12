from abc import ABC, abstractmethod
from app.core.config import get_logger
from app.engine.order_manager import order_manager

logger = get_logger("base_strategy")

class BaseStrategy(ABC):
    def __init__(self, name: str):
        self.name = name
        self.active = False
        self.positions = {}

    def start(self):
        self.active = True
        logger.info(f"Strategy {self.name} STARTED")

    def stop(self):
        self.active = False
        logger.info(f"Strategy {self.name} STOPPED")

    @abstractmethod
    async def on_tick(self, tick_data: dict):
        """
        Callback for every market data tick used to generate signals.
        """
        pass

    async def entry_order(self, symbol: str, side: str, quantity: int):
        if not self.active:
            return
        
        logger.info(f"Strategy {self.name} generating {side} signal for {symbol}")
        order_id = await order_manager.place_order(symbol, quantity, side)
        if order_id:
            logger.info(f"Strategy {self.name} entered trade: {order_id}")
