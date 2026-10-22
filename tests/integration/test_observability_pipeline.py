"""PROVES the telemetry path end to end:

  API ──OTLP──► collector ──► Mimir (metrics, stored in S3)      ──► Grafana
                         └──► Logstash ──► Elasticsearch ──► Kibana   (+ S3 archive)

These tests generate real traffic, then poll the backends until the data shows up.
"""
import os
import uuid

import pytest
import requests

from conftest import Api, wait_until

MIMIR = os.getenv("MIMIR_URL", "http://localhost:9009")
ES = os.getenv("ES_URL", "http://localhost:9200")
KIBANA = os.getenv("KIBANA_URL", "http://localhost:5601")
GRAFANA = os.getenv("GRAFANA_URL", "http://localhost:3001")
GF_AUTH = (os.getenv("GRAFANA_USER", "admin"), os.getenv("GRAFANA_PASSWORD", "admin"))
MINIO = os.getenv("MINIO_URL", "http://localhost:9000")

pytestmark = pytest.mark.observability


def promql(query):
    r = requests.get(f"{MIMIR}/prometheus/api/v1/query", params={"query": query}, timeout=10)
    r.raise_for_status()
    return r.json()["data"]["result"]


def sample(query):
    res = promql(query)
    return float(res[0]["value"][1]) if res else None


# ───────────────────────── metrics -> Mimir ─────────────────────────
def test_http_metrics_reach_mimir():
    for _ in range(5):
        Api().get("/products")
    ok = wait_until(lambda: promql('http_server_request_duration_seconds_count{service_name="shopease-api"}'), timeout=90)
    assert ok, "no auto-instrumented HTTP metrics in Mimir"


def test_business_metric_login_failures_reach_mimir():
    api = Api()
    before = sample('sum(shopease_auth_logins_total{outcome="failure"})') or 0
    for _ in range(3):
        api.login(f"nobody-{uuid.uuid4().hex[:6]}@example.com", "wrong")
    after = wait_until(lambda: (lambda v: v if v is not None and v >= before + 3 else None)(
        sample('sum(shopease_auth_logins_total{outcome="failure"})')), timeout=90)
    assert after is not None, "custom OTel counter shopease_auth_logins_total never advanced in Mimir"


def test_business_metric_registrations_reach_mimir(customer):
    assert wait_until(lambda: promql("shopease_users_registered_total"), timeout=90)


def test_infrastructure_metrics_are_scraped_into_mimir():
    for q in ('container_memory_working_set_bytes{name="ecommerce-api"}',
              "node_memory_MemTotal_bytes", "pg_up", 'probe_success{service="ecommerce-api"}'):
        assert wait_until(lambda q=q: promql(q), timeout=120), f"missing in Mimir: {q}"


def test_database_kpis_are_exported():
    assert wait_until(lambda: promql("pg_shopease_users_count"), timeout=120)


# ───────────────────────── logs -> Elasticsearch / Kibana ─────────────────────────
def es_hits(query):
    r = requests.post(f"{ES}/logs-shopease-*/_search", json={"size": 5, "query": query,
                      "sort": [{"@timestamp": "desc"}]}, timeout=15)
    return r.json().get("hits", {}).get("hits", []) if r.status_code == 200 else []


def test_structured_http_logs_are_searchable():
    marker = f"/api/does-not-exist-{uuid.uuid4().hex[:8]}"
    requests.get(f"{os.getenv('API_URL', 'http://localhost:8084')}{marker}", timeout=10)
    hits = wait_until(lambda: es_hits({"match_phrase": {"fields.http_path": marker}}), timeout=120)
    assert hits, "request log line never arrived in Elasticsearch"
    doc = hits[0]["_source"]
    assert doc["service"]["name"] == "shopease-api"
    assert doc["fields"]["http_status"] == 404
    assert doc["log"]["level"] == "warning"
    assert "duration_ms" in doc["fields"]


