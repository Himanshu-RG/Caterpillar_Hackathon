"""FastAPI application entrypoint for the telematics platform."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.data_hub.database import init_db
from backend.inference.model_loader import ModelLoader
from backend.api.machines import router as machines_router
from backend.api.telemetry import router as telemetry_router
from backend.api.predictions import router as predictions_router
from backend.api.safety import router as safety_router
from backend.api.tasks import router as tasks_router
from backend.api.operators import router as operators_router
from backend.api.maintenance import router as maintenance_router
from backend.api.insights import router as insights_router
from backend.api.websocket import router as websocket_router
from backend.api.incidents import router as incidents_router
from backend.api.assistant import router as assistant_router
from backend.api.simulator import router as simulator_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle management."""
    logger.info("Initializing database tables...")
    init_db()

    logger.info("Pre-loading ML model artifacts...")
    loader = ModelLoader()
    try:
        loader.load_model("failure")
        loader.load_model("safety")
        loader.load_model("task_time")
        logger.info("All model artifacts preloaded successfully.")
    except Exception as exc:
        logger.warning("Models could not be preloaded at startup: %s. Run train_and_save_models.py.", exc)

    yield
    logger.info("Shutting down telematics backend.")


app = FastAPI(
    title="Caterpillar-Style Industrial Machinery Telematics & Intelligence Platform",
    description=(
        "Production-structured prototype API for real-time telemetry streaming, "
        "predictive maintenance inference, in-cab safety guardian, and actionable intelligence."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for browser frontends and dashboards
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all domain routers
app.include_router(machines_router)
app.include_router(telemetry_router)
app.include_router(predictions_router)
app.include_router(safety_router)
app.include_router(tasks_router)
app.include_router(operators_router)
app.include_router(maintenance_router)
app.include_router(insights_router)
app.include_router(websocket_router)
app.include_router(incidents_router)
app.include_router(assistant_router)
app.include_router(simulator_router)


@app.get("/api/health", tags=["Health"])
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": "cat_telematics_platform",
        "version": "1.0.0",
        "environment": "prototype_demo",
    }


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Caterpillar-Style Industrial Telematics Platform API",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_check": "/api/health",
        "fleet_summary": "/api/fleet/summary",
    }
