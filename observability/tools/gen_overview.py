from dashlib import *

D = Dash("shopease-overview", "ShopEase — Overview (SLI / SLO / KPIs / Infra)",
         ["shopease", "slo", "red", "business"],
         "Uptime, latency, SLI/SLO, error rates, request totals, business KPIs, container & node CPU/memory, "
         "Postgres, S3 storage and telemetry-pipeline health. Data source: Grafana Mimir. Logs live in Kibana.")
D.var_const("slo_availability", 99.9, "Availability SLO %")
D.var_const("slo_latency_s", 0.5, "Latency SLO (s)")

SEL = 'service_name="shopease-api", http_route!~"/api/health|/ready|/hello"'
CNT  = f"http_server_request_duration_seconds_count{{{SEL}}}"
CNT5 = f'http_server_request_duration_seconds_count{{{SEL}, http_response_status_code=~"5.."}}'
CNT_OK   = f'http_server_request_duration_seconds_count{{{SEL}, http_response_status_code=~"[23].."}}'
CNT_FAIL = f'http_server_request_duration_seconds_count{{{SEL}, http_response_status_code=~"[45].."}}'
BKT = f"http_server_request_duration_seconds_bucket{{{SEL}}}"

# ───────────────────────── UPTIME ─────────────────────────
D.row("Uptime & availability")
D.stat("Service status (black-box probe)", [('probe_success{job="blackbox-http"}', "{{service}}")],
       w=12, h=5, mappings=UP_DOWN, th=[(None, RED), (1, GREEN)],
       desc="1 = the service's health endpoint answered 2xx in the last probe.")
D.bargauge("Uptime % (selected range)", [('100 * avg_over_time(probe_success{job="blackbox-http"}[$__range])', "{{service}}")],
           w=12, h=5, unit="percent", minv=95, maxv=100, th=[(None, RED), (99, ORANGE), (99.9, GREEN)])
D.table("Container uptime", [('time() - container_start_time_seconds{name!=""}', "uptime")], w=12, h=7, unit="s", sort_by="Value",
        transforms=[{"id": "organize", "options": {"excludeByName": {"Time": True, "id": True, "image": True, "instance": True, "job": True, "cluster": True}, "renameByName": {"Value": "Uptime", "name": "Container"}}}])
D.timeseries("Container restarts in range", [('changes(container_start_time_seconds{name!=""}[$__range])', "{{name}}")],
             w=12, h=7, draw="bars", fill=60, desc="Non-zero = restarted within the selected range.")

