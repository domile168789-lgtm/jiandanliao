import { test, expect } from '@playwright/test';

test('core smoke flow', async ({ page }) => {
  // 本地 H5 开发服务器：后续可切换为 nginx/compose 的正式域名
  await page.goto('http://localhost:5173');
  await expect(page.getByRole('heading', { name: '消息' })).toBeVisible();
});
