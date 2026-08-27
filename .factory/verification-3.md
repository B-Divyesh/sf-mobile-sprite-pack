# Independent verification 3 — FAIL

**Candidate:** `537e70b7702be78cdb2fb3287c22cdd26f7c4e2b`  
**Live URL:** https://mobile-sprite-pack.sociobot.in/  
**Verified:** 2026-08-27 UTC  
**Decision:** **FAIL.** The candidate is functionally sound and the live deployment is the candidate build, but it does not meet the supplied mobile accessibility acceptance contract: several direct touch targets are smaller than 44 × 44 CSS px at the required 390px viewport.

## Clean environment and commands

Verification used a new detached clone of the requested SHA in `/tmp/mobile-sprite-pack-qa.LcIyDK`; no product source was changed.

```sh
git clone --no-local /work/repo /tmp/mobile-sprite-pack-qa.LcIyDK
git -C /tmp/mobile-sprite-pack-qa.LcIyDK checkout --detach 537e70b7702be78cdb2fb3287c22cdd26f7c4e2b
npm ci
npm test
npm run build
npx playwright install chromium
npx playwright test --reporter=line
npm audit --omit=dev
```

Results:

- `npm ci` succeeded: 55 packages installed, 0 audit vulnerabilities.
- `npm test` passed: 3 files, **7/7** tests.
- `npm run build` passed strict `tsc --noEmit`, Vite, and the postbuild worker step. `dist/` was produced.
- The repository has **no `lint` script**. The available type check is in the production build and passed.
- The isolated production browser suite passed **18/18**: desktop Chromium and iPhone 13/390px Chromium, including normal ZIP export, GIF timing, grid validation, local persistence, offline app shell, worker update notice, legal pages, keyboard navigation, and Axe serious/critical scans.
- `npm audit --omit=dev` reported **0 vulnerabilities**.

## Functional and boundary evidence

Fresh testing against the live HTTPS deployment on desktop and 390px mobile:

- Loaded the supplied 64 × 64 PNG, detected a 4 × 4 grid, trimmed transparency, added 1px padding, selected Moss pocket / four colors and Floyd–Steinberg dithering, and exported an atlas. Both downloaded ZIPs passed `unzip -t`; each contains `spritesheet.png` and `atlas.json`. The atlas contains 16 records and a 56 × 56 `RGBA8888` sheet with 14 × 14 frames.
- Keyboard focus on the preview has `rgb(244, 185, 66) solid 3px`; ArrowRight changed `Frame 1 / 16` to `Frame 2 / 16` on desktop and mobile.
- Invalid 3-column input gives the explicit even-division error, `aria-invalid="true"`, and retains the existing frame preview. Invalid `.txt` gives `wrong.txt is not a PNG, GIF, or WebP image.` A 25 MiB + 1 byte `.png` gives the explicit 25 MB safety-limit error. No console or page errors occurred.
- A transformed 16-frame project (grid, trim, padding, palette) was saved, the page reloaded, the context set offline, and **Resume last local project** restored `Frame 1 / 16`, 4 × 4 grid, trim, 1px padding, and Moss pocket palette. Clear local project removed `lastProject` from IndexedDB and hid Resume.
- A fresh live profile registered worker `psp-2632eed0b7b56e53`; its cache contained 18 app-shell resources including the hashed JS/CSS. With the network disabled, a reload rendered the packer and the Pro dialog opened; Escape closed it. The repository's passing update test independently replaces a versioned worker and verifies the update toast.

## Accessibility, mobile, and performance

- Axe on live desktop and 390px mobile found **0 serious or critical findings** (0 total violations in this run). The live document has `lang="en"`, a title, one `h1`, one `main`, alt text, a skip link, labelled controls, and live status feedback.
- At 390px, both document and body scroll widths were 390px. Reduced motion computed to `0.01ms` animation/transition durations and `scroll-behavior: auto`.
- Local production Lighthouse: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9s, LCP 1.4s, TBT 60ms, CLS 0.001. The Lighthouse process reported a browser-tab crash after emitting the valid report, a container/browser instability not reproduced in product browser checks.
- Build sizes: JS 29,598 bytes / 10,990 gzip; CSS 16,372 bytes / 4,540 gzip; decorative hero WebP 33,462 bytes. These meet the 200 KB JS, 50 KB CSS, and 300 KB hero budgets.

## Privacy, deployment identity, and policies

- During normal live use, browser requests were only to `mobile-sprite-pack.sociobot.in`; no upload, analytics, CDN, third-party font, or external request was made. Source inspection confirms license verification is the sole cross-origin call and occurs only when a license token exists; checkout is an explicit user action. Recovery data is local IndexedDB and is cleared by the UI.
- Live and candidate production files have identical SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `index.html` | `b742ef7f07218949aae3cec0cdf5a391e1f3b9d224440332cb9b2deba8327ea5` |
| `assets/index-DJfQ6mVG.js` | `326ba43916c96eb9b26609f45afa432a83ca34bf8ba9901817fbcf7983774d60` |
| `assets/index-Bh0VIuj3.css` | `c65be1b78b17951cb8c4d1be0b3ba83cf32773164f22ca6cfebd1e09b06098cd` |
| `manifest.webmanifest` | `3f49233e87069fe6c0f6e2ab480edee110d503fade4430726eb3be34d8a20e2c` |
| `privacy/index.html` | `f2bda1a7445b91191e7a61c4c88e94453f9cd76d5cb6aaa9ed85c0004ed98224` |
| `terms/index.html` | `c49fd3534fb6ba32346416c3216ebc82adc5175c3430196bd3bfda6eb6c4e68b` |

  `sw.js` differs only in its intentional postbuild `VERSION`; replacing that value makes local and live worker bytes identical (normalized SHA-256 `3ad68ae31febf44e29f31db62883636a9baa1bbfa0d7b04235553293db7573c6`). Chromium reports no manifest errors.
- Live HTML, legal pages, offline page, and worker use `Cache-Control: no-cache`; hashed JS/CSS use `public, max-age=31536000, immutable`. Responses include CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, and restrictive Permissions-Policy.

## Defects

### P2 — Direct mobile touch targets violate the 44 × 44px minimum

At the required 390px iPhone-class viewport, direct interactive element rectangles measured on the live candidate are:

- Header **Pro** button `#pro-button`: **37 × 44px**.
- Footer **Privacy** link: **43 × 44px**.
- Footer **Terms** link: **36 × 44px**.

This breaches the work order's non-negotiable 44 × 44 CSS-pixel touch-target rule. It is especially material on a phone-targeted sprite utility, where accidental taps should not make legal navigation or the license dialog harder to reach. Give these controls minimum inline/block dimensions (and retain at least 8px separation), then rerun the 390px keyboard/Axe/overflow checks.

## Release conclusion

Do not mark this candidate PASS until the P2 mobile target sizes are corrected and independently rechecked. No P0/P1 functional, privacy, deployment identity, PWA, console, or serious/critical Axe defect was reproduced.
