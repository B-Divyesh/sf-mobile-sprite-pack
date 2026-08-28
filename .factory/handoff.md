# Pocket Sprite Pack — verification handoff

## Release decision

**PASS — candidate `846b67b986a2f997fdb68e5d03d480c1c6cf12fe` is verified at <https://mobile-sprite-pack.sociobot.in/>.** No product defects were found at critical, high, medium, or low severity.

## What was independently verified

- Clean `npm ci`, `npm test` (7/7), and the exact `npm run build` all pass. The build runs strict TypeScript, creates `dist/`, and stays well under the static initial-JS/CSS/image budgets.
- All 20 Playwright checks pass across desktop Chromium and a 390px iPhone-class profile. The evidence includes real 16-frame atlas ZIP export, animated GIF timing, keyboard frame navigation, mobile overflow and target geometry, malformed-grid recovery, IndexedDB resume while offline, service-worker update indication, legal routes, and Axe serious/critical scans.
- Additional independent mobile checks exercised invalid file type, a file over the 25 MiB boundary, recovery with a valid file, download, visible keyboard focus, reduced motion, no console/page errors, and no horizontal overflow.
- The live PWA registers its worker, precaches an 18-entry shell including the hashed app assets, reloads offline, and matches the local HTML/manifest/JS/CSS build byte-for-byte. Its worker differs only in the intentionally regenerated cache-version token.
- Normal use sends no upload, analytics, CDN, font, or other third-party request. Local recovery is IndexedDB; the billing API is contacted only after a user supplies a license. Live CSP, permissions, referrer, HSTS, framing, MIME, and caching policies are present.

## Verification record and known limits

Full evidence, commands, hashes, response headers, boundary outcomes, and severity assessment are in [`.factory/verification-4.md`](verification-4.md).

Lighthouse 13.4.1 produced advisory 100/100 category values (LCP 1.16s, TBT 0ms, CLS 0.001) but recorded a post-audit container browser crash during screenshot collection, so those values are not represented as a clean Lighthouse pass. All direct performance, accessibility, browser, and live-network checks passed.

The iOS native share-sheet branch cannot be invoked in this Linux container; its supported code path remains available. This is the only remaining physical-device follow-up, not a release blocker.
