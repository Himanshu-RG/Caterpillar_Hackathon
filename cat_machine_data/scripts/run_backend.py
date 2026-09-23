"""CLI tool to start the FastAPI telematics server via Uvicorn."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import argparse
import uvicorn


def main():
    parser = argparse.ArgumentParser(description="Run FastAPI Telematics Backend")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host interface (default 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")

    args = parser.parse_args()

    print(f"Starting Telematics API Server at http://{args.host}:{args.port}")
    print(f"Interactive OpenAPI Documentation: http://localhost:{args.port}/docs")
    uvicorn.run("backend.api.app:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
