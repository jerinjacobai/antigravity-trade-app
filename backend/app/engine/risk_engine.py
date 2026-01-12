from datetime import datetime, time
from app.core.config import get_logger, settings
from app.core.event_manager import EventManager

logger = get_logger("risk_engine")

class RiskEngine:
    def __init__(self):
        self.max_daily_loss_pct = 2.0
        self.max_trades_per_day = 25
        self.daily_trades_count = 0
        self.current_loss_pct = 0.0
        self.hard_stop_time = time(15, 15) # 3:15 PM

    def check_trade_allowed(self, current_pnl_pct: float) -> bool:
        """
        Global Risk Checks before any trade entry.
        """
        # 0. Sync Limits from DB (Dynamic)
        try:
            from app.core.supabase_client import supabase
            response = supabase.table("user_profiles").select("max_loss_limit, max_trades_limit, kill_switch_active").limit(1).execute()
            if response.data:
                profile = response.data[0]
                if profile.get("kill_switch_active"):
                    logger.critical("🚨 TRADE REJECTED: KILL SWITCH ACTIVE 🚨")
                    return False
                # Update local limits
                self.max_trades_per_day = profile.get("max_trades_limit", 25)
                # self.max_daily_loss_pct = ... (Need to convert currency limit to text or pct in future)
        except Exception as e:
            logger.error(f"Risk Sync Error: {e}")

        # 1. Time Check
        now = datetime.now().time()
        if now >= self.hard_stop_time:
            logger.warning(f"Trade rejected: Market closing soon (Current: {now})")
            return False

        # 2. Max Trades Check
        if self.daily_trades_count >= self.max_trades_per_day:
            logger.warning(f"Trade rejected: Max daily trades reached ({self.daily_trades_count})")
            return False

        # 3. Max Loss Check
        if current_pnl_pct <= -self.max_daily_loss_pct:
            logger.critical(f"Trade rejected: Max daily loss hit ({current_pnl_pct}%)")
            return False

        return True

    def update_trade_stats(self, pnl: float):
        self.daily_trades_count += 1
        # In a real app, this would recalculate total PnL % based on account balance
        # self.current_loss_pct = ... 
        logger.info(f"Risk Update: Trades={self.daily_trades_count}, Last PnL={pnl}")

risk_engine = RiskEngine()
