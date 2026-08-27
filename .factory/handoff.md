# Pocket Sprite Pack — repair handoff

## Release decision

**PASS — repaired verifier P2 from candidate `76c1bd7820991aeb9f2b8bbb9f423db3352162e5`.** Product code was committed as `3bc4cf943f873d0144df67dc2a8eb85864e9fd66` (`fix: persist local project settings`) and deployed as the existing static offline PWA.

## Repair

The recovery database now stores a versioned (`schema: 1`) project record containing source `File` objects and all packing state: columns, rows, trim, padding, palette, dithering, custom palette text, selected frame, per-frame timing, zoom, and atlas export columns. Restoring decodes the original source, reapplies the saved grid and transform before rendering, then restores timing and selected-frame state.

Every successful setting change is serialized through the local-save queue, so an older asynchronous IndexedDB transaction cannot overwrite a newer user change. Invalid grid entries still retain the prior valid project state. Existing pre-schema projects that contain only `files` remain resumable and are upgraded on the next successful save.

The new Playwright regression creates a 4×4 16-frame sheet, applies trim, 1px padding, Moss palette + Floyd–Steinberg dithering, selects frame 3, changes that frame to 240ms, sets zoom 9 and two export columns, verifies the exact IndexedDB schema record, reloads, switches the browser offline, resumes, and verifies every setting. It passes on desktop and 390px mobile Chromium.

## Verification

Run from a clean checkout on 2026-08-27 UTC:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

- Clean `npm ci`: 55 packages installed; audit reported 0 vulnerabilities.
- `npm test`: **7/7** passed, including grid/ZIP/service-worker/deployment-policy tests. There is no standalone lint script; strict `tsc --noEmit` runs in the production build.
- `npm run build`: passed and produced `dist/index.html`; postbuild generated a versioned service-worker shell with 18 paths.
- `npm run test:e2e`: **18/18** passed on desktop Chromium and the 390px mobile project. It covers normal ZIP export, GIF timing, keyboard frame navigation/mobile overflow, this persisted transformed-project recovery while offline, interactive offline app-shell reload, invalid grid recovery, update notice, legal pages, and desktop/mobile Axe serious/critical findings (0).
- `npm audit --omit=dev`: 0 vulnerabilities.
- Local production preview verified with `/opt/fleet/lib/verify-url.sh`: HTTP 200 in 616ms, no console/page errors, title/lang, one `h1`, `main`, all image alt text, and labelled buttons.
- Lighthouse against the local production preview: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9s, LCP 1.3s, TBT 0ms, CLS 0.001.
- Production budgets: JS 29,598 bytes / 10,990 gzip; CSS 16,372 / 4,540 gzip; hero WebP 33,462 bytes. All are within the static-PWA budgets.
- Live 390px normal flow loaded a sheet, detected 4×4, advanced by keyboard to Frame 2 / 16, and reported no console/page errors. Its only network host was `mobile-sprite-pack.sociobot.in`; no upload, analytics, CDN, font, or third-party request was made.

## Deployment and live identity

Deployed `dist/` with `/opt/fleet/lib/deploy-static.sh mobile-sprite-pack /work/repo/dist`. Azure Static Web Apps deployment `57348e8d-c749-4d83-a007-19ff3eb31041` succeeded; the existing custom domain was Ready and `https://mobile-sprite-pack.sociobot.in/` returned 200.

The live artifact matches the local deployed build byte-for-byte:

- `index.html`: `b742ef7f07218949aae3cec0cdf5a391e1f3b9d224440332cb9b2deba8327ea5`
- `assets/index-DJfQ6mVG.js`: `326ba43916c96eb9b26609f45afa432a83ca34bf8ba9901817fbcf7983774d60`
- `assets/index-Bh0VIuj3.css`: `c65be1b78b17951cb8c4d1be0b3ba83cf32773164f22ca6cfebd1e09b06098cd`
- `sw.js`: `cf9b665ed0e6066f03e867f65a9d617b51ff1d0b64afb4250ab60af27ba13486`

Live `/` and `/sw.js` are `Cache-Control: no-cache`; the hashed JavaScript is `public, max-age=31536000, immutable`. The live response includes CSP, Permissions-Policy, Referrer-Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and HSTS. A live `verify-url.sh` check also returned 200 in 671ms with no console errors and the expected title/lang/landmarks/alt text.

## Known gaps

- The container cannot invoke the native iOS share sheet; the existing iOS `navigator.share` path remains in place.
- Animated WebP frame decoding depends on `ImageDecoder`; unsupported browsers retain the existing first-frame warning and GIF/numbered-image fallback.
