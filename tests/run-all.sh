#!/usr/bin/env bash
# Convenience runner. The stack must be up for everything except `unit`.
#   ./tests/run-all.sh unit | smoke | integration | e2e | selenium | perf-smoke | all
set -uo pipefail
cd "$(dirname "$0")"
rc=0
run() { echo; echo "════════ $1 ════════"; shift; "$@" || rc=1; }

unit()        { run "unit (pytest)"         bash -c 'cd unit/backend && python3 -m pytest -q'; }
smoke()       { run "smoke"                 ./smoke/smoke.sh; }
integration() { run "integration (pytest)"  bash -c 'cd integration && python3 -m pytest -v -m "not slow"'; }
e2e()         { run "e2e (Playwright)"      bash -c 'cd e2e && npm install --no-audit --no-fund && npx playwright install chromium && npx playwright test'; }
selenium()    { run "selenium"              bash -c 'cd selenium && python3 -m pytest -v'; }
perfsmoke()   { run "performance smoke (k6)" ./performance/run-perf.sh smoke; }

case "${1:-all}" in
  unit) unit;; smoke) smoke;; integration) integration;; e2e) e2e;; selenium) selenium;; perf-smoke) perfsmoke;;
  all) unit; smoke; integration; e2e; selenium; perfsmoke;;
  *) echo "usage: $0 unit|smoke|integration|e2e|selenium|perf-smoke|all"; exit 2;;
esac
exit $rc
