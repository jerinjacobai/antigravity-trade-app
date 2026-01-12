import asyncio
import os
from dotenv import load_dotenv
from app.core.config import get_logger, settings
from app.core.supabase_client import supabase
from app.engine.algo_state_manager import algo_state_manager

# Load Env
load_dotenv()
logger = get_logger("worker")

async def main():
    logger.info("🚀 QuantMind Algo Worker Starting...")
    
    if not supabase:
        logger.critical("Supabase connection failed. Exiting.")
        return

    # Main Loop
    while True:
        try:
            # 1. Sync State with DB
            # For V1, we poll every 5 seconds. In V2, use Realtime Subscription.
            response = supabase.table("daily_state").select("*").eq("date", "now()").execute()
            data = response.data
            
            if data:
                remote_state = data[0]
                algo = remote_state.get("algo_name")
                running = remote_state.get("is_running")
                
                if algo and algo != algo_state_manager.selected_algo:
                    logger.info(f"Received new Algo Command: {algo}")
                    algo_state_manager.selected_algo = algo
                    algo_state_manager.is_locked = True
                
                if running:
                    # Run Strategy Step
                    # In a real event loop, this would tick the strategy
                    # For demo, we just log heartbeat
                     pass
            
            await asyncio.sleep(5)
            
        except Exception as e:
            logger.error(f"Worker Loop Error: {e}")
            await asyncio.sleep(5)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker Stopping...")
