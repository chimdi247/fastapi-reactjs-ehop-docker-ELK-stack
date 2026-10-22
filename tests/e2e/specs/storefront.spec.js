import { test, expect } from '@playwright/test'
import { API, loginAsAdmin } from './helpers.js'

test.describe('storefront', () => {
  test('product catalogue shows the demo products', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByRole('heading', { name: 'Our Products' }).first()).toBeVisible()
    await expect(page.getByText('Wireless Headphones').first()).toBeVisible()
  })

  test('search narrows the product list', async ({ page }) => {
    await page.goto('/products')
    const search = page.getByPlaceholder('Search products...')
    await search.fill('Headphones')
    await expect(page.getByText('Wireless Headphones').first()).toBeVisible()
    await expect(page.getByText('Air Fryer 4L')).toHaveCount(0)
  })

  test('product details page opens from the catalogue', async ({ page }) => {
    await page.goto('/products')
    await page.getByText('Smart Watch').first().click()
    await expect(page).toHaveURL(/\/products\/\d+/)
  })

  test('admin sees the admin area', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('API health + readiness endpoints respond', async ({ request }) => {
    expect((await request.get(`${API}/api/health`)).ok()).toBeTruthy()
    expect((await request.get(`${API}/ready`)).ok()).toBeTruthy()
  })
})
