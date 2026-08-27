import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('static deployment policy',()=>{
  it('ships cache and browser-hardening headers with the static artifact',async()=>{
    const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
    const azure=JSON.parse(await readFile(new URL('../public/staticwebapp.config.json',import.meta.url),'utf8'));
    expect(headers).toContain('/assets/*');
    expect(headers).toContain('max-age=31536000, immutable');
    expect(headers).toContain("Content-Security-Policy: default-src 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain('Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()');
    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('/sw.js');
    expect(headers).toContain('Cache-Control: no-cache');
    expect(azure.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(azure.globalHeaders['Permissions-Policy']).toContain('payment=()');
    expect(azure.globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(azure.routes).toContainEqual({route:'/assets/hero-depot.webp',headers:{'Cache-Control':'no-cache'}});
    expect(azure.routes).toContainEqual({route:'/assets/*',headers:{'Cache-Control':'public, max-age=31536000, immutable'}});
    expect(azure.routes).toContainEqual({route:'/sw.js',headers:{'Cache-Control':'no-cache'}});
  });
});
