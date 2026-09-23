"""FastAPI WebSocket connection manager and streaming endpoint."""

import json
import logging
from typing import Dict, List, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])


class ConnectionManager:
    """Manages active WebSocket connections per machine and fleet-wide."""

    def __init__(self):
        # machine_id -> list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # fleet-wide subscribers
        self.fleet_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, machine_id: str):
        await websocket.accept()
        if machine_id == "fleet":
            self.fleet_connections.append(websocket)
        else:
            if machine_id not in self.active_connections:
                self.active_connections[machine_id] = []
            self.active_connections[machine_id].append(websocket)
        logger.info("WebSocket client connected for machine: %s", machine_id)

    def disconnect(self, websocket: WebSocket, machine_id: str):
        if machine_id == "fleet":
            if websocket in self.fleet_connections:
                self.fleet_connections.remove(websocket)
        else:
            if machine_id in self.active_connections:
                if websocket in self.active_connections[machine_id]:
                    self.active_connections[machine_id].remove(websocket)
        logger.info("WebSocket client disconnected from machine: %s", machine_id)

    async def broadcast_machine_update(self, machine_id: str, data: Dict[str, Any]):
        """Send message to all clients subscribed to machine_id or fleet."""
        message = json.dumps(data)
        # 1. Target machine subscribers
        if machine_id in self.active_connections:
            dead_sockets = []
            for ws in self.active_connections[machine_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                self.active_connections[machine_id].remove(ws)

        # 2. Fleet-wide subscribers
        dead_fleet = []
        for ws in self.fleet_connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead_fleet.append(ws)
        for ws in dead_fleet:
            self.fleet_connections.remove(ws)


manager = ConnectionManager()


@router.websocket("/ws/machines/{machine_id}")
async def websocket_machine_endpoint(websocket: WebSocket, machine_id: str):
    await manager.connect(websocket, machine_id)
    try:
        # Keep connection open and listen for optional ping/commands
        while True:
            data = await websocket.receive_text()
            # Respond to ping
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket, machine_id)
    except Exception as exc:
        logger.debug("WebSocket error for %s: %s", machine_id, exc)
        manager.disconnect(websocket, machine_id)
