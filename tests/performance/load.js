// LOAD: expected day-to-day traffic. SLOs: p95 < 800 ms (login excluded: Argon2 is intentionally slow), <1 % failures.
import { setupUsers, userJourney, summaryTo } from './lib/common.js'
const PEAK = Number(__ENV.PEAK_VUS || 30)
export const options = {
  scenarios: { load: { executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '30s', stages: [
    { duration: __ENV.RAMP || '2m', target: PEAK }, { duration: __ENV.HOLD || '8m', target: PEAK }, { duration: '2m', target: 0 } ] } },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:GET /products}': ['p(95)<800'],
    'http_req_duration{name:POST /cart/add}': ['p(95)<1000'],
    'http_req_duration{name:POST /auth/login}': ['p(95)<3000'],
    business_errors: ['rate<0.02'], checks: ['rate>0.98'],
  },
}
export const setup = () => setupUsers()
export default userJourney
export const handleSummary = summaryTo('load')
