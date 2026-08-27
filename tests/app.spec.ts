import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';

test('loads a 16-frame sheet and exports a real atlas ZIP', async ({page},testInfo)=>{
  const errors:string[]=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Pocket Sprite Pack/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  await page.locator('#file-input').setInputFiles(resolve('tests/assets/test-sheet.png'));
  await expect(page.locator('#frame-count')).toContainText('1 / 16');
  await expect(page.locator('#frame-strip button')).toHaveCount(16);
  await page.locator('#trim').check();
  await expect(page.locator('#transform-note')).toContainText('trimmed');
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#export-button').click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/pocket-sprite-pack-.*\.zip/);
  await download.saveAs(testInfo.outputPath(download.suggestedFilename()));
  expect(errors).toEqual([]);
});

test('app shell returns after the network is disabled',async({page,context})=>{
  await page.goto('/');await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null);
  await context.setOffline(true);await page.reload();
  await expect(page.locator('#page-title')).toBeVisible();
  await expect(page.locator('#packer-title')).toHaveText('Dispatch desk');
});

test('legal routes are real static pages',async({page})=>{
  await page.goto('/privacy/');await expect(page.locator('h1')).toHaveText('Privacy, by design');
  await page.goto('/terms/');await expect(page.locator('h1')).toHaveText('Terms of use');
});

test('has no serious or critical accessibility violations',async({page})=>{
  await page.goto('/');
  const results=await new AxeBuilder({page}).analyze();
  expect(results.violations.filter(item=>['serious','critical'].includes(item.impact||''))).toEqual([]);
});
