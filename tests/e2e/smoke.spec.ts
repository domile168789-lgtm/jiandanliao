import { test, expect } from '@playwright/test';

test('core smoke flow', async ({ page }) => {
  const baseUrl = process.env.H5_BASE_URL || 'http://localhost:4174';
  await page.goto(`${baseUrl}/h5/messages?preview=demo`);
  await expect(page.getByRole('heading', { name: '消息' })).toBeVisible();
});
