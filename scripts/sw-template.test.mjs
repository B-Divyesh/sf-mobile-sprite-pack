import { describe, expect, it } from 'vitest';
import { renderServiceWorker } from './sw-template.mjs';

describe('generated service worker',()=>{
  it('uses a build-specific cache and precaches executable shell assets',()=>{
    const shell=['/','/index.html','/assets/index-a.js','/assets/index-b.css'];
    const first=renderServiceWorker({version:'psp-first',shell});
    const next=renderServiceWorker({version:'psp-next',shell});
    expect(first).toContain('const VERSION="psp-first"');
    expect(next).toContain('const VERSION="psp-next"');
    expect(next).toContain('cache.addAll(SHELL)');
    expect(next).toContain('"/assets/index-a.js"');
    expect(next).toContain('"/assets/index-b.css"');
    expect(next).toContain("client.postMessage({type:'APP_UPDATED',version:VERSION})");
    expect(next).toContain("key.startsWith('psp-')&&key!==VERSION");
  });
});
