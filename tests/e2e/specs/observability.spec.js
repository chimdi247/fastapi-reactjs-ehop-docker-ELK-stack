import { test, expect } from '@playwright/test'

const GRAFANA = process.env.GRAFANA_URL || 'http://localhost:3001'
const KIBANA = process.env.KIBANA_URL || 'http://localhost:5601'
const auth = 'Basic ' + Buffer.from(`${process.env.GRAFANA_USER || 'admin'}:${process.env.GRAFANA_PASSWORD || 'admin'}`).toString('base64')
const headers = { Authorization: auth }

test.describe('observability UIs', () => {
  test('Grafana: Mimir datasource, dashboard and alert rules are provisioned', async ({ request }) => {
    const ds = await (await request.get(`${GRAFANA}/api/datasources`, { headers })).json()
    expect(ds.some((d) => d.uid === 'mimir')).toBeTruthy()
    const dash = await (await request.get(`${GRAFANA}/api/search?type=dash-db`, { headers })).json()
    expect(dash.some((d) => d.uid === 'shopease-overview')).toBeTruthy()
    const rules = await (await request.get(`${GRAFANA}/api/v1/provisioning/alert-rules`, { headers })).json()
    for (const u of ['container-cpu-high', 'container-memory-high', 'node-cpu-high', 'node-memory-high']) {
      expect(rules.map((r) => r.uid)).toContain(u)
    }
  })

  test('Grafana: the overview dashboard renders with data', async ({ page }) => {
    await page.goto(`${GRAFANA}/login`)
    await page.getByLabel(/email or username/i).fill('admin')
    await page.getByLabel('Password', { exact: true }).fill('admin')
    await page.getByRole('button', { name: /log in/i }).click()
    await page.goto(`${GRAFANA}/d/shopease-overview`)
    await expect(page.getByText('Uptime & availability')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/SLI \/ SLO/)).toBeVisible()
  })

  test('Kibana: structured-log dashboard is available', async ({ request }) => {
    const r = await request.get(`${KIBANA}/api/saved_objects/dashboard/shopease-dashboard-logs`, { headers: { 'kbn-xsrf': 'true' } })
    expect(r.ok()).toBeTruthy()
  })
})
