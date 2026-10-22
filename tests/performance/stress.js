// STRESS: step the load up beyond normal to find where latency / errors start degrading.
import { setupUsers, userJourney, summaryTo } from './lib/common.js'
export const options = {
  scenarios: { stress: { executor: 'ramping-vus', startVUs: 0, gracefulRampDown: '30s', stages: [
    { duration: '2m', target: 30 }, { duration: '3m', target: 60 }, { duration: '3m', target: 120 },
    { duration: '3m', target: 200 }, { duration: '3m', target: 300 }, { duration: '3m', target: 0 } ] } },
  thresholds: { http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '2m' }], http_req_duration: ['p(95)<3000'] },
}
export const setup = () => setupUsers(Number(__ENV.USERS || 40))
export default userJourney
export const handleSummary = summaryTo('stress')
