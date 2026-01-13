import uuid
from app.core.config import get_logger
from app.core.event_manager import event_manager
from app.engine.risk_engine import risk_engine
from app.core.upstox_client import upstox_app
from app.core.supabase_client import supabase

logger = get_logger("order_manager")

class OrderManager:
    async def place_order(self, symbol: str, quantity: int, side: str, order_type="MARKET", price=0.0):
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

        # 3. Get Context
        curr_state = algo_state_manager.current_state
        user_id = curr_state.get("user_id") if curr_state else None
        
        if not user_id:
             logger.error("⛔ Order Rejected: Missing User Context in Algo State.")
             return None
        
        algo_name = algo_state_manager.get_selected_algo()
        mode = algo_state_manager.get_mode()
        
        # 4. Route based on Mode (PAPER vs LIVE)
        if mode == "paper":
            logger.info(f"📝 Routing to Virtual Engine (Paper Mode): {symbol} {side} {quantity}")
            from app.engine.virtual_engine import virtual_execution_engine
            
            request = {
                "user_id": user_id,
                "symbol": symbol,
                "quantity": quantity,
                "transaction_type": side.upper(),
                "order_type": order_type,
                "price": price,
                "algo_name": algo_name
            }
            
            result = await virtual_execution_engine.place_order(request)
            if result.get("status") in ["FILLED", "PENDING"]:
                return result.get("order_id")
            else:
                logger.error(f"Paper Order Failed: {result.get('message')}")
                return None

        # 5. LIVE Execution via API
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
            logger.info(f"✅ Live Order Placed: {upstox_order_id}")
            
            # 6. Log to Supabase (Audit Trail)
            self._log_live_order(upstox_order_id, user_id, symbol, quantity, side, order_type, price, algo_name)
            
            return upstox_order_id

        except Exception as e:
            logger.error(f"Order Placement Failed: {e}")
            return None

    def _log_live_order(self, order_id, user_id, symbol, qty, side, order_type, price, algo_name):
        """
        Persist Live Order to 'trade_orders' table.
        """
         if not supabase: return
         try:
             payload = {
                 "order_id": order_id,
                 "user_id": user_id,
                 "symbol": symbol,
                 "transaction_type": side.upper(),
                 "quantity": qty,
                 "order_type": order_type,
                 "price": price,
                 "status": "OPEN", # Assumption, real status via socket
                 "algo_name": algo_name,
                 "created_at": "now()"
             }
             supabase.table("trade_orders").insert(payload).execute()
         except Exception as e:
             logger.error(f"Failed to log live trade order: {e}")

    async def sync_orders(self):
        """
        Reconciliation Loop:
        1. Fetch Order Book from Broker.
        2. Update 'trade_orders' in DB.
        3. Insert 'trade_executions' for fills.
        """
        if not upstox_app.api_instance: return # Not connected

        ob_response = upstox_app.fetch_order_book()
        if not ob_response or not ob_response.data: return

        for order in ob_response.data:
            try:
                # Map Upstox Status to Our Status
                # Upstox: complete, rejected, cancelled, open
                # Ours: FILLED, REJECTED, CANCELLED, OPEN, PENDING
                status_map = {
                    "complete": "FILLED",
                    "rejected": "REJECTED", 
                    "cancelled": "CANCELLED",
                    "open": "OPEN",
                    "trigger_pending": "PENDING"
                }
                
                remote_status = status_map.get(order.status, order.status.upper())
                
                # Update DB
                supabase.table("trade_orders").update({
                    "status": remote_status,
                    "filled_quantity": order.filled_quantity,
                    "average_price": order.average_price,
                    "reason": order.status_message, # Capture rejection reason
                    "updated_at": "now()"
                }).eq("order_id", order.order_id).execute()

                # If Filled, ensure execution record exists
                if remote_status == "FILLED":
                    # Check if execution exists (Simple Dedupe by order_id for V1)
                    # In V2, handle partial fills with unique trade_ids
                    exists = supabase.table("trade_executions").select("execution_id").eq("order_id", order.order_id).execute()
                    if not exists.data:
                        # Insert Execution
                        # We need user_id, fetch from order table if needed or just assume context?
                        # Better to fetch from trade_orders to match
                        local_order = supabase.table("trade_orders").select("user_id").eq("order_id", order.order_id).single().execute()
                        if local_order.data:
                            uid = local_order.data['user_id']
                            supabase.table("trade_executions").insert({
                                "order_id": order.order_id,
                                "user_id": uid,
                                "symbol": order.instrument_token, # or trading_symbol
                                "quantity": order.filled_quantity,
                                "price": order.average_price,
                                "side": order.transaction_type,
                                "broker_trade_id": order.exchange_order_id, # Approx
                                "executed_at": order.order_timestamp
                            }).execute()
                            logger.info(f"💰 Trade Executed: {order.order_id} @ {order.average_price}")

            except Exception as e:
                logger.error(f"Sync Order Error ({order.order_id}): {e}")

# Singleton
order_manager = OrderManager()
