"""Observability glue for the API (OpenTelemetry API only — no SDK wiring here).

How the pieces fit together
---------------------------
* The container starts the app with ``opentelemetry-instrument`` (see Dockerfile). That launcher
  builds the SDK from the standard ``OTEL_*`` environment variables and AUTO-instruments FastAPI,
  SQLAlchemy/asyncpg, httpx, botocore (S3), ... -> traces + HTTP/DB metrics + OTLP logs.
* This module adds what auto-instrumentation cannot know:
    1. structured JSON logging with ``trace.id`` / ``span.id`` correlation (stdout + OTLP),
    2. one structured access-log line per HTTP request,
    3. business KPIs (registrations, logins, orders, revenue, payments, e-mails) as OTel metrics,
    4. a ``traced`` decorator for manual spans around business operations.
* Every ``opentelemetry`` call is a harmless no-op when no SDK is configured
  (``python main.py`` on a laptop, unit tests), so the app never depends on the collector.

Metric names as they appear in Mimir (Prometheus naming): ``shopease_users_registered_total``,
``shopease_auth_logins_total{outcome}``, ``shopease_orders_created_total``,
``shopease_order_value_bucket``, ``shopease_revenue_total``, ``shopease_payments_total{outcome}``,
``shopease_order_status_changes_total{status}``, ``shopease_cart_items_added_total``,
``shopease_emails_total{template,outcome}``.
"""

from __future__ import annotations

import functools
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

from opentelemetry import metrics, trace

SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "shopease-api")
ENVIRONMENT = os.getenv("DEPLOYMENT_ENVIRONMENT", "local")

tracer = trace.get_tracer("shopease.api")
_meter = metrics.get_meter("shopease.business")


# --------------------------------------------------------------------------------------
# 1. Structured logging
# --------------------------------------------------------------------------------------
# Attributes every LogRecord has (so anything ELSE passed via `extra={...}` is a custom field).
_STD_ATTRS = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {"message", "asctime", "taskName"}


class JsonFormatter(logging.Formatter):
    """One JSON object per line, ECS-flavoured so Kibana understands it out of the box."""

    def format(self, record: logging.LogRecord) -> str:
        doc: dict[str, Any] = {
            "@timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds"),
            "log": {"level": record.levelname.lower(), "logger": record.name},
            "message": record.getMessage(),
            "service": {"name": SERVICE_NAME, "environment": ENVIRONMENT},
        }

        ctx = trace.get_current_span().get_span_context()
        if ctx.is_valid:  # correlation: click a log in Kibana -> filter the whole request by trace.id
            doc["trace"] = {"id": format(ctx.trace_id, "032x")}
            doc["span"] = {"id": format(ctx.span_id, "016x")}

        fields = {
            k: v for k, v in record.__dict__.items()
            if k not in _STD_ATTRS and not k.startswith(("_", "otel"))
        }
        if fields:
            doc["fields"] = fields

        if record.exc_info and record.exc_info[0] is not None:
            doc["error"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "stack_trace": self.formatException(record.exc_info),
            }
        return json.dumps(doc, default=str, separators=(",", ":"), ensure_ascii=False)


def setup_logging(level: str | None = None) -> None:
    """Idempotent. Call once at import time of the app (uvicorn has already configured its own logging)."""
    level_name = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    root = logging.getLogger()
    root.setLevel(level_name)

    # Keep any handler already attached (notably the OTel LoggingHandler that ships logs over OTLP);
    # only make sure exactly one JSON stdout handler exists.
    if not any(getattr(h, "_shopease_json", False) for h in root.handlers):
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        handler._shopease_json = True  # type: ignore[attr-defined]
        root.addHandler(handler)

    # uvicorn installs its own plain-text handlers and stops propagation -> route them through root
    # so they become JSON on stdout AND reach OTLP. (Access log is replaced by the middleware below.)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        lg = logging.getLogger(name)
        lg.handlers = []
        lg.propagate = True

    # chatty libraries
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("aiosmtplib").setLevel(logging.WARNING)


