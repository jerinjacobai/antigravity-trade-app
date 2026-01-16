from datetime import datetime
from app.core.config import get_logger
from app.core.supabase_client import supabase
# Simple sync wrapper for basic usage
# For heavy loads, use a background task queue

logger = get_logger("event_manager")

class EventManager:
    def __init__(self):
        self.subscribers = {}

    def subscribe(self, event_type, callback):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)

    def publish(self, event_type, data):
        # 1. Local Broadcast
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                try:
                    callback(data)
                except Exception as e:
                    logger.error(f"Error in subscriber: {e}")

        # 2. Cloud Persistence & Broadcast
        # High-freq ticks are broadcasted via Realtime, NOT persisted to DB logs.
        if event_type == "market_tick":
            self._broadcast_tick(data)
        elif event_type in ["system_log", "trade_log", "error", "algo_status"]:
             self._log_to_db(event_type, data)

    def _broadcast_tick(self, data):
        if not supabase: return
        try:
            # Broadcast to 'dashboard_realtime' channel
            # Note: Python client usage for broadcast might vary by version. 
            # We assume standard realtime channel emit.
            channel = supabase.channel('dashboard_realtime')
            channel.broadcast({'event': 'market_tick', 'payload': data}).send()
        except Exception as e:
            # high frequency error log suppression might be needed here
            # for now, we just print to console/logger to avoid DB spam
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

