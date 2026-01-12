from datetime import datetime
import uuid
from typing import Optional, Dict
from app.core.config import get_logger
from app.core.event_manager import EventManager
from app.engine.risk_engine import risk_engine

logger = get_logger("order_manager")

class OrderManager:
    def __init__(self):
        self.orders = {} # Store order state
        self.positions = {}

    async def place_order(self, symbol: str, quantity: int, side: str, order_type: str = "MARKET", price: float = 0.0) -> Optional[str]:
        """
        Place an order after passing Risk Checks.
        """
        logger.info(f"Received Order Request: {side} {quantity} {symbol} @ {order_type}")

        # 1. RISK CHECK
        # In a real scenario, we'd calculate the impact on PnL or margin here.
        # For now, we pass a dummy current_pnl_pct logic or rely on the engine's internal state.
        # We need to fetch the *current* PnL from positions to pass to check_trade_allowed.
        # For simplicity in this step, we assume PnL is tracked in RiskEngine.
        
        # We can also check generic "is trade allowed" (time, max trades)
        # Note: We pass 0.0 as current_pnl for now, as Position tracking is separate.
        if not risk_engine.check_trade_allowed(current_pnl_pct=0.0): 
            logger.error("Order Rejected by Risk Engine")
            return None

        # 2. EXECUTION (Simulation)
        order_id = str(uuid.uuid4())
        order_status = "COMPLETE" # Simulating instant fill
        
        # Simulate Slippage/Fill Price
        fill_price = price if price > 0 else 100.0 # Mock price
        
        order_record = {
            "order_id": order_id,
            "symbol": symbol,
            "quantity": quantity,
            "side": side,
            "status": order_status,
            "fill_price": fill_price,
            "timestamp": datetime.now().isoformat()
        }
        
        self.orders[order_id] = order_record
        logger.info(f"Order Placed & Filled: {order_id}")
        
        # 3. UPDATE RISK ENGINE
        # A fill counts as a trade? Usually 'Orders' count towards rate limits, 'Trades' key for PnL.
        # RiskEngine counts 'trades' (completed transactions).
        risk_engine.update_trade_stats(pnl=0.0) # Update trade count
        
        # 4. PUBLISH EVENT
        await EventManager.publish("order_update", order_record)
        
        return order_id

    def get_positions(self) -> Dict:
        return self.positions

order_manager = OrderManager()
