# Pocket Sprite Pack — repair handoff

## Release decision

**PASS locally — repaired from verifier baseline `dc38043cd485b436b3f48a494f82216d148620b3`.** The researched brief, visual system, local-only workflow, free 16-frame export, and existing successful behaviors are preserved.

## Repairs

1. **Offline app shell:** `scripts/postbuild.mjs` now enumerates the built artifact and generates `dist/sw.js` with every executable app-shell dependency, including content-hashed JS and CSS. It creates a fresh `psp-…` cache version on every build. The worker is cache-first for assets, network-first for navigation, and uses Vary-safe cache matching for reliable offline reloads.
2. **Grid integrity:** `validateGrid` rejects non-integers, values outside the source/64-cell limits, and rows/columns that do not evenly divide the image. The editor preserves the prior valid preview, marks inputs invalid, and announces a specific live error instead of throwing.
3. **Update notice:** activation detects a prior `psp-…` cache, claims clients, and sends `APP_UPDATED`; the app also observes waiting/installing workers. The in-app toast is covered with a real old-profile worker-update test.
4. **Static deployment policy:** Azure Static Web Apps' `public/staticwebapp.config.json` (plus a portable `_headers` equivalent) ships a restrictive CSP, Permissions-Policy, MIME/referrer/frame protections, revalidation for HTML/worker responses, and one-year immutable caching for hashed assets. Deployment-policy files are deliberately excluded from the service-worker precache because compatible hosts treat them as configuration.

## Run and verify

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Evidence from this repair checkout on 2026-08-27 UTC:

- Clean `npm ci`: installed 55 packages; audit 0 vulnerabilities.
- `npm test`: **7/7** tests passed (pixel/grid validation, generated worker contract, deployment policy, ZIP behavior).
- `npm run build`: passed strict TypeScript and Vite; `dist/index.html` is at the static root and the generated worker precaches 18 shell paths.
- `npm run test:e2e`: **16/16** Playwright checks passed across desktop Chromium and iPhone 13 Chromium (390px): normal 16-frame ZIP, GIF timing, keyboard arrow navigation, no mobile overflow, true offline interactive reload, non-divisible/out-of-range grid recovery, real old-profile worker update toast, legal routes, and Axe serious/critical = 0.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Production artifact budgets: JS 27,518 bytes / 10,277 gzip; CSS 16,372 / 4,530 gzip; hero WebP 33,462 bytes.
- Lighthouse mobile on the production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 92; FCP 1.0s, LCP 1.3s, TBT 0ms, CLS 0.001. Lighthouse wrote its JSON report before Chrome's screenshot-cleanup tab crash; the scores above are from that report.

## Deployment

Artifact class remains **static PWA**. Deploy `./dist` unchanged using the factory static deployment. The artifact includes Azure Static Web Apps' `staticwebapp.config.json` and a portable `_headers` policy; the static host must honor it rather than replacing its cache/security policy. After deployment, verify `sw.js` is no-cache, hashed `/assets/*` are immutable, and the CSP/Permissions-Policy/frame protections are present on `/`.

Deployed to `https://mobile-sprite-pack.sociobot.in/` from repair commit `bde45b5` on 2026-08-27 UTC. Live checks confirmed the new `index-DoEH_l5p.js` bundle, `Cache-Control: no-cache` for `/` and `/sw.js`, `public, max-age=31536000, immutable` for the hashed JS, and CSP, Permissions-Policy, and `X-Frame-Options: DENY`. The factory `verify-url.sh` check returned HTTP 200 in 1064ms with no console errors, title/lang, one `h1`, a `main` landmark, and zero images missing alt text.

## Known gaps

- The container cannot exercise the native iOS share sheet; the standard ZIP download and the iOS-specific share branch remain intact.
- Animated WebP depends on browser `ImageDecoder`; unsupported browsers retain the existing first-frame warning and GIF/numbered-image fallback.
