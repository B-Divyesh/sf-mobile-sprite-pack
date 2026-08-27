# Independent verification — FAIL

**Candidate:** `dc38043cd485b436b3f48a494f82216d148620b3`  
**URL:** https://mobile-sprite-pack.sociobot.in/  
**Verified:** 2026-08-27 UTC  
**Verdict:** **FAIL** — the normal online workflow is good, but the PWA is not reliably usable offline and manual frame-grid input can silently corrupt a sprite.

## Environment and commands

Verification was run from a clean detached worktree at the candidate SHA (`/tmp/mobile-sprite-pack-qa`):

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Results:

- `npm ci`: success; audit reported 0 vulnerabilities.
- `npm test`: **4/4** Vitest unit tests passed.
- `npm run build`: success (`tsc --noEmit`, Vite build, postbuild); `dist/` produced.
- `npm run test:e2e`: **10/10** Playwright tests passed, across desktop Chromium and iPhone-class Chromium.
- `npm audit --omit=dev`: 0 vulnerabilities.
- No lint script exists; the available type check is included in `npm run build` and passed.
- Lighthouse mobile against the production build: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.1 s, LCP 1.2 s, TBT 30 ms, CLS 0.001. The Chrome process crashed during Lighthouse's final screenshot cleanup, but it wrote the complete JSON audit/report before exit.

The built initial JS is 26,697 bytes (10,090 gzip) and CSS is 16,372 bytes (4,540 gzip), both inside the stated static-product budgets. The decorative WebP is 33,462 bytes.

## What passed

- End-to-end normal path on the local build and live URL: loaded the supplied 64×64 16-frame sheet, detected a 4×4 grid, previewed frames, trimmed, and downloaded `pocket-sprite-pack-2026-08-27.zip`.
- Animated-GIF path, timing, frame navigation, palette transform, legal routes, export, and source-file rejection are covered by the passing Playwright suite. Independently, a `.txt` upload gave the clear error `not-a-sprite.txt is not a PNG, GIF, or WebP image.` and a subsequent valid upload recovered successfully.
- 390px mobile check: no horizontal overflow (`innerWidth`, document width, and body width were all 390); native-preview arrow-key navigation changed Frame 1/16 to Frame 2/16; visible keyboard focus was a 3px brass outline; reduced-motion computed transition duration was 0.01ms and smooth scrolling was disabled.
- Desktop and mobile axe scans: zero serious or critical findings. The page has a title, `lang`, one `h1`, `main`, alt text, labels, landmarks, skip link, and no load-time console/page errors on the normal path.
- Privacy/network: a live normal workflow made requests only to the same-origin document, JS, CSS, hero image, and its local `blob:` download. No analytics, CDN font/script, or artwork upload request was observed. Local IndexedDB recovery and the physical privacy/terms pages are present.
- Manifest contains standalone display, start URL, theme/background colors, 192/512/maskable icons. The build includes an offline page and service worker.
- Live deployment matches the candidate exactly: SHA-256 matched for `index.html`, the hashed JS and CSS, `sw.js`, `/privacy/`, and `/terms/`.

## Defects

### P1 — offline PWA is not reliably functional after first install

The worker precaches HTML, manifest, icons, hero, and legal pages, but **not** `assets/index-BD4g-hLa.js` or `assets/index-Bh0VIuj3.css`. A clean browser's cache after service-worker activation contains only those 11 shell URLs; it lacks the executable application bundles.

Reproduction against the fresh local production build:

1. Open `/`, wait for `navigator.serviceWorker.controller`.
2. Disable network and reload.
3. The JS and CSS requests fail with two `net::ERR_FAILED` console errors; clicking **Pro** does not open its dialog, proving the page is static rather than functional.

The live server gives those hashed assets only `cache-control: public, must-revalidate, max-age=30`, so a temporary browser HTTP-cache hit can mask the defect; it is not a service-worker offline guarantee. This violates the brief's offline PWA job and the required offline-reload check.

**Fix:** precache every build shell dependency, including the hashed JS/CSS (prefer a build-generated precache manifest), then test a new browser profile offline after HTTP cache is cleared/expired and exercise an interaction, not merely static HTML visibility.

### P1 — frame-grid inputs can silently lose sprite pixels and throw uncaught errors

The supplied source is 64×64. Setting Columns=3 and Rows=3 produces 9 frames of 21×21 with no warning, silently dropping the rightmost and bottommost source pixels. This is data corruption in a core packaging control.

Setting Columns=100 (despite the HTML `max=64`) and tabbing away produces the uncaught page error `Grid cells must be at least one pixel.` The status remains the prior success message rather than giving an actionable validation error. Clicking **Detect grid** can recover, but failure is neither handled nor announced.

**Fix:** validate finite integer grid values before rebuild; reject values outside bounds and grids that do not evenly divide the source (or explicitly offer/label a crop); catch rebuild errors and preserve the prior valid preview with an `aria-live` error.

### P1 — update-notification contract fails when the worker script changes without a cache-name change

In a disposable copy of the built artifact, I installed the candidate worker, changed only its script bytes while retaining `const VERSION='psp-v1'`, then called `registration.update()` in a persistent Chromium profile. The worker updated but `#update-toast` stayed hidden.

`APP_UPDATED` is sent only when a cache key differs from `psp-v1`; a changed worker sharing that static cache key observes no old key and sends no message. The cache name is not derived from the build. This does not meet the promised in-app update notice reliably.

**Fix:** generate a unique cache/build version for every release and test the update path with an old profile. Keep the worker's update notice tied to an actual newly activated build.

### P2 — production caching and browser hardening headers are incomplete

The live page provides HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. It does **not** provide `Content-Security-Policy`, `Permissions-Policy`, clickjacking protection (`frame-ancestors` or `X-Frame-Options`), or immutable long-lived cache control for content-hashed assets (all inspected assets use `max-age=30`).

**Fix:** configure the static host with a restrictive CSP appropriate for this local-first app, a minimal Permissions-Policy, `frame-ancestors 'none'`/equivalent, and `public, max-age=31536000, immutable` for hashed assets while retaining short/no-cache HTML and service worker responses.

## Release decision

Do not release this candidate as the requested offline PWA. Re-verify after the P1 items are fixed, including a real offline interactive reload, a service-worker update from a prior build, and divisible/non-divisible/out-of-range grid cases.