def test_logs_are_correlated_with_trace_ids():
    Api().get("/products")
    hits = wait_until(lambda: es_hits({"exists": {"field": "trace.id"}}), timeout=120)
    assert hits and len(hits[0]["_source"]["trace"]["id"]) == 32


def test_log_pipeline_template_and_ilm_are_in_place():
    assert requests.get(f"{ES}/_index_template/shopease-logs", timeout=10).status_code == 200
    assert requests.get(f"{ES}/_ilm/policy/shopease-logs", timeout=10).status_code == 200
    assert requests.get(f"{ES}/_snapshot/s3_logs", timeout=10).status_code == 200      # S3 snapshot repository


def test_kibana_data_view_and_dashboard_exist():
    h = {"kbn-xsrf": "true"}
    assert requests.get(f"{KIBANA}/api/data_views/data_view/shopease-logs", headers=h, timeout=15).status_code == 200
    assert requests.get(f"{KIBANA}/api/saved_objects/dashboard/shopease-dashboard-logs", headers=h, timeout=15).status_code == 200


# ───────────────────────── S3 persistence ─────────────────────────
def s3():
    boto3 = pytest.importorskip("boto3")
    return boto3.client(
        "s3", endpoint_url=os.getenv("S3_ENDPOINT_URL_HOST", MINIO),
        aws_access_key_id=os.getenv("S3_ACCESS_KEY", "shopease-minio"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY", "shopease-minio-secret"),
        region_name=os.getenv("S3_REGION", "us-east-1"))


@pytest.mark.parametrize("bucket", ["mimir-blocks", "mimir-ruler", "elk-logs-archive", "es-snapshots", "ecommerce-uploads"])
def test_all_buckets_exist(bucket):
    s3().head_bucket(Bucket=bucket)          # raises ClientError if missing


@pytest.mark.slow
def test_logstash_archives_logs_into_the_s3_bucket():
    """Logstash rotates its S3 archive every 5 minutes (or 10 MiB) — so allow up to ~8 minutes."""
    client = s3()
    for _ in range(20):
        Api().get("/products")                # make sure there is something to archive

    def archived():
        resp = client.list_objects_v2(Bucket="elk-logs-archive", Prefix="logs/")
        return [o["Key"] for o in resp.get("Contents", []) if o["Size"] > 0]

    keys = wait_until(archived, timeout=480, interval=15)
    assert keys, "no gzipped log files in s3://elk-logs-archive/logs/ — check `docker compose logs logstash`"
    assert keys[0].endswith(".gz")


def test_mimir_reports_s3_as_its_storage_backend():
    cfg = requests.get(f"{MIMIR}/config", timeout=10).text
    assert "bucket_name: mimir-blocks" in cfg and "backend: s3" in cfg


# ───────────────────────── Grafana provisioning ─────────────────────────
def test_grafana_has_mimir_datasource_dashboard_and_alert_rules():
    ds = requests.get(f"{GRAFANA}/api/datasources", auth=GF_AUTH, timeout=10).json()
    assert any(d["uid"] == "mimir" and d["type"] == "prometheus" for d in ds)
    dash = requests.get(f"{GRAFANA}/api/search?type=dash-db", auth=GF_AUTH, timeout=10).json()
    assert any(d["uid"] == "shopease-overview" for d in dash)
    rules = requests.get(f"{GRAFANA}/api/v1/provisioning/alert-rules", auth=GF_AUTH, timeout=10).json()
    assert {"container-cpu-high", "container-memory-high", "node-cpu-high", "node-memory-high"} <= {r["uid"] for r in rules}
    cps = requests.get(f"{GRAFANA}/api/v1/provisioning/contact-points", auth=GF_AUTH, timeout=10).json()
    assert any(c["type"] == "email" for c in cps)


def test_grafana_can_query_mimir():
    r = requests.get(f"{GRAFANA}/api/datasources/proxy/uid/mimir/api/v1/query", params={"query": "up"}, auth=GF_AUTH, timeout=15)
    assert r.status_code == 200 and r.json()["status"] == "success"
