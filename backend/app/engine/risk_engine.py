from datetime import datetime, time
from app.core.config import get_logger, settings
from app.core.event_manager import EventManager

logger = get_logger("risk_engine")

class RiskEngine:
    def __init__(self):
        # Configuration
        self.max_daily_loss_pct = 2.0 # Hard Limit (Block)
        self.soft_stop_loss_pct = 1.0 # Soft Limit (Alert)
        self.max_trades_per_day = 25
        self.max_consecutive_losses = 4
        self.trade_cooldown_seconds = 60
        
        # State
        self.daily_trades_count = 0
        self.current_loss_pct = 0.0
        self.consecutive_losses = 0
        self.last_trade_time = datetime.min
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

        # 3. Max Loss Check & Soft Stop Alert
        if current_pnl_pct <= -self.max_daily_loss_pct:
            logger.critical(f"Trade rejected: Max daily loss hit ({current_pnl_pct}%)")
            return False
        
        if current_pnl_pct <= -self.soft_stop_loss_pct:
            logger.warning(f"⚠️ RISK ALERT: Soft Stop Hit ({current_pnl_pct}%). Trading allowed but risky.")

        # 4. Consecutive Loss Guard
        if self.consecutive_losses >= self.max_consecutive_losses:
            logger.error(f"Trade blocked: {self.consecutive_losses} Consecutive Losses. Values reset tomorrow.")
            return False

        # 5. Cooldown Check
        elapsed = (datetime.now() - self.last_trade_time).total_seconds()
        if elapsed < self.trade_cooldown_seconds:
            logger.warning(f"Trade rejected: Cooldown active ({int(self.trade_cooldown_seconds - elapsed)}s remaining)")
            return False

        return True

    def update_trade_stats(self, pnl: float):
        self.daily_trades_count += 1
        self.last_trade_time = datetime.now()
        
        if pnl < 0:
            self.consecutive_losses += 1
            logger.info(f"Risk Update: Loss Recorded. Consecutive: {self.consecutive_losses}")
        else:
            self.consecutive_losses = 0
            logger.info("Risk Update: Win Recorded. Consecutive Losses Reset.")
            
        logger.info(f"Risk Update: Total Trades={self.daily_trades_count}, Last PnL={pnl}")

risk_engine = RiskEngine()
