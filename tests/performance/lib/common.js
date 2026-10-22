// Shared helpers for every k6 scenario. Target = the API; browsing + auth + cart are exercised.
// (Checkout is excluded on purpose: it creates a real Stripe session.)
import http from 'k6/http'
import { check, fail, sleep } from 'k6'
import { Counter, Rate, Trend } from 'k6/metrics'

export const BASE_URL = __ENV.BASE_URL || 'http://ecommerce-api:8084'   // service name inside the compose network
export const USERS = Number(__ENV.USERS || 20)

export const loginDuration = new Trend('login_duration', true)
export const cartAdds = new Counter('cart_adds')
export const businessErrors = new Rate('business_errors')

const JSON_HDR = { 'Content-Type': 'application/json' }
const auth = (t) => ({ headers: { ...JSON_HDR, Authorization: `Bearer ${t}` } })
const listOf = (body) => { const d = body && body.data; return Array.isArray(d) ? d : (d && d.items) || [] }

/** Once per run: register N customers and log them in (passwords are Argon2-hashed => deliberately slow). */
export function setupUsers(n = USERS) {
  const run = Date.now(), users = []
  for (let i = 0; i < n; i++) {
    const email = `k6-${run}-${i}@example.com`
    const r = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({ name: `K6 User ${i}`, email, password: 'secret123' }),
      { headers: JSON_HDR, tags: { name: 'setup_register' } })
    if (r.status !== 201) fail(`setup: register failed ${r.status} ${r.body}`)
    const l = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password: 'secret123' }), { headers: JSON_HDR, tags: { name: 'setup_login' } })
    if (l.status !== 200) fail(`setup: login failed ${l.status}`)
    users.push({ email, token: l.json('data.token') })
  }
  const products = listOf(http.get(`${BASE_URL}/api/products`).json()).map((p) => p.id)
  if (!products.length) fail('setup: no products — was 03-seed-demo-catalog.sql removed?')
  return { users, products }
}

export const pickUser = (d) => d.users[(__VU - 1) % d.users.length]
const pickProduct = (d) => d.products[Math.floor(Math.random() * d.products.length)]

export function browse(d) {
  const res = http.batch([
    ['GET', `${BASE_URL}/api/products`, null, { tags: { name: 'GET /products' } }],
    ['GET', `${BASE_URL}/api/categories`, null, { tags: { name: 'GET /categories' } }],
    ['GET', `${BASE_URL}/api/products/${pickProduct(d)}`, null, { tags: { name: 'GET /products/{id}' } }],
  ])
  res.forEach((r) => businessErrors.add(!check(r, { 'catalogue 200': (x) => x.status === 200 })))
}

export function cartFlow(d) {
  const u = pickUser(d), a = auth(u.token)
  const add = http.post(`${BASE_URL}/api/cart/add`, JSON.stringify({ product_id: pickProduct(d), quantity: 1 }), { ...a, tags: { name: 'POST /cart/add' } })
  const ok = check(add, { 'cart add 200': (r) => r.status === 200 })
  businessErrors.add(!ok); if (ok) cartAdds.add(1)
  check(http.get(`${BASE_URL}/api/cart`, { ...a, tags: { name: 'GET /cart' } }), { 'cart 200': (r) => r.status === 200 })
  check(http.get(`${BASE_URL}/api/orders/me`, { ...a, tags: { name: 'GET /orders/me' } }), { 'orders 200': (r) => r.status === 200 })
}

export function login(d) {
  const u = pickUser(d), t0 = Date.now()
  const r = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email: u.email, password: 'secret123' }), { headers: JSON_HDR, tags: { name: 'POST /auth/login' } })
  loginDuration.add(Date.now() - t0)
  businessErrors.add(!check(r, { 'login 200': (x) => x.status === 200 }))
}

/** 70 % browsing · 25 % authenticated cart activity · 5 % login. */
export function userJourney(d) {
  const dice = Math.random()
  if (dice < 0.70) browse(d); else if (dice < 0.95) cartFlow(d); else login(d)
  sleep(0.5 + Math.random())
}

export function summaryTo(name) {
  return (data) => {
    const m = data.metrics, f = (x, p = 1) => (x === undefined ? 'n/a' : x.toFixed(p))
    const text = `
  ── ${name} ───────────────────────────
  requests        : ${m.http_reqs ? m.http_reqs.values.count : 0}  (${f(m.http_reqs && m.http_reqs.values.rate)} req/s)
  failed requests : ${f(m.http_req_failed && m.http_req_failed.values.rate * 100, 2)} %
  latency p50/p95/p99 : ${f(m.http_req_duration.values.med)} / ${f(m.http_req_duration.values['p(95)'])} / ${f(m.http_req_duration.values['p(99)'])} ms
  max VUs         : ${m.vus_max ? m.vus_max.values.max : 'n/a'}
`
    return { [`/results/${name}-summary.json`]: JSON.stringify(data, null, 2), stdout: text }
  }
}
