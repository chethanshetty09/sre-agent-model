"""
SRE Agent Main Application
Entry point for the Site Reliability Engineering Agent
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

import structlog
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from prometheus_client import generate_latest, Counter, Histogram
from starlette.responses import Response

from config.settings import get_settings
from api.routes import anomaly, infrastructure, incidents, metrics, health
from services.ml_model_manager import MLModelManager
from services.anomaly_detector import AnomalyDetector
from services.config_analyzer import ConfigurationAnalyzer
from services.incident_manager import IncidentManager
from utils.logging_config import setup_logging
from utils.security import get_current_user
from middleware.auth_middleware import AuthMiddleware
from middleware.metrics_middleware import MetricsMiddleware

# Initialize settings and logging
settings = get_settings()
setup_logging(settings.log_level)
logger = structlog.get_logger()

# Prometheus metrics
request_count = Counter('sre_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('sre_request_duration_seconds', 'Request duration')


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting SRE Agent application")
    
    try:
        # Initialize ML models
        logger.info("Loading ML models...")
        app.state.ml_manager = MLModelManager(settings)
        await app.state.ml_manager.initialize()
        
        # Initialize core services
        app.state.anomaly_detector = AnomalyDetector(app.state.ml_manager)
        app.state.config_analyzer = ConfigurationAnalyzer(app.state.ml_manager)
        app.state.incident_manager = IncidentManager(settings)
        
        # Start background tasks
        asyncio.create_task(run_background_tasks(app))
        
        logger.info("SRE Agent application started successfully")
        
    except Exception as e:
        logger.error("Failed to start application", error=str(e))
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down SRE Agent application")
    if hasattr(app.state, 'ml_manager'):
        await app.state.ml_manager.cleanup()


async def run_background_tasks(app: FastAPI):
    """Run background monitoring and analysis tasks"""
    try:
        while True:
            # Run anomaly detection
            if hasattr(app.state, 'anomaly_detector'):
                await app.state.anomaly_detector.run_detection_cycle()
            
            # Check for pending incidents
            if hasattr(app.state, 'incident_manager'):
                await app.state.incident_manager.process_pending_incidents()
            
            # Wait before next cycle
            await asyncio.sleep(30)  # 30 second cycles
            
    except Exception as e:
        logger.error("Background task error", error=str(e))


# Create FastAPI application
app = FastAPI(
    title="SRE Agent API",
    description="Intelligent Site Reliability Engineering Agent",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts
)

app.add_middleware(AuthMiddleware)
app.add_middleware(MetricsMiddleware)


# Include API routes
app.include_router(health.router, prefix="/api/v1/health", tags=["health"])
app.include_router(infrastructure.router, prefix="/api/v1/infrastructure", tags=["infrastructure"])
app.include_router(anomaly.router, prefix="/api/v1/anomalies", tags=["anomalies"])
app.include_router(incidents.router, prefix="/api/v1/incidents", tags=["incidents"])
app.include_router(metrics.router, prefix="/api/v1/metrics", tags=["metrics"])


@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with structured logging"""
    logger.error(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=True
    )
    
    return HTTPException(
        status_code=500,
        detail="An internal server error occurred"
    )


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with structured logging"""
    start_time = asyncio.get_event_loop().time()
    
    response = await call_next(request)
    
    duration = asyncio.get_event_loop().time() - start_time
    
    logger.info(
        "Request processed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration=duration,
        client_ip=request.client.host if request.client else None
    )
    
    # Update Prometheus metrics
    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    request_duration.observe(duration)
    
    return response


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=1 if settings.debug else settings.workers,
        log_config=None,  # Use our custom logging
        access_log=False,  # Handled by middleware
    )