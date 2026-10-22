// BREAKPOINT / CAPACITY: raise the ARRIVAL RATE until thresholds fail — the last good rate is the capacity.
import { setupUsers, browse, summaryTo } from './lib/common.js'
export const options = {
  scenarios: { breakpoint: { executor: 'ramping-arrival-rate', startRate: 5, timeUnit: '1s', preAllocatedVUs: 100, maxVUs: 1000,
    stages: [{ duration: '15m', target: 400 }] } },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: true, delayAbortEval: '30s' }],
  },
}
export const setup = () => setupUsers(5)
export default (d) => browse(d)
export const handleSummary = summaryTo('breakpoint')
