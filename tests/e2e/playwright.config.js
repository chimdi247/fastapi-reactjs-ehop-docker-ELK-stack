import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,            // specs create users / mutate state; keep deterministic
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /auth\.spec\.js/ },
  ],
})
