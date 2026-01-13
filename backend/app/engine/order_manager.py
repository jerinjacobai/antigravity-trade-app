import uuid
from app.core.config import get_logger
from app.core.event_manager import event_manager
from app.engine.risk_engine import risk_engine
from app.core.upstox_client import upstox_app
from app.core.supabase_client import supabase

logger = get_logger("order_manager")

class OrderManager:
    def place_order(self, symbol: str, quantity: int, side: str, order_type="MARKET", price=0.0):
        """
        Places a real order via Upstox API.
        """
        # 1. Algo Lock Check (Phase 4)
        from app.engine.algo_state_manager import algo_state_manager
        if not algo_state_manager.is_algo_running():
            logger.error("⛔ Order Rejected: Algo not in RUNNING state.")
            return None

        # 2. Risk Check
        if not risk_engine.check_trade_allowed(symbol, quantity, side):
            logger.warning("Risk Check Failed. Order Blocked.")
            return None

        # 2. Place Order via API
        try:
            # Convert internal 'BUY'/'SELL' to Upstox 'TRANSACTION_TYPE_BUY' etc.
            transaction_type = 'BUY' if side.upper() == 'BUY' else 'SELL'
            
            # Use Upstox SDK
            order_details = upstox_app.api_instance.place_order({
                "quantity": quantity,
                "product": "I", # Intraday
                "validity": "DAY",
                "price": price,
                "tag": "quantmind_algo",
                "instrument_token": symbol, # Needs correct Instrument Key
                "order_type": order_type,
                "transaction_type": transaction_type,
                "disclosed_quantity": 0,
                "trigger_price": 0,
                "is_amo": False
            })
            
            upstox_order_id = order_details.data.order_id
            logger.info(f"✅ Order Placed: {upstox_order_id}")
            
            # 3. Log to Supabase
            self._log_order_to_db(upstox_order_id, symbol, quantity, side, "OPEN")
            
            return upstox_order_id

        except Exception as e:
            logger.error(f"Order Placement Failed: {e}")
            return None

    def _log_order_to_db(self, order_id, symbol, qty, side, status):
         if not supabase: return
         try:
             supabase.table("orders").insert({
                 "order_id": order_id,
                 "symbol": symbol,
                 "quantity": qty,
                 "side": side,
                 "status": status,
                 "timestamp": "now()"
             }).execute()
         except Exception as e:
             logger.error(f"Failed to log order: {e}")

# Singleton
order_manager = OrderManager()
