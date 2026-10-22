#!/usr/bin/env bash
# One-shot bootstrap for the logging stack (runs in the `elk-setup` container, idempotent):
#   Elasticsearch : ILM policy, data-stream index template, S3 snapshot repository, daily SLM policy
#   Kibana        : data view + saved searches + dashboard
set -euo pipefail

ES=${ES_URL:-http://elasticsearch:9200}
KB=${KIBANA_URL:-http://kibana:5601}
SNAPSHOT_BUCKET=${ES_SNAPSHOT_BUCKET:-es-snapshots}
RETENTION=${LOG_RETENTION_DAYS:-30}

log() { printf '\033[36m[elk-setup]\033[0m %s\n' "$*"; }
put() {  # put <path> <json>   -> fails loudly on a non-2xx answer
  local path=$1 body=$2 code
  code=$(curl -s -o /tmp/resp -w '%{http_code}' -X PUT "$ES/$path" -H 'Content-Type: application/json' -d "$body")
  if [[ $code != 2* ]]; then echo "PUT $path -> HTTP $code"; cat /tmp/resp; echo; return 1; fi
}

log "waiting for Elasticsearch…"
until curl -fs "$ES/_cluster/health?wait_for_status=yellow&timeout=5s" >/dev/null; do sleep 3; done

# ── 1. ILM: keep logs $RETENTION days, then delete ──────────────────────────────────────────
log "ILM policy shopease-logs (delete after ${RETENTION}d)"
put "_ilm/policy/shopease-logs" '{
  "policy": { "phases": {
    "hot":    { "actions": { "rollover": { "max_age": "1d", "max_primary_shard_size": "5gb" } } },
    "delete": { "min_age": "'"${RETENTION}"'d", "actions": { "delete": {} } }
  } }
}'

# ── 2. Index template => data stream logs-shopease-* (priority > built-in `logs` template) ──
log "index template shopease-logs"
put "_index_template/shopease-logs" '{
  "index_patterns": ["logs-shopease-*"],
  "data_stream": {},
  "priority": 500,
  "template": {
    "settings": {
      "index.lifecycle.name": "shopease-logs",
      "index.number_of_shards": 1,
      "index.number_of_replicas": 0,
      "index.refresh_interval": "5s"
    },
    "mappings": {
      "dynamic": true,
      "properties": {
        "@timestamp": { "type": "date" },
        "message":    { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 1024 } } },
        "log":     { "properties": { "level": { "type": "keyword" }, "logger": { "type": "keyword" } } },
        "service": { "properties": { "name": { "type": "keyword" }, "namespace": { "type": "keyword" }, "environment": { "type": "keyword" } } },
        "trace":   { "properties": { "id": { "type": "keyword" } } },
        "span":    { "properties": { "id": { "type": "keyword" } } },
        "fields":  { "type": "object", "dynamic": true }
      }
    }
  }
}'

# ── 3. S3 snapshot repository + daily snapshot lifecycle (durable copy of the indices) ──────
log "snapshot repository s3_logs -> s3://${SNAPSHOT_BUCKET}"
put "_snapshot/s3_logs" '{ "type": "s3", "settings": { "bucket": "'"${SNAPSHOT_BUCKET}"'", "base_path": "shopease/logs" } }' \
  || log "WARN: snapshot repository not registered (check S3 credentials / bucket) — continuing"

log "SLM policy daily-log-snapshots"
put "_slm/policy/daily-log-snapshots" '{
  "schedule": "0 30 1 * * ?",
  "name": "<logs-snap-{now/d}>",
  "repository": "s3_logs",
  "config": { "indices": ["logs-shopease-*"], "include_global_state": false },
  "retention": { "expire_after": "'"${RETENTION}"'d", "min_count": 3, "max_count": 60 }
}' || log "WARN: SLM policy not created (repository missing?) — continuing"

# ── 4. Kibana: data view, saved searches, dashboard ─────────────────────────────────────────
log "waiting for Kibana…"
until curl -fs "$KB/api/status" | grep -q '"level":"available"'; do sleep 5; done

log "Kibana data view logs-shopease-*"
curl -s -o /dev/null -X POST "$KB/api/data_views/data_view" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{
  "override": true,
  "data_view": { "id": "shopease-logs", "title": "logs-shopease-*", "name": "ShopEase logs", "timeFieldName": "@timestamp" }
}' || true
curl -s -o /dev/null -X POST "$KB/api/data_views/default" -H 'kbn-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"data_view_id":"shopease-logs","force":true}' || true

log "Kibana saved searches + dashboard"
curl -s -X POST "$KB/api/saved_objects/_import?overwrite=true" -H 'kbn-xsrf: true' \
  --form file=@/setup/saved-objects.ndjson | head -c 400; echo

log "done ✔  Kibana: ${KB}  ->  Discover / Dashboards -> “ShopEase • Logs overview”"
