import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { test, expect, BrowserContext, Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv({ path: path.resolve(__dirname, '../../..', '.env'), override: false });
loadEnv({ path: path.resolve(__dirname, '../.env'), override: false });
loadEnv();

const N8N_EMBED_PATH = process.env.N8N_PATH || '/n8n/';
const N8N_E2E_EMAIL = process.env.N8N_E2E_EMAIL || '';
const N8N_E2E_PASSWORD = process.env.N8N_E2E_PASSWORD || '';

test.describe('n8n dashboard session', () => {
  test.skip(
    !N8N_E2E_EMAIL || !N8N_E2E_PASSWORD,
    'Set N8N_E2E_EMAIL/N8N_E2E_PASSWORD to run this test.',
  );

  test('keeps user logged in across reloads', async ({ page, context }) => {
    await page.goto(N8N_EMBED_PATH, { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const loginVisible = await emailInput.first().isVisible().catch(() => false);

    if (loginVisible) {
      await emailInput.first().fill(N8N_E2E_EMAIL);
      const passwordInput = page
        .locator('input[type="password"], input[name="password"]')
        .first();
      await passwordInput.fill(N8N_E2E_PASSWORD);
      await page.getByRole('button', { name: /log in|sign in/i }).click();
    }

    await page.waitForLoadState('networkidle');
    await ensureNo404(page);

    const authCookie = await findN8nCookie(context);
    expect(authCookie, 'n8n-auth cookie should exist after login').toBeDefined();
    expect(authCookie?.path).toBe('/');

    await page.reload({ waitUntil: 'networkidle' });
    await ensureNo404(page);

    const authCookieAfterReload = await findN8nCookie(context);
    expect(authCookieAfterReload?.value).toBe(authCookie?.value);

    const settingsResponse = await page.request.get('/rest/settings');
    expect(settingsResponse.ok()).toBeTruthy();
  });
});

async function findN8nCookie(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === 'n8n-auth');
}

async function ensureNo404(page: Page) {
  await expect(
    page.locator("text=Oops, couldn't find that"),
    'n8n iframe should not be in error state',
  ).toHaveCount(0);
}
