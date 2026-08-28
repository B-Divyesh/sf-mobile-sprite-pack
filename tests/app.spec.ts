import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import AxeBuilder from '@axe-core/playwright';

async function startWorkerUpdateServer(){
  const root=resolve('dist');let upgradeWorker=false;
  const contentType:Record<string,string>={'.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
  const server=createServer(async(request,response)=>{
    const requestUrl=new URL(request.url||'/','http://127.0.0.1');
    if(requestUrl.pathname==='/__test__/upgrade-worker'){upgradeWorker=true;response.writeHead(204).end();return;}
    const relative=(requestUrl.pathname==='/'?'index.html':requestUrl.pathname.replace(/^\//,'').replace(/\/$/,'/index.html'));
    const file=resolve(root,relative);
    if(!file.startsWith(`${root}${sep}`)&&file!==root){response.writeHead(403).end();return;}
    try{
      let body=await readFile(file);
      if(relative==='sw.js'&&upgradeWorker)body=Buffer.from(body.toString().replace(/const VERSION="[^"]+"/,'const VERSION="psp-update-regression"'));
      response.writeHead(200,{'content-type':contentType[extname(file)]||'application/octet-stream','cache-control':relative==='sw.js'?'no-cache':'no-store'}).end(body);
    }catch{response.writeHead(404).end();}
  });
  await new Promise<void>((resolveStart,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolveStart);});
  const address=server.address();if(!address||typeof address==='string')throw new Error('Could not start update test server.');
  return {url:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>((resolveClose,reject)=>server.close(error=>error?reject(error):resolveClose()))};
}

test('loads a 16-frame sheet and exports a real atlas ZIP', async ({page},testInfo)=>{
  const errors:string[]=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle(/Pocket Sprite Pack/);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  await page.locator('#file-input').setInputFiles(resolve('tests/assets/test-sheet.png'));
  await page.locator('#auto-grid').click();
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

test('reconstructs an animated GIF into timed frames',async({page})=>{
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(resolve('tests/assets/test-animation.gif'));
  await expect(page.locator('#frame-count')).toContainText('1 / 2');
  await expect(page.locator('#delay')).toHaveValue('80');
  await page.locator('#next-frame').click();
  await expect(page.locator('#frame-count')).toContainText('2 / 2');
  await page.locator('#palette').selectOption('gameboy');
  await expect(page.locator('#transform-note')).toContainText('Moss pocket');
});

test('keeps frame navigation keyboard-operable without mobile overflow',async({page})=>{
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(resolve('tests/assets/test-sheet.png'));
  await page.locator('#auto-grid').click();
  await page.locator('#canvas-stage').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#frame-count')).toContainText('2 / 16');
  const widths=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
});

test('keeps direct header and legal touch targets at least 44px with safe separation',async({page})=>{
  await page.goto('/');
  const targets=['#pro-button','footer a[href="/privacy/"]','footer a[href="/terms/"]'];
  const geometry=await page.locator(targets.join(',')).evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    return {label:element.textContent?.trim(),left:rect.left,right:rect.right,width:rect.width,height:rect.height};
  }));
  expect(geometry).toHaveLength(3);
  for(const target of geometry){
    expect(target.width,`${target.label} width`).toBeGreaterThanOrEqual(44);
    expect(target.height,`${target.label} height`).toBeGreaterThanOrEqual(44);
  }
  expect(geometry[2].left-geometry[1].right).toBeGreaterThanOrEqual(8);
});

test('resumes a transformed project with its packing settings after reload and offline recovery',async({page,context})=>{
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(resolve('tests/assets/test-sheet.png'));
  await page.locator('#auto-grid').click();
  await page.locator('#trim').check();
  await page.locator('#padding').fill('1');
  await page.locator('#palette').selectOption('gameboy');
  await page.locator('#dither').selectOption('floyd');
  await page.locator('#next-frame').click();
  await page.locator('#next-frame').click();
  await page.locator('#delay').fill('240');
  await page.locator('#delay').press('Tab');
  await page.locator('#zoom').evaluate((input:HTMLInputElement)=>{input.value='9';input.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.locator('#export-columns').fill('2');
  await page.locator('#export-columns').press('Tab');
  await page.waitForFunction(async()=>{
    const request=indexedDB.open('pocket-sprite-pack',2);
    const project=await new Promise<any>((resolve,reject)=>{
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{const db=request.result;const get=db.transaction('project').objectStore('project').get('lastProject');get.onsuccess=()=>{resolve(get.result);db.close()};get.onerror=()=>reject(get.error)};
    });
    return project?.schema===1&&project.settings?.columns===4&&project.settings?.rows===4&&project.settings?.trim===true&&project.settings?.padding===1&&project.settings?.palette==='gameboy'&&project.settings?.dither==='floyd'&&project.settings?.currentFrame===2&&project.settings?.frameDurations?.[2]===240&&project.settings?.zoom===9&&project.settings?.exportColumns===2;
  });
  await page.reload();
  await expect(page.locator('#resume-button')).toBeVisible();
  await context.setOffline(true);
  await page.locator('#resume-button').click();
  await expect(page.locator('#frame-count')).toHaveText('Frame 3 / 16');
  await expect(page.locator('#columns')).toHaveValue('4');
  await expect(page.locator('#rows')).toHaveValue('4');
  await expect(page.locator('#trim')).toBeChecked();
  await expect(page.locator('#padding')).toHaveValue('1');
  await expect(page.locator('#palette')).toHaveValue('gameboy');
  await expect(page.locator('#dither')).toHaveValue('floyd');
  await expect(page.locator('#delay')).toHaveValue('240');
  await expect(page.locator('#zoom')).toHaveValue('9');
  await expect(page.locator('#export-columns')).toHaveValue('2');
  await expect(page.locator('#transform-note')).toContainText('Moss pocket');
});

test('app shell returns after the network is disabled',async({page,context})=>{
  const errors:string[]=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null);
  const precached=await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(name=>name.startsWith('psp-'));
    const entries=await Promise.all(names.map(async name=>(await caches.open(name)).keys()));
    return entries.flat().map(request=>new URL(request.url).pathname);
  });
  expect(precached).toContain('/index.html');
  expect(precached.some(path=>/^\/assets\/index-.*\.js$/.test(path))).toBe(true);
  expect(precached.some(path=>/^\/assets\/index-.*\.css$/.test(path))).toBe(true);
  await context.setOffline(true);await page.reload();
  await expect(page.locator('#page-title')).toBeVisible();
  await expect(page.locator('#packer-title')).toHaveText('Dispatch desk');
  expect(errors).toEqual([]);
  await page.locator('#pro-button').click();
  await expect(page.locator('#pro-dialog')).toBeVisible();
});

test('rejects grids that would discard pixels and keeps the prior preview',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(resolve('tests/assets/test-sheet.png'));
  await page.locator('#auto-grid').click();
  await expect(page.locator('#frame-count')).toContainText('1 / 16');
  await page.locator('#columns').fill('3');
  await page.locator('#columns').press('Tab');
  await expect(page.locator('#status')).toContainText('must divide evenly');
  await expect(page.locator('#columns')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('#frame-count')).toContainText('1 / 16');
  await page.locator('#columns').fill('100');
  await page.locator('#columns').press('Tab');
  await expect(page.locator('#status')).toContainText('Columns must be a whole number from 1 to 64');
  expect(errors).toEqual([]);
});

test('shows the update notice after a build-versioned worker replaces an old profile',async({page})=>{
  const server=await startWorkerUpdateServer();
  try{
    await page.goto(server.url);
    await page.waitForFunction(()=>navigator.serviceWorker?.controller!==null);
    await expect(page.locator('#update-toast')).toBeHidden();
    await page.request.get(`${server.url}/__test__/upgrade-worker`);
    await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration())?.update();});
    await expect(page.locator('#update-toast')).toBeVisible();
  }finally{await server.close();}
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
