import asyncio
from typing import Dict, Optional
from datetime import datetime
from app.core.config import get_logger
from app.core.supabase_client import supabase
from app.engine.market_data import market_data_service

logger = get_logger("virtual_engine")

class VirtualExecutionEngine:
    """
    Handles execution of Paper Trading orders.
    Simulates a broker by filling orders based on real-time Last Traded Price (LTP).
    """

    async def place_order(self, order_request: Dict) -> Dict:
        """
        Validates and places a paper order.
        """
        user_id = order_request.get("user_id")
        symbol = order_request.get("symbol")
        quantity = order_request.get("quantity")
        transaction_type = order_request.get("transaction_type") # BUY/SELL
        order_type = order_request.get("order_type") # MARKET/LIMIT
        price = order_request.get("price", 0.0) # Limit Price

        # 1. Get Current Market Price (LTP)
        ltp = await market_data_service.get_ltp(symbol)
        if not ltp:
            logger.error(f"Cannot place paper order: LTP not available for {symbol}")
            return {"status": "REJECTED", "message": "Market Data Unavailable"}

        # 2. Virtual Wallet Check (Margin)
        wallet = await self._get_wallet(user_id)
        if not wallet:
             return {"status": "REJECTED", "message": "Paper Wallet not found"}

        required_margin = ltp * quantity if transaction_type == "BUY" else ltp * quantity # Simplified Margin
        if wallet["available_balance"] < required_margin and transaction_type == "BUY":
             return {"status": "REJECTED", "message": "Insufficient Virtual Margin"}

        # 3. Create Order Record (PENDING)
        order_payload = {
            "user_id": user_id,
            "symbol": symbol,
            "transaction_type": transaction_type,
            "quantity": quantity,
            "order_type": order_type,
            "price": price,
            "status": "PENDING",
            "algo_name": order_request.get("algo_name", "MANUAL")
        }
        
        try:
            res = supabase.table("paper_orders").insert(order_payload).execute()
            if not res.data:
                 return {"status": "ERROR", "message": "DB Insertion Failed"}
            
            paper_order = res.data[0]
            order_id = paper_order["order_id"]

            # 4. Attempt Instant Execution (Market Order)
            if order_type == "MARKET":
                await self._execute_fill(paper_order, ltp)
                return {"status": "FILLED", "order_id": order_id, "price": ltp}
            
            # TODO: Handle LIMIT orders (store and poll)
            return {"status": "PENDING", "order_id": order_id}

        except Exception as e:
            logger.error(f"Paper Order Placement Error: {e}")
            return {"status": "ERROR", "message": str(e)}

    async def _execute_fill(self, order: Dict, fill_price: float):
        """
        Executes a fill:
        1. Create Execution Record
        2. Update Order Status
        3. Update Positions
        4. Update Wallet
        """
        try:
            order_id = order["order_id"]
            user_id = order["user_id"]
            qty = order["quantity"]
            side = order["transaction_type"]
            symbol = order["symbol"]

            # 1. Execution Record
            exec_payload = {
                "order_id": order_id,
                "user_id": user_id,
                "symbol": symbol,
                "quantity": qty,
                "price": fill_price,
                "side": side
            }
            supabase.table("paper_executions").insert(exec_payload).execute()

            # 2. Update Order Status
            supabase.table("paper_orders").update({
                "status": "FILLED",
                "average_price": fill_price,
                "filled_quantity": qty
            }).eq("order_id", order_id).execute()

            # 3. Update Position & Wallet
            await self._update_position(user_id, symbol, qty, side, fill_price)
            await self._update_wallet(user_id, qty, side, fill_price)

            logger.info(f"⚡ Paper Fill: {side} {qty} {symbol} @ {fill_price}")

        except Exception as e:
            logger.error(f"Paper Execution Failed: {e}")

    async def _update_position(self, user_id: str, symbol: str, qty: int, side: str, price: float):
        """
        Updates paper_positions table.
        Netting logic: Long + Buy = Add, Long + Sell = Reduce/Close
        """
        # Fetch existing position
        res = supabase.table("paper_positions").select("*").eq("user_id", user_id).eq("symbol", symbol).eq("status", "OPEN").execute()
        
        signed_qty = qty if side == "BUY" else -qty
        
        if res.data:
            pos = res.data[0]
            new_qty = pos["quantity"] + signed_qty
            
            if new_qty == 0:
                # Closed Position
                supabase.table("paper_positions").update({
                    "quantity": 0,
                    "status": "CLOSED",
                    "ltp": price
                }).eq("position_id", pos["position_id"]).execute()
            else:
                # Update Avg Price only if increasing position size (same side)
                # If reducing, avg price doesn't change, only PnL realizes.
                # Simplified for v1: Recalculate avg price on addition
                
                current_qty = pos["quantity"]
                # TODO: Weighted Average Price Logic
                
                supabase.table("paper_positions").update({
                    "quantity": new_qty,
                    "ltp": price # Update LTP reference
                }).eq("position_id", pos["position_id"]).execute()
        else:
            # New Position
            supabase.table("paper_positions").insert({
                "user_id": user_id,
                "symbol": symbol,
                "quantity": signed_qty,
                "average_price": price,
                "ltp": price,
                "status": "OPEN"
            }).execute()

    async def _get_wallet(self, user_id: str):
        res = supabase.table("paper_wallet").select("*").eq("user_id", user_id).execute()
        if res.data:
            return res.data[0]
        return None

    async def sync_pending_orders(self):
        """
        Polls for PENDING orders in DB and attempts to execute them.
        """
        try:
            # Fetch PENDING orders
            res = supabase.table("paper_orders").select("*").eq("status", "PENDING").execute()
            if not res.data:
                return

            orders = res.data
            for order in orders:
                symbol = order["symbol"]
                order_type = order["order_type"]
                
                # Get current market price
                ltp = await market_data_service.get_ltp(symbol)
                if not ltp:
                    continue # Skip if price not available yet

                # MARKET ORDER: Instant fill
                if order_type == "MARKET":
                    await self._execute_fill(order, ltp)
                
                # LIMIT ORDER Check
                elif order_type == "LIMIT":
                    limit_price = order.get("price")
                    side = order["transaction_type"]
                    
                    # BUY: Fill if LTP <= Limit Price
                    if side == "BUY" and ltp <= limit_price:
                        await self._execute_fill(order, limit_price) # Fill at Limit (or better)
                    
                    # SELL: Fill if LTP >= Limit Price
                    elif side == "SELL" and ltp >= limit_price:
                        await self._execute_fill(order, limit_price)

        except Exception as e:
            logger.error(f"Sync Pending Orders Error: {e}")

    async def _update_wallet(self, user_id: str, qty: int, side: str, price: float):
        """
        Updates Paper Wallet Balance & Used Margin.
        """
        try:
            wallet = await self._get_wallet(user_id)
            if not wallet: return
            
            # Simple Logic for v1:
            # Buy = Increase Used Margin, Decrease Balance
            # Sell = Decrease Used Margin, Increase Balance (Realize PnL logic needed, but simplified here)
            
            # NOTE: Real PnL logic requires tracking avg entry price per position.
            # Here we just adjust Available Balance for now.
            
            trade_value = qty * price
            new_balance = wallet["available_balance"]
            new_used = wallet["used_margin"]
            
            if side == "BUY":
                new_balance -= trade_value
                new_used += trade_value
            else:
                new_balance += trade_value
                new_used -= trade_value

            supabase.table("paper_wallet").update({
                "available_balance": new_balance,
                "used_margin": new_used
            }).eq("user_id", user_id).execute()
            
        except Exception as e:
            logger.error(f"Wallet Update Error: {e}")

virtual_execution_engine = VirtualExecutionEngine()
