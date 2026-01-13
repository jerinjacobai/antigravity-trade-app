from app.strategies.base_strategy import BaseStrategy
from app.core.config import get_logger

logger = get_logger("vpms_strategy")

class VPMSStrategy(BaseStrategy):
    """
    Volume Profile Momentum Strategy (VPMS)
    Logic:
    - Tracks Volume Weighted Average Price (VWAP) for the day.
    - If LTP crosses ABOVE VWAP + Buffer, triggers BUY.
    - If LTP crosses BELOW VWAP - Buffer, triggers SELL.
    """
    def __init__(self):
        super().__init__("VPMS - VWAP Momentum")
        self.vwap = 0.0
        self.total_volume = 0
        self.total_pv = 0.0 # Price * Volume Accumulator
        self.buffer_pct = 0.001 # 0.1% Buffer

    async def on_tick(self, tick_data: dict):
        if not self.active:
            return

        ltp = tick_data.get("price", 0.0) # MarketDataService normalizes 'price'
        volume = tick_data.get("volume", 0) # Note: Upstox WebSocket sometimes sends 0 volume in quotes
        symbol = tick_data.get("symbol")

        # 1. Update VWAP
        # Note: In a real logic, we need cumulative day volume. 
        # Ticks only give 'last trade volume' or 'volume traded today' depending on field.
        # Assuming DataAdapter sends 'volume' as increment or we need to track it.
        # For V1 Sim: We just accumulate what we see.
        
        if ltp > 0:
             # Basic VWAP sim (Not production grade as it depends on tick frequency)
             self.total_volume += 1000 # Mock volume weight per tick to stabilize
             self.total_pv += (ltp * 1000)
             self.vwap = self.total_pv / self.total_volume

        # 2. Generate Signals
        if self.vwap > 0:
            # BUY SIGNAL
            if ltp > self.vwap * (1 + self.buffer_pct):
                # Check for existing position? BaseStrategy handles 'positions' map? 
                # For V1, we just fire signals and RiskEngine filters excessive trades.
                logger.info(f"📈 VPMS Signal: LTP {ltp} > VWAP {self.vwap:.2f}")
                await self.entry_order(symbol, "BUY", 50) # Fixed Qty for now

            # SELL SIGNAL (Short)
            elif ltp < self.vwap * (1 - self.buffer_pct):
                 # logger.info(f"📉 VPMS Signal: LTP {ltp} < VWAP {self.vwap:.2f}")
                 # await self.entry_order(symbol, "SELL", 50)
                 pass # Long only for demo safety
