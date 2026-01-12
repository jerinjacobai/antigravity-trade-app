from fastapi import APIRouter, WebSocket, HTTPException
from app.engine.algo_state_manager import algo_state_manager
from app.engine.risk_engine import risk_engine
from app.engine.market_data import market_data_service
from app.core.event_manager import EventManager
from app.strategies.algo1_vpms import VPMSStrategy
import asyncio

router = APIRouter()

# Global Strategy Instance Holder (Simplified for Demo)
strategies = {
    "VPMS": VPMSStrategy(),
    # "ITR": ITRStrategy(),
    # "ORB": ORBStrategy()
}

@router.get("/status")
async def get_system_status():
    return {
        "algo_state": algo_state_manager.get_state(),
        "market_data": market_data_service.connected,
        "risk_stats": {
            "daily_trades": risk_engine.daily_trades_count,
            "max_trades": risk_engine.max_trades_per_day
        }
    }

@router.post("/select_algo/{algo_name}")
async def select_algo(algo_name: str):
    success = algo_state_manager.select_algo(algo_name)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot select algo (Locked or Market Open)")
    return {"status": "success", "selected": algo_name}

@router.post("/start_simulation")
async def start_simulation():
    await market_data_service.connect()
    selected_algo = algo_state_manager.selected_algo
    
    if selected_algo and selected_algo in strategies:
        strategies[selected_algo].start()
        # Bind strategy to market data events
        EventManager.subscribe("market_tick", strategies[selected_algo].on_tick)
        
    return {"status": "Simulation Started"}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    async def send_event(data):
        await websocket.send_json(data)
    
    # Subscribe to internal events and forward to Frontend
    # Note: In production, we need a better queue/broadcast mechanism
    EventManager.subscribe("market_tick", lambda d: asyncio.create_task(send_event({"type": "tick", "data": d})))
    EventManager.subscribe("order_update", lambda d: asyncio.create_task(send_event({"type": "order", "data": d})))
    
    try:
        while True:
            await websocket.receive_text() # Keep connection open
    except Exception:
        pass
