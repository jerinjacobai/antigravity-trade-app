import asyncio
from typing import Callable, Dict, List, Any
from app.core.config import get_logger

logger = get_logger("event_bus")

class EventManager:
    _subscribers: Dict[str, List[Callable]] = {}

    @classmethod
    def subscribe(cls, event_type: str, handler: Callable):
        if event_type not in cls._subscribers:
            cls._subscribers[event_type] = []
        cls._subscribers[event_type].append(handler)
        logger.debug(f"Subscribed to {event_type} with {handler.__name__}")

    @classmethod
    async def publish(cls, event_type: str, data: Any = None):
        if event_type in cls._subscribers:
            logger.debug(f"Publishing event: {event_type}")
            for handler in cls._subscribers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(data)
                    else:
                        handler(data)
                except Exception as e:
                    logger.error(f"Error handling event {event_type}: {e}", exc_info=True)
