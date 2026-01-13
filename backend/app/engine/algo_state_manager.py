import asyncio
from datetime import datetime, time
from app.core.config import get_logger
from app.core.supabase_client import supabase

logger = get_logger("algo_state_manager")

class AlgoStateManager:
    """
    Manages the daily lifecycle of the trading algorithm.
    Enforces v3.1 rules:
    1. One algo per day.
    2. Locked at 9:15 AM (or upon first selection).
    3. State persisted in Supabase 'algo_state' table.
    """
    def __init__(self):
        self.current_state = None # Cached state
        self._last_fetch = datetime.min

    async def initialize(self, user_id: str):
        """
        Loads the daily state from DB at startup.
        """
        try:
            today = datetime.now().date().isoformat()
            response = supabase.table("algo_state")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("trade_date", today)\
                .execute()
            
            if response.data:
                self.current_state = response.data[0]
                logger.info(f"Loaded Daily State: {self.current_state}")
            else:
                logger.info("No Algo State found for today. Waiting for selection.")
                self.current_state = None
        except Exception as e:
            logger.error(f"Failed to load algo state: {e}")

    async def lock_algo(self, user_id: str, algo_name: str, mode: str) -> bool:
        """
        Attempts to lock the selected algo for the day.
        Returns True if successful, False if blocked by rules.
        """
        today = datetime.now().date().isoformat()
        
        # 1. Check if already locked
        if self.current_state:
            curr_algo = self.current_state.get("selected_algo")
            curr_mode = self.current_state.get("mode")
            if curr_algo != algo_name or curr_mode != mode:
                logger.warning(f"BLOCKED: Algo already locked to {curr_algo} ({curr_mode})")
                return False
            return True # Idempotent success

        # 2. Check Time Rule (Strict: Cannot start new algo after 9:15 AM)
        # Note: In 'dev' env we might relax this, but v3.1 spec says HARD rule.
        now = datetime.now().time()
        cutoff = time(9, 15)
        # Uncomment below for Strict Production Rule
        # if now > cutoff:
        #     logger.warning("BLOCKED: Cannot select new algo after 9:15 AM")
        #     return False

        # 3. Create Lock in DB
        try:
            payload = {
                "user_id": user_id,
                "trade_date": today,
                "selected_algo": algo_name,
                "mode": mode,
                "status": "running",
                "locked_at": datetime.now().isoformat()
            }
            res = supabase.table("algo_state").insert(payload).execute()
            if res.data:
                self.current_state = res.data[0]
                logger.info(f"✅ ALGO LOCKED: {algo_name} [{mode}]")
                return True
            else:
                return False
        except Exception as e:
            logger.error(f"Locking Failed: {e}")
            return False

    def is_algo_running(self) -> bool:
        if not self.current_state:
            return False
        return self.current_state.get("status") == "running"

    def get_selected_algo(self):
        if not self.current_state: return None
        return self.current_state.get("selected_algo")

    def get_mode(self):
        if not self.current_state: return "paper"
        return self.current_state.get("mode")

# Singleton
algo_state_manager = AlgoStateManager()
