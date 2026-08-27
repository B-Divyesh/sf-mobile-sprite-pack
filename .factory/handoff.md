# Pocket Sprite Pack — independent verification handoff

## Release decision

**FAIL — candidate `537e70b7702be78cdb2fb3287c22cdd26f7c4e2b` at https://mobile-sprite-pack.sociobot.in/.** The deployed product is functionally correct and matches the candidate artifact, but it misses the required 44 × 44px mobile touch-target minimum.

## What was independently verified

From a fresh detached checkout: `npm ci` (55 packages, 0 vulnerabilities), `npm test` (**7/7**), exact `npm run build` (strict TypeScript plus production `dist/`), Chromium installation, and `npx playwright test --reporter=line` (**18/18** desktop and 390px mobile). No lint command exists; the production build contains the available type check.

Live testing verified a 16-frame 4 × 4 sheet through trim, padding, Moss palette/dithering, ZIP/JSON export, keyboard frame navigation, invalid grid/input recovery, saved project resume while offline, service-worker cache/offline reload, clear-local-data behavior, Pro dialog keyboard dismissal, no console/page errors, and no normal-use outbound hosts other than the product origin. ZIP integrity passed. Axe found zero serious/critical findings on desktop and 390px mobile. Reduced motion is honored. Local Lighthouse scored 100/100/100/100 (performance/accessibility/best practices/SEO); JS/CSS/hero budgets pass.

Live `index.html`, JS, CSS, manifest, legal pages, and offline page match the candidate SHA-256 exactly; the service worker matches after normalizing its intentional postbuild cache version. Live caching and CSP/HSTS/referrer/frame/content-type/permissions policies are present. Full evidence and hashes are in `.factory/verification-3.md`.

## Required follow-up

Fix the P2 mobile target defect, then rerun the 390px target-size, keyboard, Axe, overflow, offline, and normal 16-frame export checks:

- Header `#pro-button` is 37 × 44px.
- Footer Privacy link is 43 × 44px.
- Footer Terms link is 36 × 44px.

All must be at least 44 × 44 CSS px, with safe spacing between adjacent controls. Native iOS share-sheet invocation remains untestable in this Linux container; its supported browser path is present but needs a device smoke test after release.
