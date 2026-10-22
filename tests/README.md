# Tests

| Suite | Folder | Needs the stack? | Run |
|---|---|---|---|
| **Unit** — telemetry, JWT security, SQL-vs-models drift, seeded admin hash | `unit/backend` | no | `pip install -r unit/backend/requirements.txt` (+ the backend deps) then `cd tests/unit/backend && pytest -q` |
| **Smoke** (curl, ~15 s) | `smoke` | yes | `tests/smoke/smoke.sh` |
| **Integration** — API flows, DB roles/schema, **telemetry pipeline** (metrics→Mimir, logs→Elasticsearch/Kibana, S3 buckets, Grafana provisioning) | `integration` | yes | `cd tests/integration && pip install -r requirements.txt && pytest -v` (add `-m "not slow"` to skip the 8-min S3-archive wait) |
| **End-to-end** (Playwright) — UI flows + Grafana/Kibana provisioning | `e2e` | yes | `cd tests/e2e && npm i && npx playwright install chromium && npx playwright test` |
| **Selenium** (WebDriver) | `selenium` | yes | `cd tests/selenium && pip install -r requirements.txt && pytest -v` |
| **Performance** (k6, run inside the compose network) | `performance` | yes | `tests/performance/run-perf.sh <scenario>` |

All at once: `tests/run-all.sh all` (or `unit` · `smoke` · `integration` · `e2e` · `selenium` · `perf-smoke`).

## Performance scenarios

| Scenario | Purpose | Shape |
|---|---|---|
| `smoke` | scripts + system sanity | 1 VU, 30 s |
| `load` | expected traffic vs. SLOs | ramp → 30 VUs, hold 8 min, ramp down |
| `stress` | find the degradation point | 30 → 300 VUs in steps |
| `spike` | flash-sale surge + recovery | 5 → 250 VUs in 20 s, hold, drop, recover |
| `soak` | leaks / pool exhaustion / data growth | 20 VUs for `DURATION` (default 1 h) |
| `breakpoint` | capacity in req/s | ramping arrival rate until thresholds fail |

Overrides: `PEAK_VUS=60 HOLD=5m DURATION=4h VUS=30 USERS=50 ./run-perf.sh load`.
**Watch it live:** `PROM_RW=1 ./run-perf.sh load` streams k6's own metrics into Mimir (tag `testid`), and the Grafana
*ShopEase — Overview* dashboard + Kibana show the system under that load. A `load`/`stress` run is also the easiest way
to trip the **CPU > 40 %** alert and see the e-mail arrive in Mailpit (http://localhost:8025).

Traffic mix = 70 % catalogue browsing · 25 % authenticated cart activity · 5 % login. Checkout is excluded on purpose
(it creates a real Stripe session). Passwords are Argon2-hashed, so login is *deliberately* CPU-heavy and has its own
(looser) threshold.

## Notes
* Tests create throw-away customers (`it-…@example.com`, `k6-…@example.com`, `e2e-…@example.com`); the seeded admin is only read.
* `test_public_registration_cannot_create_an_admin` is an **expected failure**: it documents a real security issue (see the root README).
* The storefront has no `data-testid` attributes, so UI tests select by label / role / text. Adding test ids would make them sturdier.