# ───────────────────────── TRAFFIC ─────────────────────────
D.row("HTTP traffic — successful vs failed")
D.stat("Total requests", [(f"sum(increase({CNT}[$__range]))", "")], w=4, h=4, color_mode="value", decimals=0, th=[(None, BLUE)])
D.stat("Successful (2xx/3xx)", [(f"sum(increase({CNT_OK}[$__range])) or vector(0)", "")], w=5, h=4, decimals=0, th=[(None, GREEN)])
D.stat("Failed (4xx + 5xx)", [(f"sum(increase({CNT_FAIL}[$__range])) or vector(0)", "")], w=5, h=4, decimals=0, th=[(None, GREEN), (1, ORANGE), (100, RED)])
D.stat("Server errors (5xx)", [(f"sum(increase({CNT5}[$__range])) or vector(0)", "")], w=5, h=4, decimals=0, th=[(None, GREEN), (1, RED)])
D.stat("Request rate", [(f"sum(rate({CNT}[$__rate_interval]))", "")], w=5, h=4, unit="reqps", color_mode="value", th=[(None, BLUE)], graph=True, decimals=2)
D.timeseries("Requests/sec by route", [(f"sum by (http_route) (rate({CNT}[$__rate_interval]))", "{{http_route}}")], w=8, unit="reqps", stack=True)
D.timeseries("Requests/sec by status code", [(f"sum by (http_response_status_code) (rate({CNT}[$__rate_interval]))", "{{http_response_status_code}}")], w=8, unit="reqps", stack=True)
D.timeseries("Successful vs failed requests/sec",
             [(f"sum(rate({CNT_OK}[$__rate_interval])) or vector(0)", "successful"), (f"sum(rate({CNT_FAIL}[$__rate_interval])) or vector(0)", "failed")],
             w=8, unit="reqps",
             overrides=[{"matcher": {"id": "byName", "options": "failed"}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "red"}}]},
                        {"matcher": {"id": "byName", "options": "successful"}, "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "green"}}]}])
D.timeseries("Error rate % (5xx)", [(f"100 * sum(rate({CNT5}[$__rate_interval])) / sum(rate({CNT}[$__rate_interval]))", "5xx %")],
             w=12, unit="percent", th=[(None, GREEN), (1, RED)], minv=0, desc="Share of requests answered with HTTP 5xx. Red line = 1 %.")
D.timeseries("Failed requests/sec by route (4xx + 5xx)", [(f"sum by (http_route, http_response_status_code) (rate({CNT_FAIL}[$__rate_interval]))", "{{http_route}} {{http_response_status_code}}")], w=12, unit="reqps")

# ───────────────────────── LATENCY ─────────────────────────
D.row("Latency")
D.timeseries("Latency percentiles", [
    (f"histogram_quantile(0.50, sum by (le) (rate({BKT}[$__rate_interval])))", "p50"),
    (f"histogram_quantile(0.95, sum by (le) (rate({BKT}[$__rate_interval])))", "p95"),
    (f"histogram_quantile(0.99, sum by (le) (rate({BKT}[$__rate_interval])))", "p99")], w=8, unit="s")
D.timeseries("p95 latency by route", [(f"histogram_quantile(0.95, sum by (le, http_route) (rate({BKT}[$__rate_interval])))", "{{http_route}}")],
             w=8, unit="s", th=[(None, GREEN), (0.5, RED)], desc="Red line = latency SLO (500 ms).")
D.timeseries("Average latency", [(f"sum(rate(http_server_request_duration_seconds_sum{{{SEL}}}[$__rate_interval])) / sum(rate({CNT}[$__rate_interval]))", "avg")], w=8, unit="s")
D.table("Slowest routes (p95, selected range)", [(f"topk(10, histogram_quantile(0.95, sum by (le, http_route, http_request_method) (rate({BKT}[$__range]))))", "")],
        w=24, h=7, unit="s", sort_by="Value",
        transforms=[{"id": "organize", "options": {"excludeByName": {"Time": True}, "renameByName": {"Value": "p95", "http_route": "Route", "http_request_method": "Method"}}}])

# ───────────────────────── SLI / SLO ─────────────────────────
D.row("SLI / SLO  (availability 99.9 %, latency: 95 % of requests under 500 ms)")
D.stat("Availability SLI (non-5xx)", [(f"100 * (1 - (sum(increase({CNT5}[$__range])) or vector(0)) / sum(increase({CNT}[$__range])))", "")],
       w=6, h=5, unit="percent", decimals=3, th=[(None, RED), (99, ORANGE), (99.9, GREEN)], desc="Good requests / all requests in range. SLO 99.9 %.")
D.stat("Latency SLI (requests < 500 ms)", [(f'100 * sum(increase(http_server_request_duration_seconds_bucket{{{SEL}, le="0.5"}}[$__range])) / sum(increase({CNT}[$__range]))', "")],
       w=6, h=5, unit="percent", decimals=2, th=[(None, RED), (90, ORANGE), (95, GREEN)], desc="Share served in <= 500 ms. SLO 95 %.")
D.gauge("Error budget remaining", [(f"clamp(100 * (1 - ((sum(increase({CNT5}[$__range])) or vector(0)) / sum(increase({CNT}[$__range]))) / 0.001), 0, 100)", "")],
        w=6, h=5, th=[(None, RED), (25, ORANGE), (50, GREEN)], desc="Budget = 0.1 % of requests may fail (99.9 % SLO). 100 % = untouched.")
D.stat("Satisfied (< 250 ms)", [(f'100 * sum(increase(http_server_request_duration_seconds_bucket{{{SEL}, le="0.25"}}[$__range])) / sum(increase({CNT}[$__range]))', "")],
       w=6, h=5, unit="percent", decimals=1, th=[(None, RED), (80, ORANGE), (90, GREEN)])
D.timeseries("Error-budget burn rate (5m and 1h)", [
    (f"(sum(rate({CNT5}[5m])) / sum(rate({CNT}[5m]))) / 0.001", "5m burn"),
    (f"(sum(rate({CNT5}[1h])) / sum(rate({CNT}[1h]))) / 0.001", "1h burn")], w=12, th=[(None, GREEN), (1, RED)], minv=0,
    desc="1.0 = burning the budget exactly as fast as the SLO allows; >1 = SLO at risk.")
D.timeseries("Latency SLI over time (% < 500 ms)", [
    (f'100 * sum(rate(http_server_request_duration_seconds_bucket{{{SEL}, le="0.5"}}[$__rate_interval])) / sum(rate({CNT}[$__rate_interval]))', "% under 500 ms")],
    w=12, unit="percent", minv=0, maxv=100, th=[(None, RED), (95, GREEN)])

# ───────────────────────── BUSINESS KPIs ─────────────────────────
D.row("Business KPIs — live counters (OpenTelemetry manual metrics)")
D.stat("Orders created", [("sum(increase(shopease_orders_created_total[$__range])) or vector(0)", "")], w=4, decimals=0, th=[(None, BLUE)])
D.stat("Revenue (completed payments)", [("sum(increase(shopease_revenue_total[$__range])) or vector(0)", "")], w=4, unit="currencyUSD", decimals=2, th=[(None, GREEN)])
D.stat("Avg order value", [("sum(increase(shopease_order_value_sum[$__range])) / sum(increase(shopease_order_value_count[$__range]))", "")], w=4, unit="currencyUSD", decimals=2, th=[(None, BLUE)])
D.stat("Payment success rate", [('100 * (sum(increase(shopease_payments_total{outcome="completed"}[$__range])) or vector(0)) / sum(increase(shopease_payments_total[$__range]))', "")],
       w=4, unit="percent", decimals=1, th=[(None, RED), (90, ORANGE), (97, GREEN)])
D.stat("New registrations", [("sum(increase(shopease_users_registered_total[$__range])) or vector(0)", "")], w=4, decimals=0, th=[(None, BLUE)])
D.stat("Login success rate", [('100 * (sum(increase(shopease_auth_logins_total{outcome="success"}[$__range])) or vector(0)) / sum(increase(shopease_auth_logins_total[$__range]))', "")],
       w=4, unit="percent", decimals=1, th=[(None, RED), (70, ORANGE), (85, GREEN)], desc="A sudden drop can mean credential stuffing or a broken login.")
D.timeseries("Orders & revenue per minute", [("60 * sum(rate(shopease_orders_created_total[$__rate_interval]))", "orders/min"), ("60 * sum(rate(shopease_revenue_total[$__rate_interval]))", "revenue/min")], w=8)
D.timeseries("Logins by outcome / reason", [("sum by (outcome, reason) (rate(shopease_auth_logins_total[$__rate_interval]))", "{{outcome}} {{reason}}")], w=8, unit="ops", stack=True)
D.timeseries("Order status changes", [("sum by (status) (rate(shopease_order_status_changes_total[$__rate_interval]))", "{{status}}")], w=8, unit="ops", stack=True)
D.timeseries("Payments by outcome", [("sum by (outcome) (rate(shopease_payments_total[$__rate_interval]))", "{{outcome}}")], w=6, unit="ops", stack=True)
D.timeseries("Items added to carts / sec", [("sum(rate(shopease_cart_items_added_total[$__rate_interval]))", "units/s")], w=6, unit="ops")
D.timeseries("Registrations by role", [("sum by (role) (increase(shopease_users_registered_total[$__rate_interval]))", "{{role}}")], w=6, unit="short", draw="bars", fill=60)
D.timeseries("Transactional e-mails", [("sum by (template, outcome) (rate(shopease_emails_total[$__rate_interval]))", "{{template}} {{outcome}}")], w=6, unit="ops", stack=True,
             desc="outcome=failed means the SMTP server rejected / was unreachable.")

D.row("Business KPIs — database view (source of truth, survives restarts)")
D.stat("Orders (all time)", [("sum(pg_shopease_orders_count)", "")], w=4, decimals=0, th=[(None, BLUE)])
D.stat("Revenue (all time)", [("max(pg_shopease_payments_completed_total)", "")], w=4, unit="currencyUSD", decimals=2, th=[(None, GREEN)])
D.stat("Pending orders", [('sum(pg_shopease_orders_count{status="PENDING"}) or vector(0)', "")], w=4, decimals=0, th=[(None, GREEN), (20, ORANGE), (100, RED)])
D.stat("Active users", [("sum(pg_shopease_users_count)", "")], w=4, decimals=0, th=[(None, BLUE)])
D.stat("Out of stock", [("max(pg_shopease_catalog_out_of_stock)", "")], w=4, decimals=0, th=[(None, GREEN), (1, ORANGE), (5, RED)])
D.stat("Low stock (≤10)", [("max(pg_shopease_catalog_low_stock)", "")], w=4, decimals=0, th=[(None, GREEN), (3, ORANGE), (10, RED)])
D.piechart("Orders by status", [("sum by (status) (pg_shopease_orders_count)", "{{status}}")], w=6)
D.piechart("Users by role", [("sum by (role) (pg_shopease_users_count)", "{{role}}")], w=6)
D.timeseries("Order value by status", [("sum by (status) (pg_shopease_orders_value)", "{{status}}")], w=6, unit="currencyUSD", stack=True)
D.timeseries("Stock health", [("max(pg_shopease_catalog_low_stock)", "low stock"), ("max(pg_shopease_catalog_out_of_stock)", "out of stock")], w=6)

# ───────────────────────── CONTAINERS ─────────────────────────
D.row("Containers — CPU & memory  (alert threshold 40 %)")
CPU_PCT = ('100 * sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[$__rate_interval])) / on (name) '
           'sum by (name) (container_spec_cpu_quota{name!=""} / container_spec_cpu_period{name!=""} > 0)')
MEM_PCT = ('100 * max by (name) (container_memory_working_set_bytes{name!=""}) / on (name) '
           'max by (name) (container_spec_memory_limit_bytes{name!=""} > 0)')
D.timeseries("Container CPU % of limit", [(CPU_PCT, "{{name}}")], w=12, unit="percent", minv=0, th=[(None, GREEN), (40, RED)], desc="Red line = Grafana alert threshold (40 %).")
D.timeseries("Container memory % of limit", [(MEM_PCT, "{{name}}")], w=12, unit="percent", minv=0, th=[(None, GREEN), (40, RED)], desc="Working set / limit. Red line = alert threshold.")
D.bargauge("CPU % now", [(CPU_PCT, "{{name}}")], w=6, h=9, unit="percent", maxv=100, th=[(None, GREEN), (40, ORANGE), (80, RED)])
D.bargauge("Memory % now", [(MEM_PCT, "{{name}}")], w=6, h=9, unit="percent", maxv=100, th=[(None, GREEN), (40, ORANGE), (80, RED)])
D.timeseries("Container memory (working set)", [('max by (name) (container_memory_working_set_bytes{name!=""})', "{{name}}")], w=12, h=9, unit="bytes")
D.timeseries("Container CPU (cores)", [('sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[$__rate_interval]))', "{{name}}")], w=12, h=8)
D.timeseries("Container network I/O", [
    ('sum by (name) (rate(container_network_receive_bytes_total{name!=""}[$__rate_interval]))', "rx {{name}}"),
    ('- sum by (name) (rate(container_network_transmit_bytes_total{name!=""}[$__rate_interval]))', "tx {{name}}")], w=12, h=8, unit="Bps", fill=5)

# ───────────────────────── NODE ─────────────────────────
D.row("Node (host)")
D.gauge("Node CPU %", [('100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[2m])))', "")], w=4, th=[(None, GREEN), (40, ORANGE), (80, RED)])
D.gauge("Node memory %", [('100 * (1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes))', "")], w=4, th=[(None, GREEN), (40, ORANGE), (80, RED)])
D.gauge("Node disk % (/)", [('100 * (1 - max(node_filesystem_avail_bytes{mountpoint="/", fstype!~"tmpfs|overlay"}) / max(node_filesystem_size_bytes{mountpoint="/", fstype!~"tmpfs|overlay"}))', "")], w=4, th=[(None, GREEN), (70, ORANGE), (85, RED)])
D.stat("Load (1m)", [("node_load1", "")], w=4, h=5, th=[(None, GREEN)], decimals=2)
D.stat("Node uptime", [("time() - node_boot_time_seconds", "")], w=4, h=5, unit="s", th=[(None, BLUE)])
D.stat("Services up", [('count(probe_success{job="blackbox-http"} == 1) or vector(0)', "")], w=4, h=5, th=[(None, RED), (8, GREEN)], decimals=0, desc="Out of 8 probed services.")
D.timeseries("Node CPU % / memory %", [
    ('100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[$__rate_interval])))', "CPU %"),
    ('100 * (1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes))', "Memory %")], w=12, unit="percent", minv=0, th=[(None, GREEN), (40, RED)])
D.timeseries("Node network & disk I/O", [
    ('sum(rate(node_network_receive_bytes_total{device!~"lo|veth.*|br-.*|docker.*"}[$__rate_interval]))', "net rx"),
    ('sum(rate(node_network_transmit_bytes_total{device!~"lo|veth.*|br-.*|docker.*"}[$__rate_interval]))', "net tx"),
    ('sum(rate(node_disk_read_bytes_total[$__rate_interval]))', "disk read"),
    ('sum(rate(node_disk_written_bytes_total[$__rate_interval]))', "disk write")], w=12, unit="Bps")

# ───────────────────────── POSTGRES ─────────────────────────
D.row("PostgreSQL")
D.stat("Database", [("pg_up", "")], w=4, mappings=UP_DOWN, th=[(None, RED), (1, GREEN)])
D.gauge("Connection usage", [('100 * sum(pg_stat_database_numbackends) / max(pg_settings_max_connections)', "")], w=4, th=[(None, GREEN), (70, ORANGE), (90, RED)])
D.stat("Database size", [('max(pg_database_size_bytes{datname="shopease"})', "")], w=4, unit="bytes", th=[(None, BLUE)], color_mode="value")
D.timeseries("Commits / rollbacks per sec", [('sum(rate(pg_stat_database_xact_commit{datname="shopease"}[$__rate_interval]))', "commit"), ('sum(rate(pg_stat_database_xact_rollback{datname="shopease"}[$__rate_interval]))', "rollback")], w=12, unit="ops")
D.timeseries("Cache hit ratio %", [('100 * sum(rate(pg_stat_database_blks_hit{datname="shopease"}[$__rate_interval])) / (sum(rate(pg_stat_database_blks_hit{datname="shopease"}[$__rate_interval])) + sum(rate(pg_stat_database_blks_read{datname="shopease"}[$__rate_interval])))', "hit %")], w=8, unit="percent", minv=0, maxv=100)
D.timeseries("Deadlocks / conflicts", [('sum(rate(pg_stat_database_deadlocks{datname="shopease"}[$__rate_interval]))', "deadlocks/s")], w=8, unit="ops", minv=0)
D.timeseries("Active connections", [("sum(pg_stat_database_numbackends)", "connections"), ("max(pg_settings_max_connections)", "max_connections")], w=8)

# ───────────────────────── S3 STORAGE ─────────────────────────
D.row("S3 storage (MinIO) — Mimir metric blocks, log archive, snapshots, uploads")
D.bargauge("Bytes stored per bucket", [("max by (bucket) (minio_bucket_usage_total_bytes)", "{{bucket}}")], w=8, unit="bytes")
D.timeseries("Bucket growth", [("max by (bucket) (minio_bucket_usage_total_bytes)", "{{bucket}}")], w=8, unit="bytes", stack=True)
D.timeseries("S3 requests / sec", [("sum by (api) (rate(minio_s3_requests_total[$__rate_interval]))", "{{api}}")], w=8, unit="reqps",
             desc="Mimir block uploads, Logstash archive writes, ES snapshots and image uploads all show up here.")

# ───────────────────────── PIPELINE HEALTH ─────────────────────────
D.row("Telemetry pipeline health (OTel Collector → Mimir / Logstash)")
D.timeseries("Metric points sent to Mimir /s", [('sum(rate(otelcol_exporter_sent_metric_points_total{exporter="prometheusremotewrite"}[$__rate_interval]))', "sent"),
                                                  ('sum(rate(otelcol_exporter_send_failed_metric_points_total[$__rate_interval]))', "failed")], w=8, unit="ops")
D.timeseries("Log records sent to Logstash /s", [('sum(rate(otelcol_exporter_sent_log_records_total[$__rate_interval]))', "sent"),
                                                   ('sum(rate(otelcol_exporter_send_failed_log_records_total[$__rate_interval]))', "failed")], w=8, unit="ops",
             th=[(None, GREEN)], desc="Failed > 0 for a while = Logstash/Elasticsearch down; the collector retries and queues.")
D.timeseries("Mimir ingestion", [("sum(rate(cortex_distributor_received_samples_total[$__rate_interval]))", "samples/s"), ("sum(cortex_ingester_memory_series)", "active series")], w=8)
D.text("**Logs:** open **[Kibana → ShopEase • Logs overview](http://localhost:5601/app/dashboards#/view/shopease-dashboard-logs)** or "
       "**[Discover](http://localhost:5601/app/discover)** (data view *ShopEase logs*). Filter a request end-to-end with `trace.id : \"<id>\"`.", h=2)
D.save("../grafana/dashboards/shopease-overview.json")
