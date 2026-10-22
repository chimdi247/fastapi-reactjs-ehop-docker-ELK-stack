# ShopEase — FastAPI + React e-commerce, fully containerised & observable

One command runs everything: the app, PostgreSQL, S3 object storage, **metrics in Grafana Mimir (stored in S3)**,
**structured logs in the ELK stack (archived to S3)**, and Grafana dashboards + e-mail alerts — all fed by OpenTelemetry.

```bash
docker compose up -d --build        # first build takes several minutes (images, Python deps, npm)
docker compose ps                   # wait ~2 min until everything is "healthy"
./tests/smoke/smoke.sh              # optional: verifies the whole stack in ~15 s
```

> **Requirements:** Docker with **≥ 8 GB RAM**. On Linux run `sudo sysctl -w vm.max_map_count=262144` once (Elasticsearch).

Log in at **http://localhost:3000** as **`chimdi247@gmail.com` / `password123`** (role **ADMIN**; the password is stored as an Argon2id hash).

| What | URL | Credentials |
|---|---|---|
| **Storefront** | http://localhost:3000 | chimdi247@gmail.com / password123 |
| API + Swagger | http://localhost:8084/docs | – |
| **Grafana** (metrics, SLOs, alerts) | http://localhost:3001 | admin / admin |
| **Kibana** (structured logs) | http://localhost:5601 | – |
| Mailpit (every e-mail incl. alerts) | http://localhost:8025 | – |
| MinIO console (the S3 buckets) | http://localhost:9001 | shopease-minio / shopease-minio-secret |

Reset everything (including the database, which re-runs the init SQL): `docker compose down -v`.

## Architecture

```
 Browser ─► nginx (frontend :3000) ─► React SPA ──► API :8084 (FastAPI)  ──► PostgreSQL
                                                       │   └─► MinIO / S3 (product & avatar images)
                                                       │   └─► SMTP (Mailpit by default)
                                                       ▼  OTLP (metrics + structured logs + traces)
                                              OpenTelemetry Collector
                       ┌──────────────────────────┴──────────────────────────┐
        METRICS  remote-write                                          LOGS (OTLP/JSON)
                       ▼                                                      ▼
              Grafana Mimir ──blocks──► S3 bucket `mimir-blocks`          Logstash ──► Elasticsearch ──► Kibana
                       ▲                                                      └──► S3 bucket `elk-logs-archive`
                       │ scraped by the collector                       Elasticsearch ──snapshots (SLM)──► S3 `es-snapshots`
   cAdvisor · node-exporter · postgres-exporter · MinIO · blackbox probes
                       │
                  Grafana (dashboard + SMTP alert rules)
```

## What's where

| Folder | Contents |
|---|---|
| `docker-compose.yml`, `.env`, `.env.example` | the whole stack, one file |
| `docker/postgres/init/` | `00-roles` · **`01-schema`** (all tables) · **`02-seed-admin-user`** (hashed password) · `03-seed-demo-catalog` · `04-monitoring-grants` |
| `docker/minio/init.sh` | creates the buckets + the log-archive lifecycle rule |
| `observability/otel/` | collector config, `otel-python.env` (the SDK/auto-instrumentation settings) |
| `observability/mimir/` | Mimir config (S3 backend) |
| `observability/elasticsearch/`, `logstash/`, `kibana/` | ELK config: ILM, data-stream template, S3 snapshots, pipeline, saved searches + dashboard |
| `observability/grafana/` | `grafana.ini` (SMTP), provisioning (Mimir datasource, dashboards, alert rules, contact point), dashboard JSON |
| `observability/tools/` | Python generator for the dashboard JSON (`python3 gen_overview.py`) |
| `tests/` | unit · integration · smoke · Playwright e2e · Selenium · k6 load/stress/spike/soak/breakpoint |

## How the telemetry works

* **Auto-instrumentation:** the API container starts as `opentelemetry-instrument uvicorn …`; the SDK is configured entirely by `OTEL_*`
  env vars (compose / `observability/otel/otel-python.env`). It instruments FastAPI, SQLAlchemy/asyncpg, httpx, botocore (S3) and
  `logging`, and propagates W3C `traceparent`.
* **Manual instrumentation** (`app/core/telemetry.py`, OpenTelemetry API): structured JSON logging with `trace.id`/`span.id`, one
  access-log line per request, spans around register / login / checkout / payment, and **business KPIs** —
  `shopease_users_registered_total`, `shopease_auth_logins_total{outcome,reason}`, `shopease_orders_created_total`,
  `shopease_order_value`, `shopease_revenue_total`, `shopease_payments_total{outcome}`, `shopease_emails_total{outcome}`, …
  Plus DB-derived KPIs (orders by status, stock levels, revenue) via postgres-exporter custom queries.
* **Metrics → Grafana:** collector → Prometheus remote-write → **Mimir** (blocks persisted in S3) → Grafana datasource `Mimir`.
* **Logs → Kibana:** collector → OTLP/JSON → **Logstash** (explodes + flattens to ECS-style fields) → **Elasticsearch** data stream
  `logs-shopease-default` (ILM: 30 days) → Kibana data view *ShopEase logs*, saved searches and the dashboard *ShopEase • Logs overview*.
  Logstash also writes gzipped JSON-lines to the **S3 archive bucket**, and a daily **snapshot** of the indices goes to S3.
  Find one request's logs across the stack with `trace.id : "<id>"`.
