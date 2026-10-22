#!/usr/bin/env bash
# "Is the whole stack alive?" — ~15 s, needs only curl.   ./tests/smoke/smoke.sh
set -u
API=${API_URL:-http://localhost:8084}; FE=${FRONTEND_URL:-http://localhost:3000}
EMAIL=${ADMIN_EMAIL:-chimdi247@gmail.com}; PASS=${ADMIN_PASSWORD:-password123}
GRAFANA=${GRAFANA_URL:-http://localhost:3001}; MIMIR=${MIMIR_URL:-http://localhost:9009}
ES=${ES_URL:-http://localhost:9200}; KIBANA=${KIBANA_URL:-http://localhost:5601}

ok=0; fail=0
pass() { printf '  \033[32m✔\033[0m %-44s %s\n' "$1" "${2:-}"; ok=$((ok+1)); }
bad()  { printf '  \033[31m✘\033[0m %-44s %s\n' "$1" "${2:-}"; fail=$((fail+1)); }
check() {  # check <name> <url> [expected-code]
  local code; code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$2")
  [ "$code" = "${3:-200}" ] && pass "$1" "$code" || bad "$1" "got $code, want ${3:-200}  ($2)"
}

echo "── Application"
check "frontend"                         "$FE/healthz"
check "frontend serves the SPA"          "$FE/login"
check "api liveness"                     "$API/api/health"
check "api readiness (db reachable)"     "$API/ready"
check "api docs"                         "$API/docs"
check "public catalogue (categories)"    "$API/api/categories"
check "public catalogue (products)"      "$API/api/products"
check "protected route w/o token → 401"  "$API/api/users/me" 401

echo "── Login with the seeded admin"
RESP=$(curl -s -m 20 -X POST "$API/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(printf '%s' "$RESP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
[ -n "$TOKEN" ] && pass "admin login ($EMAIL)" "token issued" || bad "admin login ($EMAIL)" "$RESP"
c=$(curl -s -o /dev/null -m 10 -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$API/api/users/all-users")
[ "$c" = 200 ] && pass "admin-only endpoint accessible" "$c" || bad "admin-only endpoint" "$c"

echo "── Data + storage"
check "minio (S3) live"                  "http://localhost:9000/minio/health/live"
check "mailpit"                          "http://localhost:8025/livez"

echo "── Observability"
check "otel-collector OTLP/HTTP port"    "http://localhost:4318/" 404
check "mimir ready"                      "$MIMIR/ready"
check "elasticsearch"                    "$ES/_cluster/health"
check "kibana"                           "$KIBANA/api/status"
check "grafana"                          "$GRAFANA/api/health"
N=$(curl -s -m 10 "$MIMIR/prometheus/api/v1/query?query=count(up==1)" | sed -n 's/.*"value":\[[^,]*,"\([0-9]*\)".*/\1/p')
printf '  ℹ mimir: %s scrape targets up\n' "${N:-?}"
H=$(curl -s -m 10 "$ES/_cluster/health" | sed -n 's/.*"status":"\([a-z]*\)".*/\1/p'); printf '  ℹ elasticsearch cluster status: %s\n' "${H:-?}"

echo; echo "Smoke result: $ok passed, $fail failed"; [ "$fail" -eq 0 ]
