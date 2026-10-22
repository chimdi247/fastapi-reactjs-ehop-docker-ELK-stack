#!/usr/bin/env bash
# Run a k6 scenario INSIDE the compose network (no local k6 needed).
#   ./tests/performance/run-perf.sh smoke|load|stress|spike|soak|breakpoint
# Overrides: PEAK_VUS=60 HOLD=5m DURATION=4h VUS=30 USERS=50
# Live k6 metrics in Grafana/Mimir:  PROM_RW=1 ./run-perf.sh load   (tagged testid=<scenario>)
set -euo pipefail
cd "$(dirname "$0")"
SCENARIO=${1:-smoke}
[ -f "$SCENARIO.js" ] || { echo "unknown scenario '$SCENARIO'. Available:"; ls *.js | sed 's/\.js//'; exit 1; }
NETWORK=${COMPOSE_NETWORK:-shopease_shopease}
mkdir -p results

OUT=()
if [ "${PROM_RW:-0}" = "1" ]; then
  OUT=(-o experimental-prometheus-rw -e K6_PROMETHEUS_RW_SERVER_URL=http://mimir:9009/api/v1/push
       -e K6_PROMETHEUS_RW_TREND_STATS="p(95),p(99),avg,max" -e K6_PROMETHEUS_RW_PUSH_INTERVAL=5s)
fi
ENVS=(); for v in BASE_URL USERS PEAK_VUS RAMP HOLD DURATION VUS; do [ -n "${!v:-}" ] && ENVS+=(-e "$v=${!v}"); done

docker run --rm -i --network "$NETWORK" -v "$PWD:/scripts:ro" -v "$PWD/results:/results" -w /scripts \
  "${OUT[@]}" "${ENVS[@]}" grafana/k6:0.54.0 run --tag testid="$SCENARIO" "/scripts/$SCENARIO.js"
