# Independent verification 2 — FAIL

**Candidate:** `76c1bd7820991aeb9f2b8bbb9f423db3352162e5`  
**Live URL:** https://mobile-sprite-pack.sociobot.in/  
**Verified:** 2026-08-27 UTC  
**Decision:** **FAIL** against the PWA/local-first acceptance contract. The previous offline, grid-validation, update-notice, and deployment-header failures are repaired, but an in-progress project does not survive refresh/tab-close as required: only its raw source file is recovered; grid and finish settings are discarded.

## Environment and repeatable commands

Verification began from the clean candidate checkout at the SHA above. No product code was changed.

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Results:

- `npm ci`: success, 55 packages installed; audit reported zero vulnerabilities.
- `npm test`: **7/7** Vitest tests passed.
- `npm run build`: passed strict `tsc --noEmit`, Vite, and postbuild; produced `dist/`.
- `npm run test:e2e`: **16/16** Playwright tests passed on desktop Chromium and 390px iPhone-class Chromium. The first attempted run could not start because this checkout declares Playwright 1.62.1 while its browser binary was not installed; after the repository-directed `npx playwright install chromium`, the isolated rerun passed.
- `npm audit --omit=dev`: **0 vulnerabilities**. There is no lint script; the available type check is part of the exact production build and passed.

## Confirmed working

- **Core job, live URL:** on the deployed site I opened the supplied 64×64 sheet, detected its 4×4 grid, trimmed it, added 1px transparent padding, applied the Moss pocket palette with Floyd–Steinberg dithering, and downloaded an atlas ZIP with no console/page errors. `unzip -t` passed; it contains `spritesheet.png` and `atlas.json`. The atlas has 16 frame records, each 14×14, and reports a 56×56 RGBA8888 sheet.
- **Input boundaries and recovery, live URL:** `.txt` input reports `wrong.txt is not a PNG, GIF, or WebP image.`; a 25 MiB + 1 byte PNG reports the explicit safety-limit error; 3 columns on the 64px source is rejected with an even-division explanation and `aria-invalid=true`; 100 columns is rejected with the 1–64 range error. Detect grid then restores `Frame 1 / 16`; no page errors occurred.
- **Animation and export:** the repository suite independently exercises two-frame GIF reconstruction/timing, normal 16-frame ZIP output, palette transforms, legal pages, and source recovery paths.
- **PWA / deployment repair:** in a fresh live 390px browser profile, the active `psp-fa6ebd624ebe242d` cache contains all 18 shell URLs, including `/assets/index-DoEH_l5p.js` and `/assets/index-Bh0VIuj3.css`. With network disabled, reload retained the interactive packer and opening Pro worked; no console errors occurred. The suite's old-profile worker replacement test passed on desktop and mobile, proving the versioned-worker update toast path.
- **Accessibility and mobile:** independent Axe scans of the live site found **0 serious/critical findings** on desktop and 390px mobile (in fact 0 violations). At 390px document and body widths were both 390px. Keyboard focus on the preview has a visible `rgb(244,185,66)` 3px solid outline; ArrowRight changed Frame 1/16 to 2/16; the Pro dialog received focus and closed with Escape. Under reduced motion, transitions/animations were `0.01ms` and smooth scrolling was disabled.
- **Privacy/network:** normal live use requested only `mobile-sprite-pack.sociobot.in` resources; it made no image upload, analytics, CDN, third-party font, or other outbound request. Source inspection confirms the only cross-origin endpoint is the Sociobot license API, used only when a license token is present; checkout is an explicit user link. IndexedDB is used for recovery, and physical privacy and terms pages are present.
- **Live identity and policies:** live SHA-256 values match the production candidate build for `index.html` (`142f615e…`), JS (`92f60f30…`), CSS (`c65be1b…`), privacy (`f2bda1a7…`), terms (`c49fd353…`), and manifest (`3f49233e…`). `sw.js` differs only in its intentionally build-time-generated cache version; after replacing that value, local and live worker text/shell are identical. Live HTML and `sw.js` are `no-cache`; hashed JS/CSS are `public, max-age=31536000, immutable`; CSP, Permissions-Policy, Referrer-Policy, `X-Content-Type-Options`, `X-Frame-Options: DENY`, and HSTS are present. Chromium recognizes the live manifest with no CDP manifest errors.
- **Budgets:** production JS is 27,518 bytes (10,292 gzip); CSS 16,372 (4,515 gzip); hero WebP 33,462 bytes. All meet the 200 KB JS, 50 KB CSS, and 300 KB hero budgets. Fresh mobile Lighthouse performance was **99** on the local production preview (FCP 1.7s, LCP 1.7s, TBT 0ms, CLS 0.001); full-page screenshot collection was disabled because the container's Chromium crashes in that cleanup step. Axe supplies the independent accessibility result above.

## Defects

### P2 — Last project settings are not local-first persistent

**Reproduction (live deployment):**

1. Load `test-sheet.png`, use Detect grid so the editor is `Frame 1 / 16`, then refresh after the local save completes.
2. Click **Resume last local project**.
3. The source is restored but the editor becomes **`Frame 1 / 1`**: columns/rows reset to 1×1 and the previously chosen trim, padding, palette, dithering, selected frame, timing, zoom, and export-column settings are not restored.

The app preserves the source, so this is recoverable, but it loses the user’s packing work on refresh/tab close. This violates the supplied PWA/local-first requirement that state survive refresh and tab close, and makes the mobile in-progress workflow unreliable. Store and restore the project configuration alongside the files (with a schema/version), then test a 16-frame transformed project through refresh, close/reopen, and offline resume.

## Release conclusion

Do not mark this candidate PASS until project configuration, not merely the raw source, survives the documented recovery path. Re-run the normal 16-frame export, offline reload, and persistence test after that correction. The earlier P1 deployment failures are no longer reproduced.
