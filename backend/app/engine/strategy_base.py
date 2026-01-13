from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import get_logger

logger = get_logger("strategy_base")

class BaseStrategy(ABC):
    """
    Abstract Base Class for all Trading Strategies (The Sandbox).
    Enforces strict structure and prevents strategies from mutating global state directly.
    """
    
    def __init__(self, user_id: str, algo_name: str, config: Dict[str, Any]):
        self.user_id = user_id
        self.algo_name = algo_name
        self.config = config
        self.is_running = False
        self.positions: Dict[str, Any] = {} # Symbol -> Position Data
        self.logger = get_logger(f"strategy_{algo_name.lower()}")
        
    @abstractmethod
    async def validate_market(self, market_data: Dict[str, Any]) -> bool:
        """
        Check if market conditions are suitable for this strategy.
        e.g., Time check, VIX check, Gap check.
        """
        pass

    @abstractmethod
    async def generate_signal(self, market_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Core Logic: Analyze market data and return a signal dictionary or None.
        Signal format: {'symbol': '...', 'side': 'BUY/SELL', 'quantity': 10, 'reason': '...'}
        """
        pass

    @abstractmethod
    def size_position(self, signal: Dict[str, Any], risk_limits: Dict[str, Any]) -> int:
        """
        Calculate quantity based on risk rules and account size.
        """
        pass
    
    @abstractmethod
    def calculate_sl_target(self, entry_price: float, side: str) -> Dict[str, float]:
        """
        Return Stop Loss and Target prices.
        """
        pass

    async def on_tick(self, tick_data: Dict[str, Any]):
        """
        Main entry point called by the Engine on every tick.
        """
        if not self.is_running:
            return

        # 1. Validate Market
        if not await self.validate_market(tick_data):
            return

        # 2. Generate Signal
        signal = await self.generate_signal(tick_data)
        if signal:
            self.logger.info(f"Signal Generated: {signal}")
            # 3. Execution Logic (Handled by Engine, but Strategy prepares it)
            # return signal  <-- In a real event loop, we would emit this.
            pass

    async def shutdown(self):
        """
        Graceful cleanup.
        """
        self.is_running = False
        self.logger.info(f"Strategy {self.algo_name} shutdown.")
