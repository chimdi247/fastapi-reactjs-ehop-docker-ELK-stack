import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.db.database import engine
from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import ApiException, api_exception_handler
from app.core.telemetry import AccessLogMiddleware, setup_logging

# Structured JSON logs (+ trace correlation). Must run before anything logs.
setup_logging()
logger = logging.getLogger("shopease.app")


@asynccontextmanager
async def lifespan(app: FastAPI):

    # --- Startup Logic ---
    # NOTE: never log settings.DATABASE_URL — it contains the password, and logs are shipped
    # to Elasticsearch / S3. hide_password renders postgresql+asyncpg://user:***@host/db
    safe_url = engine.url.render_as_string(hide_password=True)
    logger.info("Connecting to database", extra={"db_url": safe_url})
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successful", extra={"db_url": safe_url})
    except Exception:
        logger.error("Database connection failed", extra={"db_url": safe_url}, exc_info=True)
        raise

    yield

    # --- Shutdown Logic ---
    logger.info("Closing database connection pool")
    await engine.dispose()
    logger.info("Database connection pool closed")



app = FastAPI(title="Shopease", version="0.1.0", lifespan=lifespan)


_extra_origins = [o.strip() for o in settings.CORS_ALLOW_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:4200","http://deploy-shopease856.s3-website.eu-north-1.amazonaws.com", *_extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added last => outermost: logs every request (incl. CORS preflights) as one structured line.
app.add_middleware(AccessLogMiddleware)


@app.get("/hello")
async def say_hello():
    return {"message": "Hello World"}


@app.get("/ready")
async def readiness():
    """Readiness probe: the API is only 'ready' if the database answers."""
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    return {"status": "ready"}

app.add_exception_handler(ApiException, api_exception_handler)

app.include_router(api_router, prefix="/api")
