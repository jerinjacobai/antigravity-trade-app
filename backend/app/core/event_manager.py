import asyncio
from datetime import datetime
from supabase import create_client, Client, create_async_client, AsyncClient
from app.core.config import get_logger, settings
from app.core.supabase_client import supabase

logger = get_logger("event_manager")

class EventManager:
    # ... (init and subscribe and initialize methods remain same) ...
    def __init__(self):
        self.subscribers = {}
        self.async_client: AsyncClient = None
        self.realtime_channel = None

    async def initialize(self):
        """Initialize Async Client for Realtime"""
        try:
             self.async_client = await create_async_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
             
             # Create and Subscribe to Channel
             self.realtime_channel = self.async_client.channel('dashboard_realtime')
             await self.realtime_channel.subscribe()
             
             logger.info("EventManager: Async Client Connected & Subscribed")
        except Exception as e:
             logger.error(f"EventManager: Async Init Failed: {e}")

    def subscribe(self, event_type, callback):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)

    async def publish(self, event_type, data):
        # 1. Local Broadcast
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                try:
                    # Support async callbacks if needed
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data)
                    else:
                        callback(data)
                except Exception as e:
                    logger.error(f"Error in subscriber: {e}")

        # 2. Cloud Persistence & Broadcast
        if event_type == "market_tick":
            await self._broadcast_tick(data)
        elif event_type in ["system_log", "trade_log", "error", "algo_status"]:
             self._log_to_db(event_type, data)

    async def _broadcast_tick(self, data):
        if not self.realtime_channel: return
        try:
            # Broadcast to 'dashboard_realtime' channel
            await self.realtime_channel.send_broadcast("market_tick", data)
        except Exception as e:
             logger.error(f"Broadcast Failed: {e}")

    def _log_to_db(self, level, message):
        if not supabase: return
        try:
             # If data is a dict, dumping it to string or extracting message
             msg_content = message if isinstance(message, str) else str(message)
             
             supabase.table("trade_logs").insert({
                 "level": level.upper(),
                 "message": msg_content,
                 "timestamp": datetime.now().isoformat()
             }).execute()
        except Exception as e:
            # Fallback to local logger to avoid loops
            logger.error(f"Supabase Log Failed: {e}")

    def log_system_event(self, event_type: str, component: str, severity: str, message: str, metadata: dict = None):
        """
        Logs critical system lifecycle events to 'system_events' table.
        """
        if not supabase: return
        try:
            payload = {
                "event_type": event_type,
                "component": component,
                "severity": severity,
                "message": message,
                "metadata": metadata,
                "created_at": datetime.now().isoformat()
            }
            # Fire and forget
            supabase.table("system_events").insert(payload).execute()
        except Exception as e:
            logger.error(f"System Event Log Failed: {e}")

event_manager = EventManager()

