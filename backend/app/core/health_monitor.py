import asyncio
from datetime import datetime
from app.core.config import get_logger
from app.core.event_manager import event_manager
from app.engine.market_data import market_data_service

logger = get_logger("health_monitor")

class HealthMonitor:
    """
    Background Daemon to monitor system health and emits Heartbeats.
    """
    def __init__(self):
        self.interval_seconds = 60
        self.running = False
        self._task = None

    async def start(self):
        self.running = True
        self._task = asyncio.create_task(self._monitor_loop())
        logger.info("🏥 Health Monitor Started")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _monitor_loop(self):
        while self.running:
            try:
                # 1. Check Market Data
                # We check if ltp cache is not stale (optional) or just service connectivity
                md_status = "OK"
                # Simple check: Is adapter active?
                if not market_data_service.active_adapter.running:
                    md_status = "Degraded (Adapter Stopped)"
                    logger.warning(f"Health Check Warning: {md_status}")

                # 2. Emit Heartbeat to DB
                # This proves the worker main loop (or at least asyncio loop) is alive
                event_manager.log_system_event(
                    event_type="HEARTBEAT",
                    component="WORKER",
                    severity="INFO",
                    message=f"System Healthy. Market Data: {md_status}",
                    metadata={"memory": "N/A", "cpu": "N/A"} # Can add psutil later
                )
                
            except Exception as e:
                logger.error(f"Health Monitor Error: {e}")
                event_manager.log_system_event(
                    event_type="CRASH",
                    component="HEALTH_MONITOR",
                    severity="mCRITICAL",
                    message=f"Monitor Loop Failed: {e}"
                )

            await asyncio.sleep(self.interval_seconds)

health_monitor = HealthMonitor()
