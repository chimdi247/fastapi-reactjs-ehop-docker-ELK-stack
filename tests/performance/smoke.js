// SMOKE: 1 VU, 30 s — proves the scripts and the system work before any real load.
import { setupUsers, userJourney, summaryTo } from './lib/common.js'
export const options = {
  vus: 1, duration: __ENV.DURATION || '30s',
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1000'], checks: ['rate>0.99'] },
}
export const setup = () => setupUsers(3)
export default userJourney
export const handleSummary = summaryTo('smoke')