* **Traces** are generated (for log correlation) but not stored: the collector's traces pipeline ends in `nop`. Add Tempo/Jaeger there if you want them.

## Dashboard, SLOs & alerts

Grafana → **ShopEase → “ShopEase — Overview”** (home dashboard): uptime (black-box probes + container uptime), request totals
**successful vs failed**, error rate, p50/p95/p99 latency, slowest routes, **SLI/SLO** (availability 99.9 %, 95 % of requests < 500 ms),
error-budget remaining + burn rate, business KPIs (live counters and DB truth), **container & node CPU/memory** with the 40 % line,
PostgreSQL, S3 bucket usage, and telemetry-pipeline health.

**Alerts** (Grafana-managed, evaluated every minute, `for: 2m`): container CPU > 40 %, container memory > 40 %, node CPU > 40 %,
node memory > 40 %. They e-mail `ALERT_EMAIL_TO` through the SMTP block in `grafana.ini` — by default into **Mailpit**
(http://localhost:8025). For real delivery set `SMTP_HOST/PORT/USER/PASSWORD/SMTP_STARTTLS_POLICY` in `.env` and
`docker compose up -d grafana`. Test the mail path: Grafana → Alerting → Contact points → *email-oncall* → **Test**.
Trip a real alert: `tests/performance/run-perf.sh load`.
> JVM-style heavy containers (Elasticsearch, Logstash, Kibana, Mimir) normally run at 40–80 % of their memory limit, so the memory
> alert **will fire** for them. Raise their `mem_limit` or `ALERT_MEM_THRESHOLD` in `.env` if that is too noisy.

## Using real AWS S3 instead of MinIO

Edit `.env` (the comments in `.env.example` list every variable): `S3_ENDPOINT=s3.<region>.amazonaws.com`, `S3_ENDPOINT_URL=https://s3.<region>.amazonaws.com`,
`S3_PROTOCOL=https`, `S3_INSECURE=false`, `S3_PATH_STYLE=false`, `S3_REGION`, keys, your bucket names, and set
`AWS_ENDPOINT_URL=` / `AWS_PUBLIC_BASE_URL=` to empty. Create the buckets yourself (`minio-init` only manages MinIO).

## Changes made to your code (please review)

* **`app/core/telemetry.py`** (new) + hooks in `user_service`, `order_service`, `payment_service`, `cart_service`, `email_service` (one-line metric calls, `@traced` spans).
* **`app/main.py`:** structured logging + access-log middleware, `/ready` DB readiness probe, extra CORS origins via `CORS_ALLOW_ORIGINS`.
  **Fixed:** the startup log printed `settings.DATABASE_URL` *including the DB password* — it would now have been shipped to Elasticsearch and S3.
* **`app/api/auth.py`:** removed `print("code is", request.code)` — it wrote password-reset codes to the container logs.
* **`config.py` / `upload_service.py` / `email_service.py`:** new *optional* settings (`AWS_ENDPOINT_URL`, `AWS_PUBLIC_BASE_URL`, `MAIL_START_TLS`,
  `MAIL_VALIDATE_CERTS`, `CORS_ALLOW_ORIGINS`) so MinIO and a local SMTP sink work. Defaults keep the old behaviour — existing `.env` files are unaffected.
* **Frontend `api.ts`:** API URL is now `VITE_BACKEND_URL` (default unchanged: `http://localhost:8084`).
* **Dockerfiles:** backend rewritten (multi-stage, locked deps from `uv.lock`, non-root, healthcheck, OTel); frontend new (Node build → nginx).
  OpenTelemetry deps live in `requirements-otel.txt`, so `pyproject.toml` / `uv.lock` are untouched.

## ⚠️ Things you should know

1. **Security — anyone can register as ADMIN.** `POST /api/auth/register` is public and `register_new_user` stores `role=user_data.role` from the request body.
   Not changed (your admin-registration page relies on it), but it is tracked by an expected-failure test. Fix: ignore `role` on the public endpoint and
   create privileged users only from an authenticated admin route.
2. **Credentials:** the zip you uploaded contained `fastapi-eccomerce-backend/.env`. I did not read or copy its values (compose uses its own `.env` with placeholders),
   but if it holds real AWS / Stripe / Google / SMTP secrets, treat them as exposed and rotate them. Put real values for the integrations you need into the **root** `.env`.
3. **Not executed here.** I had no Docker or network in my sandbox, so I could not run `docker compose up`. What I verified: all YAML/JSON/SQL/shell/Python/JS parse; the SQL
   schema matches the SQLAlchemy models column-for-column; the Argon2id hash round-trips; the dashboard queries are bracket-balanced; the Logstash flattening logic and
   `telemetry.py` behave correctly against test inputs. Expect to tune something on first boot (most likely Elasticsearch memory / `vm.max_map_count`); run
   `./tests/smoke/smoke.sh` and `docker compose logs <service>`.
4. **Elasticsearch security is OFF** (dev convenience; ports bound to 127.0.0.1). Elasticsearch keeps live indices on its own volume — S3 holds the
   *snapshots* and Logstash's *archive* (searchable-snapshots-on-S3 needs a paid licence). Mimir's blocks live entirely in S3.
5. Checkout needs a real Stripe test key; Google login needs real OAuth credentials and a matching redirect URI (`/api/auth/google/callback` — your `.env.example` omits `/api`).
6. All credentials in this repo (Postgres, MinIO, Grafana) are **development defaults**.
