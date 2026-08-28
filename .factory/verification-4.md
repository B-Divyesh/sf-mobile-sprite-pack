# Independent verification 4 — PASS

**Candidate:** `846b67b986a2f997fdb68e5d03d480c1c6cf12fe` (`main`)

**Live URL:** <https://mobile-sprite-pack.sociobot.in/>

**Verified:** 2026-08-28 UTC from a clean checkout. This was an independent, no-product-code-change verification. Candidate `846b67b` changes the previous handoff only; its product tree is the deployed repair product from `e73bfc7`.

## Decision

**PASS.** The candidate delivers the researched smallest useful product: a local-first PWA that accepts PNG/GIF/WebP sources, finds a uniform grid, previews and transforms frames, and downloads a PNG spritesheet plus JSON atlas ZIP. The full free 16-frame path works on both desktop and a 390px mobile viewport. No open defects were found.

| Severity | Defects |
| --- | --- |
| Critical | None |
| High | None |
| Medium | None |
| Low | None |

Physical iOS share-sheet invocation remains outside the capability of this Linux browser container; the supported iOS branch is present and non-iOS download was exercised. This is not a release defect.

## Clean install, build, and repository tests

| Check | Result / evidence |
| --- | --- |
| Clean dependencies | `npm ci` passed: 55 packages installed; `npm audit` reported 0 vulnerabilities. |
| Unit tests | `npm test` passed: 3 files, 7 assertions. |
| Typecheck + exact production build | `npm run build` passed (`tsc --noEmit`, Vite, postbuild); generated `dist/` with 18 app-shell files. |
| Bundle budget | Initial JS is 29,598 bytes / 10,919 gzip bytes (under 200 KB); CSS is 16,416 bytes (under 50 KB); hero WebP is 33,462 bytes (under 300 KB). |
| Browser suite | All 20 checks passed: 10 desktop Chromium and 10 iPhone-class Chromium (390px), run in three independent batches: 8 + 2 + 10. |

The first unprepared `npm run test:e2e` reported 20 launch failures because package Playwright 1.62.1 did not have its Chromium 1234 executable installed. Per the work order and README, `npx playwright install chromium` was run; it installed the matching browser and every product test passed. This is a verifier-environment bootstrap condition, not an application failure.

## End-to-end and boundary evidence

On both desktop and mobile the authored browser suite passed real 16-frame PNG import, automatic 4×4 detection, frame-strip rendering, transparency trim, ZIP download, GIF reconstruction with 80ms timing, keyboard ArrowRight navigation, invalid-grid recovery, IndexedDB resume with settings after an offline reload, legal pages, service-worker update notice, and Axe scanning.

Independent 390px mobile checks against the production build additionally confirmed:

- Normal path: load `tests/assets/test-sheet.png`, detect grid, trim and add padding, export `pocket-sprite-pack-2026-08-28.zip`.
- Invalid input: a text file reports `not-a-sprite.txt is not a PNG, GIF, or WebP image.`
- Boundary: a synthetic 25 MiB + 1 byte PNG reports the documented `over the 25 MB safety limit.`
- Recovery: a valid 16-frame sheet loads after both errors; canvas ArrowRight changes the current frame to `Frame 2 / 16`.
- No page errors or console errors were captured. The viewport/document/body width is 390px, with no horizontal overflow.

## PWA, accessibility, privacy, and response policy

- The production manifest has `display: standalone`, versioned installed start URL, matching theme/background colours, and original 192px, 512px, and 512px maskable icons.
- A fresh live 390px profile registered `https://mobile-sprite-pack.sociobot.in/sw.js`; its `psp-*` cache had 18 shell entries including `/index.html`, hashed JS, and hashed CSS. With `context.setOffline(true)`, reload still rendered `Your sprites. Cleared for departure.`
- The suite’s version-replacement worker test passed on desktop and mobile, confirming the visible update notice.
- Live 390px keyboard tab traversal reaches the skip link, brand, Pro control, pack link, drop zone, source input, canvas, clear action, and legal links. Keyboard focus is the designed brass `3px` outline with a `3px` offset. The tested direct header and legal targets are at least 44×44px with 20px legal-link separation.
- Live Axe found **0 serious or critical violations**. The document has `lang=en`, one title, one `h1`, one `main`, labelled controls, status live regions, and real privacy/terms pages. Under `prefers-reduced-motion: reduce`, transition and animation durations resolve to `0.00001s`.
- With no license stored, live startup requested only same-origin HTML, JS, CSS, and the original hero image: no upload, analytics, CDN, font, or third-party request. An intentional invalid-license restore made exactly the documented request to `https://api.sociobot.in/api/v1/products/mobile-sprite-pack/verify?...`, returned the clear inactive-license message, and produced no errors. Static inspection confirms source art is processed locally, recovery uses IndexedDB, and license data uses localStorage only after the user supplies a token.
- Live HTML and `sw.js` use `Cache-Control: no-cache`; hashed assets use `public, max-age=31536000, immutable`. Live responses supply HSTS, CSP (self-only except the documented Sociobot billing endpoints), Permissions-Policy, Referrer-Policy, `nosniff`, and `X-Frame-Options: DENY`.

Lighthouse 13.4.1 recorded 100/100 Performance, Accessibility, Best Practices, and SEO, LCP 1,157ms, TBT 0ms, and CLS 0.0010, but its report contains a post-audit `TARGET_CRASHED` error while collecting the full-page screenshot in this container. Those numerical scores are therefore advisory rather than claimed as a clean Lighthouse pass. The independent bundle, browser, Axe, and live response checks above passed cleanly.

## Live identity

The live candidate’s HTML, manifest, JS, and CSS exactly match the fresh `dist/` build:

| File | SHA-256 |
| --- | --- |
| `index.html` | `4885a6039f664934cfdfc1a03e46d536306c085c6bd0a5fdef1611c3e8bd00ae` |
| `assets/index-CtX6blOf.js` | `aa610f236e8e5337d42ec35337507107af27c05c645a70e304b88abb546b8a5c` |
| `assets/index-DNBgALih.css` | `6958c6216b39e51beff77c8636d55d025a36322fcd88befb8f7b78885eb6ec1d` |

The local and live workers differ only in the postbuild cache-version token (`psp-*`); after normalizing that token their source is byte-identical. This is the intended per-build worker-version behavior, not a deployment mismatch.

