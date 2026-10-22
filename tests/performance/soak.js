// SOAK / ENDURANCE: moderate constant load for hours — exposes memory leaks, DB-pool exhaustion, log/metric
// volume growth. Watch the Grafana dashboard + Kibana while it runs.   DURATION=4h VUS=20 ./run-perf.sh soak
import { setupUsers, userJourney, summaryTo } from './lib/common.js'
export const options = {
  scenarios: { soak: { executor: 'constant-vus', vus: Number(__ENV.VUS || 20), duration: __ENV.DURATION || '1h', gracefulStop: '1m' } },
  thresholds: { http_req_failed: ['rate<0.01'], 'http_req_duration{name:GET /products}': ['p(95)<1000'], business_errors: ['rate<0.02'] },
}
export const setup = () => setupUsers()
export default userJourney
export const handleSummary = summaryTo('soak')
