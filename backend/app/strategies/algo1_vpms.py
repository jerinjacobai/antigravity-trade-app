from app.strategies.base_strategy import BaseStrategy
from app.core.config import get_logger

logger = get_logger("algo_vpms")

class VPMSStrategy(BaseStrategy):
    def __init__(self):
        super().__init__("VPMS - VWAP Momentum")
        self.vwap = 0.0
        self.total_volume = 0
        self.total_pv = 0.0 # Price * Volume

    async def on_tick(self, tick_data: dict):
        if not self.active:
            return

        ltp = tick_data.get("ltp", 0.0)
        volume = tick_data.get("volume", 0)
        symbol = tick_data.get("symbol")

        # Update VWAP
        if volume > 0:
            self.total_volume += volume
            self.total_pv += (ltp * volume)
            self.vwap = self.total_pv / self.total_volume

        # Simple Momentum Logic: Price crosses above VWAP
        # In real world, we'd need crossover detection (prev_price < VWAP and curr_price > VWAP)
        # For simulation, we randomly trigger if price is > VWAP by 0.5%
        
        if self.vwap > 0 and ltp > self.vwap * 1.001:
            # Check if we already have a position? (Skipped for simple demo logic)
            # logger.info(f"Signal: LTP {ltp} > VWAP {self.vwap:.2f}")
            
            # Fire a Buy Order
            # await self.entry_order(symbol + " CE", "BUY", 50) 
            pass
