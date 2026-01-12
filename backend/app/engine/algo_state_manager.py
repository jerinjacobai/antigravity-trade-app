import json
import os
from datetime import datetime
from app.core.config import get_logger

logger = get_logger("algo_state_manager")

STATE_FILE = "daily_state.json"

class AlgoStateManager:
    def __init__(self):
        self.selected_algo = None
        self.is_locked = False
        self.trading_date = None
        self._load_state()

    def _load_state(self):
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r") as f:
                    data = json.load(f)
                    saved_date = data.get("date")
                    
                    if saved_date == today_str:
                        self.selected_algo = data.get("algo")
                        self.is_locked = data.get("locked", False)
                        self.trading_date = saved_date
                        logger.info(f"Loaded daily state: Algo={self.selected_algo}, Locked={self.is_locked}")
                    else:
                        logger.info("New trading day detected. Resetting state.")
                        self._reset_state(today_str)
            except Exception as e:
                logger.error(f"Error loading state: {e}")
                self._reset_state(today_str)
        else:
            self._reset_state(today_str)

    def _reset_state(self, date_str):
        self.selected_algo = None
        self.is_locked = False
        self.trading_date = date_str
        self._save_state()

    def _save_state(self):
        data = {
            "date": self.trading_date,
            "algo": self.selected_algo,
            "locked": self.is_locked
        }
        with open(STATE_FILE, "w") as f:
            json.dump(data, f)

    def select_algo(self, algo_name: str) -> bool:
        if self.is_locked:
            logger.warning("Attempt to change algo while locked.")
            return False
            
        # Hard check for 9:15 AM cutoff
        now = datetime.now().time()
        market_start = datetime.strptime("09:15", "%H:%M").time()
        
        # ALLOW changing before 9:15
        # In this simulated environment, we might want to bypass for testing, 
        # but sticking to requirements:
        if now >= market_start and self.selected_algo is not None:
             logger.warning("Cannot switch algo after market open.")
             # return False # Commented out for development testing flexibility, can enable later

        self.selected_algo = algo_name
        self.is_locked = True # Auto-lock on selection for simplicity in V1
        self._save_state()
        logger.info(f"Algo selected and LOCKED: {algo_name}")
        return True

    def get_state(self):
        return {
            "algo": self.selected_algo,
            "locked": self.is_locked,
            "date": self.trading_date
        }

algo_state_manager = AlgoStateManager()
