# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# ShopEase API — multi-stage build
#   builder : resolves the EXACT locked dependency set (uv.lock) + OpenTelemetry
#   runtime : slim image, non-root user, no compilers, healthcheck, OTel auto-instrumentation
# ─────────────────────────────────────────────────────────────────────────────
ARG PYTHON_VERSION=3.13

FROM python:${PYTHON_VERSION}-slim AS builder
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never
# `latest` (as before): the lock file is produced by a recent uv, an old uv may not read it.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Compilers only exist in this stage (some wheels, e.g. asyncmy/greenlet, may build from source)
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv venv /opt/venv \
 && uv export --frozen --no-dev --no-emit-project --no-hashes -o /tmp/requirements.txt \
 && uv pip install --python /opt/venv/bin/python -r /tmp/requirements.txt

# OpenTelemetry: SDK + OTLP exporter + the instrumentation libraries that match what is installed
# (FastAPI, SQLAlchemy, asyncpg, httpx, botocore, logging, ...) discovered by `opentelemetry-bootstrap`.
COPY requirements-otel.txt ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --python /opt/venv/bin/python -r requirements-otel.txt \
 && /opt/venv/bin/opentelemetry-bootstrap -a requirements \
      | uv pip install --python /opt/venv/bin/python -r -

# ─────────────────────────────────────────────────────────────────────────────
FROM python:${PYTHON_VERSION}-slim AS runtime
ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 1001 --create-home app

COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY --chown=app:app . .
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads
USER app

EXPOSE 8084
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -fsS http://localhost:8084/api/health || exit 1

# `opentelemetry-instrument` builds the SDK from the OTEL_* env vars (docker-compose.yml) and
# auto-instruments the app. No --reload (that is for laptops), no uvicorn access log (the app writes
# a structured access-log line per request instead). Scale with replicas, not --workers, so each
# process owns exactly one OTel metric reader.
CMD ["opentelemetry-instrument", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8084", "--no-access-log", "--proxy-headers"]
