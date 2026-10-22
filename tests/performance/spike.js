// SPIKE: sudden surge (flash sale!) then drop; latency must return to baseline afterwards.
import { setupUsers, userJourney, summaryTo } from './lib/common.js'
export const options = {
  scenarios: { spike: { executor: 'ramping-vus', startVUs: 5, gracefulRampDown: '30s', stages: [
    { duration: '1m', target: 5 }, { duration: '20s', target: 250 }, { duration: '2m', target: 250 },
    { duration: '20s', target: 5 }, { duration: '3m', target: 5 }, { duration: '20s', target: 0 } ] } },
  thresholds: { http_req_failed: ['rate<0.05'], 'http_req_duration{name:GET /products}': ['p(95)<2500'] },
}
export const setup = () => setupUsers(Number(__ENV.USERS || 40))
export default userJourney
export const handleSummary = summaryTo('spike')
