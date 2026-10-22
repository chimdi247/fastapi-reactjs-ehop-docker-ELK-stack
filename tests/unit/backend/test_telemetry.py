"""app/core/telemetry.py — structured logging, access log middleware, business metrics, spans."""
import json
import logging

import pytest
from opentelemetry import trace
from opentelemetry.trace import NonRecordingSpan, SpanContext, TraceFlags

from app.core import telemetry as t


def _record(msg="hello", level=logging.INFO, exc_info=None, **extra):
    r = logging.LogRecord("shopease.test", level, __file__, 1, msg, (), exc_info)
    for k, v in extra.items():
        setattr(r, k, v)
    return r


# ───────────────────────── JsonFormatter ─────────────────────────
def test_json_formatter_emits_one_valid_ecs_style_object():
    doc = json.loads(t.JsonFormatter().format(_record("order created")))
    assert doc["message"] == "order created"
    assert doc["log"] == {"level": "info", "logger": "shopease.test"}
    assert doc["service"]["name"] == t.SERVICE_NAME
    assert doc["@timestamp"].endswith("+00:00")


def test_json_formatter_puts_custom_fields_under_fields():
    doc = json.loads(t.JsonFormatter().format(_record(http_status=503, duration_ms=12.5)))
    assert doc["fields"] == {"http_status": 503, "duration_ms": 12.5}


def test_json_formatter_hides_otel_internal_attributes():
    doc = json.loads(t.JsonFormatter().format(_record(otelTraceID="abc", otelSpanID="def", keep="me")))
    assert doc["fields"] == {"keep": "me"}


def test_json_formatter_serialises_exceptions():
    try:
        raise ValueError("boom")
    except ValueError:
        import sys
        doc = json.loads(t.JsonFormatter().format(_record("failed", logging.ERROR, exc_info=sys.exc_info())))
    assert doc["error"]["type"] == "ValueError"
    assert doc["error"]["message"] == "boom"
    assert "Traceback" in doc["error"]["stack_trace"]


def test_json_formatter_never_crashes_on_unserialisable_values():
    doc = json.loads(t.JsonFormatter().format(_record(weird=object())))
    assert "weird" in doc["fields"]


def test_log_lines_carry_trace_and_span_ids_for_correlation():
    ctx = SpanContext(trace_id=int("5b8efff798038103d269b633813fc60c", 16), span_id=int("eee19b7ec3c1b174", 16),
                      is_remote=False, trace_flags=TraceFlags(TraceFlags.SAMPLED))
    with trace.use_span(NonRecordingSpan(ctx)):
        doc = json.loads(t.JsonFormatter().format(_record()))
    assert doc["trace"]["id"] == "5b8efff798038103d269b633813fc60c"
    assert doc["span"]["id"] == "eee19b7ec3c1b174"


def test_no_trace_fields_without_an_active_span():
    doc = json.loads(t.JsonFormatter().format(_record()))
    assert "trace" not in doc and "span" not in doc


# ───────────────────────── setup_logging ─────────────────────────
def test_setup_logging_is_idempotent_and_reroutes_uvicorn():
    t.setup_logging("INFO")
    t.setup_logging("INFO")
    root = logging.getLogger()
    assert sum(1 for h in root.handlers if getattr(h, "_shopease_json", False)) == 1
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        assert logging.getLogger(name).propagate is True
        assert logging.getLogger(name).handlers == []


# ───────────────────────── AccessLogMiddleware ─────────────────────────
@pytest.fixture()
def client():
    from fastapi import FastAPI, HTTPException
    from fastapi.testclient import TestClient

    app = FastAPI()
    app.add_middleware(t.AccessLogMiddleware)

    @app.get("/ok")
    async def ok(): return {"ok": True}

    @app.get("/missing")
    async def missing(): raise HTTPException(404, "nope")

    @app.get("/boom")
    async def boom(): raise RuntimeError("kaboom")

    @app.get("/api/health")
    async def health(): return {"status": "ok"}

    return TestClient(app, raise_server_exceptions=False)


def _access(caplog):
    return [r for r in caplog.records if r.name == "shopease.access"]


def test_access_log_levels_follow_status(client, caplog):
    caplog.set_level(logging.DEBUG, logger="shopease.access")
    client.get("/ok"); client.get("/missing"); client.get("/boom")
    by_status = {r.http_status: r for r in _access(caplog)}
    assert by_status[200].levelno == logging.INFO
    assert by_status[404].levelno == logging.WARNING
    assert by_status[500].levelno == logging.ERROR


def test_access_log_has_structured_fields(client, caplog):
    caplog.set_level(logging.INFO, logger="shopease.access")
    client.get("/ok")
    rec = _access(caplog)[0]
    assert rec.http_method == "GET" and rec.http_path == "/ok" and rec.http_status == 200
    assert rec.duration_ms >= 0


def test_health_probes_do_not_spam_the_log(client, caplog):
    caplog.set_level(logging.INFO, logger="shopease.access")
    client.get("/api/health")
    assert _access(caplog) == []          # logged at DEBUG only


# ───────────────────────── business metrics + spans ─────────────────────────
def test_business_metrics_calls_never_raise_without_an_sdk():
    b = t.BusinessMetrics()
    b.user_registered("CUSTOMER"); b.login(True); b.login(False, "bad_password")
    b.order_created(99.5, 3); b.order_status_changed("SHIPPED")
    b.payment(True, 99.5); b.payment(False); b.cart_item_added(2)
    b.email_sent("welcome.html", True); b.email_sent("order_confirmation.html", False)


@pytest.mark.asyncio
async def test_traced_decorator_returns_value_and_preserves_metadata():
    @t.traced("unit.test")
    async def add(a, b):
        """adds"""
        return a + b
    assert await add(2, 3) == 5
    assert add.__name__ == "add" and add.__doc__ == "adds"


@pytest.mark.asyncio
async def test_traced_decorator_propagates_exceptions():
    @t.traced("unit.fail")
    async def bad(): raise KeyError("x")
    with pytest.raises(KeyError):
        await bad()
