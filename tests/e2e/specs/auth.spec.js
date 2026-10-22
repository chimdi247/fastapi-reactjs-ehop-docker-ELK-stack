import { test, expect } from '@playwright/test'
import { ADMIN, login, loginAsAdmin, register } from './helpers.js'

test.describe('authentication', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible()
    await expect(page.getByPlaceholder('Enter your email')).toBeVisible()
  })

  test('seeded admin can sign in (and sees Logout)', async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('wrong password shows an error and stays on /login', async ({ page }) => {
    await login(page, { email: ADMIN.email, password: 'wrong-password' })
    await expect(page.getByText(/login failed|invalid|incorrect|credentials/i).first()).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('protected pages redirect anonymous visitors', async ({ page }) => {
    await page.goto('/cart')
    await expect(page).not.toHaveURL(/\/cart$/)
  })

  test('a new customer can register and then log in', async ({ page }) => {
    const { email, password } = await register(page)
    await page.waitForURL(/\/login|\/$|\/home/, { timeout: 20_000 })
    if (!/\/login/.test(page.url())) await page.goto('/login')
    await login(page, { email, password })
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  })

  test('sign out returns to the anonymous navbar', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page.getByRole('link', { name: 'Login' }).first()).toBeVisible()
  })
})
