import { expect } from '@playwright/test'

export const ADMIN = { email: 'chimdi247@gmail.com', password: 'password123' }
export const API = process.env.API_URL || 'http://localhost:8084'

// The storefront has no data-testid attributes: we select like a user would (labels, roles, text).
export async function login(page, { email, password } = ADMIN) {
  await page.goto('/login')
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /^login$/i }).click()
}

export async function loginAsAdmin(page) {
  await login(page)
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
}

export const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}@example.com`

export async function register(page, { name = 'E2E Tester', email = uniqueEmail(), password = 'secret123' } = {}) {
  await page.goto('/register')
  await page.getByLabel('Full Name').fill(name)
  await page.getByLabel('Email Address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm Password').fill(password)
  await page.getByRole('button', { name: /create account|sign up|register/i }).first().click()
  return { email, password }
}
