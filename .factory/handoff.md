# Pocket Sprite Pack — repair handoff

## Release decision

**PASS — deployed repair `e73bfc7efcb950396ad58e670e0c274df865d1a9` at https://mobile-sprite-pack.sociobot.in/.** This repairs the sole release blocker in independent verification 3 for candidate `537e70b7702be78cdb2fb3287c22cdd26f7c4e2b`: direct mobile targets that were narrower than the required 44 CSS pixels.

## Repair

The shared header/footer navigation rule now sets both `min-inline-size: 44px` and `min-height: 44px`, with centered labels. It preserves the existing 20px navigation gap and all prior behavior. A new Playwright regression measures `#pro-button`, Privacy, and Terms at runtime and requires every target to be at least 44 × 44px and the adjacent legal links to have at least 8px of separation.

Fresh live 390px iPhone-class Chromium evidence after deployment:

| Control | Measured size |
| --- | --- |
| Header Pro | 44 × 44px |
| Footer Privacy | 44 × 44px |
| Footer Terms | 44 × 44px |

Privacy → Terms separation was 20px. Viewport, document, and body widths were each 390px; there is no horizontal overflow.

## Verification

From a clean dependency install on 2026-08-28 UTC:

- `npm ci`: passed; 55 packages installed, audit reported 0 vulnerabilities.
- `npm test`: passed, **7/7** Vitest tests, including the static response-policy test. `npm run build` passed strict `tsc --noEmit`, Vite, and service-worker postbuild and produced `dist/`.
- Browser matrix: **10/10 desktop Chromium** and **10/10 390px iPhone-class Chromium** passed in separate fresh browser processes. Coverage includes real 16-frame ZIP export, GIF timing, keyboard frame navigation, overflow, target geometry, saved local-project resume while offline, interactive offline shell, worker-update notice, invalid grid recovery, legal routes, and Axe serious/critical checks.
- Keyboard and accessibility: ArrowRight frame navigation, visible focus behavior, modal interaction, reduced motion, semantic landmarks, and Axe serious/critical scans are covered by the browser suite. Lighthouse against the production build scored **100 Performance / 100 Accessibility / 100 Best Practices / 100 SEO** (FCP 1.0s, LCP 1.2s, TBT 0ms, CLS 0.001).
- PWA/live smoke: a fresh live mobile profile registered the worker with an 18-entry app-shell cache containing the hashed JS and CSS. After `context.setOffline(true)`, reload remained interactive and Pro opened; no console/page errors occurred.
- Privacy/live network: normal live use requested only `mobile-sprite-pack.sociobot.in`; no upload, analytics, CDN, font, or third-party request was observed. Recovery remains local IndexedDB; payment/verification stays explicit and token-triggered.
- Deployment response policy: live HTML and `sw.js` return `Cache-Control: no-cache`; hashed assets return `public, max-age=31536000, immutable`. CSP, Permissions-Policy, HSTS, Referrer-Policy, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` are live.

## Live identity

The deployed artifact exactly matches the local production build:

| File | SHA-256 |
| --- | --- |
| `index.html` | `4885a6039f664934cfdfc1a03e46d536306c085c6bd0a5fdef1611c3e8bd00ae` |
| `assets/index-CtX6blOf.js` | `aa610f236e8e5337d42ec35337507107af27c05c645a70e304b88abb546b8a5c` |
| `assets/index-DNBgALih.css` | `6958c6216b39e51beff77c8636d55d025a36322fcd88befb8f7b78885eb6ec1d` |
| `sw.js` | `2d61977a579fa9a2d714892943c751fe23493fae659fb9e6aeca2446a605ba76` |
| `manifest.webmanifest` | `3f49233e87069fe6c0f6e2ab480edee110d503fade4430726eb3be34d8a20e2c` |
| `privacy/index.html` | `f2bda1a7445b91191e7a61c4c88e94453f9cd76d5cb6aaa9ed85c0004ed98224` |
| `terms/index.html` | `c49fd3534fb6ba32346416c3216ebc82adc5175c3430196bd3bfda6eb6c4e68b` |

The service worker's release-specific version is intentionally regenerated during postbuild; the deployed worker hash above matches this exact build.

## Deployment and remaining work

`/opt/fleet/lib/deploy-static.sh mobile-sprite-pack dist` completed successfully (deployment `6e900500-bb0a-4133-a848-d0e354f2fc45`); the custom HTTPS domain returned 200 afterward.

No known product gaps remain. Native iOS share-sheet invocation still requires a physical-device smoke test, as it cannot be invoked in this Linux browser container; its supported browser path remains unchanged.
