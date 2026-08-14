import { expect, test } from '@playwright/test';

test('map, real rainfall and playback are operational', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('rainfall-map')).toBeVisible();
  await expect(page.getByText('実データ・公式サンプル')).toBeVisible();
  const slider = page.getByTestId('time-slider');
  const before = await slider.inputValue();
  await page.getByTestId('playback-toggle').click();
  await expect.poll(() => slider.inputValue()).not.toBe(before);
  await page.getByTestId('playback-toggle').click();
});

test('map click samples a numeric COG and opens the point panel', async ({ page }) => {
  await page.goto('/');
  const map = page.getByTestId('rainfall-map');
  await map.click({ position: { x: 350, y: 300 } });
  await expect(page.getByRole('heading', { name: '選択地点' })).toBeVisible();
  await expect(page.getByTestId('point-rainfall')).not.toHaveText('読込中…');
  await page.getByRole('button', { name: '時系列' }).click();
  await expect(page.getByRole('img', { name: '選択地点の前1時間解析雨量時系列グラフ' })).toBeVisible({ timeout: 30_000 });
});

test('shared URL restores time and point', async ({ page }) => {
  await page.goto('/?date=2018-07-07&time=19%3A00&lat=34.4&lon=132.5&zoom=7&pointLat=34.3&pointLon=132.4&opacity=.55&layers=rainfall,railways');
  await expect(page.getByText('2018/07/07 19:00', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '選択地点' })).toBeVisible();
});