# --------------------------------------------------------------------------------------
# 2. Structured access log (ASGI middleware, registered in app/main.py)
# --------------------------------------------------------------------------------------
_access_log = logging.getLogger("shopease.access")
_QUIET_PATHS = {"/api/health", "/ready", "/hello"}  # probes: log at DEBUG to avoid noise


class AccessLogMiddleware:
    """Pure-ASGI (no BaseHTTPMiddleware => no streaming/background-task quirks)."""

    def __init__(self, app: Callable[..., Awaitable[None]]) -> None:
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        status_holder = {"code": 500}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_holder["code"] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception:
            _access_log.error("request failed with unhandled exception", extra=self._fields(scope, 500, start), exc_info=True)
            raise
        else:
            code = status_holder["code"]
            path = scope.get("path", "")
            if path in _QUIET_PATHS:
                level = logging.DEBUG
            else:
                level = logging.ERROR if code >= 500 else logging.WARNING if code >= 400 else logging.INFO
            _access_log.log(level, f'{scope["method"]} {path} -> {code}', extra=self._fields(scope, code, start))

    @staticmethod
    def _fields(scope, code: int, start: float) -> dict[str, Any]:
        route = scope.get("route")
        client = scope.get("client")
        return {
            "http_method": scope.get("method"),
            "http_path": scope.get("path"),
            "http_route": getattr(route, "path", None),
            "http_status": code,
            "duration_ms": round((time.perf_counter() - start) * 1000, 2),
            "client_ip": client[0] if client else None,
        }


# --------------------------------------------------------------------------------------
# 3. Business KPIs (manual metric instrumentation)
# --------------------------------------------------------------------------------------
class BusinessMetrics:
    """Thin, typed facade so call sites stay one-liners and metric names live in ONE place."""

    def __init__(self) -> None:
        m = _meter
        self._registered = m.create_counter("shopease.users.registered", description="Accounts created")
        self._logins = m.create_counter("shopease.auth.logins", description="Login attempts by outcome")
        self._orders = m.create_counter("shopease.orders.created", description="Orders created at checkout")
        self._order_value = m.create_histogram("shopease.order.value", description="Order total (currency units)")
        self._status = m.create_counter("shopease.order.status_changes", description="Order status transitions")
        self._payments = m.create_counter("shopease.payments", description="Payments by outcome")
        self._revenue = m.create_counter("shopease.revenue", description="Revenue from completed payments")
        self._cart_adds = m.create_counter("shopease.cart.items_added", description="Units added to carts")
        self._emails = m.create_counter("shopease.emails", description="Transactional e-mails by template/outcome")

    def user_registered(self, role: str) -> None:
        self._registered.add(1, {"role": str(getattr(role, "value", role))})

    def login(self, ok: bool, reason: str = "") -> None:
        self._logins.add(1, {"outcome": "success" if ok else "failure", "reason": reason or ("ok" if ok else "unknown")})

    def order_created(self, total: float, items: int) -> None:
        self._orders.add(1)
        self._order_value.record(float(total), {"items": str(min(items, 10))})

    def order_status_changed(self, status: str) -> None:
        self._status.add(1, {"status": str(getattr(status, "value", status))})

    def payment(self, completed: bool, amount: float = 0.0) -> None:
        self._payments.add(1, {"outcome": "completed" if completed else "failed"})
        if completed:
            self._revenue.add(float(amount))

    def cart_item_added(self, quantity: int) -> None:
        self._cart_adds.add(int(quantity))

    def email_sent(self, template: str, ok: bool) -> None:
        self._emails.add(1, {"template": template.rsplit(".", 1)[0], "outcome": "sent" if ok else "failed"})


biz = BusinessMetrics()


# --------------------------------------------------------------------------------------
# 4. Manual spans
# --------------------------------------------------------------------------------------
def traced(name: str, **static_attrs: Any):
    """Wrap an ``async def`` in a span. Exceptions are recorded on the span and re-raised."""

    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            with tracer.start_as_current_span(name, attributes=static_attrs or None):
                return await fn(*args, **kwargs)

        return wrapper

    return decorator
