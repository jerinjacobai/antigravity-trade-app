import asyncio
from dotenv import load_dotenv
from app.core.config import get_logger
from app.core.supabase_client import supabase
from app.core.event_manager import event_manager
from app.engine.algo_state_manager import algo_state_manager
from app.engine.market_data import market_data_service
from app.engine.virtual_engine import virtual_execution_engine
from app.core.health_monitor import health_monitor

# Load Env
load_dotenv()
logger = get_logger("worker")

def strategy_tick_listener(data):
    """
    Sync callback to bridge EventManager with Async Strategy.
    """
    strategy = algo_state_manager.get_strategy()
    if strategy and strategy.active:
        # Fire and forget (or track task if robust)
        asyncio.create_task(strategy.on_tick(data))

async def main():
    logger.info("QuantMind Algo Worker Starting...")
    
    if not supabase:
        logger.critical("Supabase connection failed. Exiting.")
        return

    # Log Startup
    event_manager.log_system_event("STARTUP", "WORKER", "INFO", "QuantMind Worker Process Started")

    # 1. Initialize Managers
    # For V1, we assume a single user context or iterate users. 
    # For now, we init for the primary admin user (TODO: Multi-tenant loop)
    # We will let dashboard/API drive the 'lock' and this worker just respects the global state.
    
    # Subscribe Strategy to Market Ticks
    event_manager.subscribe("market_tick", strategy_tick_listener)

    # Start Market Data Service
    logger.info("Starting Market Data Service...")
    await market_data_service.start()
    
    # Start Health Monitor
    await health_monitor.start()

    # Main Loop
    while True:
        try:
            # 2. Daily State Sync (Heartbeat / Lock Check)
            # In V3.1, AlgoStateManager manages state via DB interaction
            # We can trigger a refresh if needed, but it should be reactive.
            # Here we just keep the event loop alive and perform housekeeping.
            
            # 3. Virtual Engine Housekeeping (Paper Orders)
            if algo_state_manager.get_mode() == "paper":
                await virtual_execution_engine.sync_pending_orders()
            elif algo_state_manager.get_mode() == "live":
                # 4. Live Reconciliation (Audit Logs)
                from app.engine.order_manager import order_manager
                await order_manager.sync_orders()
            
            await asyncio.sleep(1)
            
        except Exception as e:
            logger.error(f"Worker Loop Error: {e}")
            event_manager.log_system_event("CRASH", "WORKER", "CRITICAL", f"Main Loop Exception: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker Stopping...")
        event_manager.log_system_event("SHUTDOWN", "WORKER", "INFO", "Worker Stopped via KeyboardInterrupt")
        market_data_service.stop()
