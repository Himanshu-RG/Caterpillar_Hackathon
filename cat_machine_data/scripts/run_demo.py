"""One-command demo runner starting backend and streaming demo scenario."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import argparse
import subprocess
import time
import requests
import uvicorn
import threading

from backend.data_hub.database import init_db
from backend.simulator.scenario_controller import DEMO_SCENARIOS


def start_backend_thread(host: str = "127.0.0.1", port: int = 8000):
    uvicorn.run("backend.api.app:app", host=host, port=port, log_level="warning")


def main():
    parser = argparse.ArgumentParser(description="One-Command Interactive Hackathon Demo Runner")
    parser.add_argument(
        "--scenario",
        type=str,
        default="degrading",
        choices=list(DEMO_SCENARIOS.keys()),
        help="Demo scenario to run",
    )
    parser.add_argument("--speed", type=float, default=2.0, help="Simulation speed factor (default 2.0x)")
    parser.add_argument("--limit", type=int, default=30, help="Number of telemetry packets to stream")

    args = parser.parse_args()

    print("=" * 65)
    print(" CATERPILLAR TELEMATICS & INTELLIGENCE PLATFORM — LIVE DEMO")
    print("=" * 65)
    print(f" Scenario : {args.scenario.upper()}")
    print(f" Speed    : {args.speed:.1f}x")
    print("=" * 65)

    # 1. Initialize DB
    print("[1/3] Ensuring database schema and models are ready...")
    init_db()

    # 2. Start API server in background thread
    print("[2/3] Launching FastAPI server on http://localhost:8000 ...")
    server_thread = threading.Thread(target=start_backend_thread, daemon=True)
    server_thread.start()

    # Wait for server to become responsive
    max_wait = 10
    start_t = time.time()
    server_ready = False
    while time.time() - start_t < max_wait:
        try:
            r = requests.get("http://127.0.0.1:8000/api/health", timeout=1.0)
            if r.status_code == 200:
                server_ready = True
                break
        except Exception:
            time.sleep(0.5)

    if server_ready:
        print("[2/3] FastAPI server is HEALTHY at http://localhost:8000/docs")
    else:
        print("[WARNING] FastAPI server response timed out, continuing in direct ingestion mode...")

    # 3. Launch Simulator
    print(f"[3/3] Streaming demo scenario '{args.scenario}'...")
    sim_cmd = [
        sys.executable,
        str(PROJECT_ROOT / "scripts" / "start_simulator.py"),
        "--scenario", args.scenario,
        "--speed", str(args.speed),
        "--limit", str(args.limit),
        "--ingest-url", "http://127.0.0.1:8000/api/telemetry/ingest",
    ]
    subprocess.run(sim_cmd)
    print("\nDemo scenario finished. Interactive API remains open at http://localhost:8000/docs (Press Ctrl+C to exit).")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nExiting demo.")


if __name__ == "__main__":
    main()
