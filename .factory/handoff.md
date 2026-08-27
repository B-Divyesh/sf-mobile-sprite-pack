# Pocket Sprite Pack — build handoff

## Shipped

Pocket Sprite Pack v1 is a static, installable offline PWA for game-jam sprite handoff. The complete free workflow accepts a single spritesheet, numbered PNG/WebP files, or animated GIF/WebP; provides native-pixel inspection, frame strip and playback; performs non-destructive transparent trim/padding, palette reduction, and optional Floyd–Steinberg dithering; then produces a valid ZIP containing `spritesheet.png` and `atlas.json`.

Key implementation details:

- Plain TypeScript + Vite, 26.69 KB initial JS and 16.36 KB CSS uncompressed (10.09 KB / 4.54 KB gzip).
- GIF frame composition/disposal and timing are decoded locally; animated WebP uses the browser `ImageDecoder` capability.
- Grid suggestion covers common pixel cell sizes but is only applied when the user chooses “Detect grid,” so a standalone square sprite is not misclassified.
- All transforms copy decoded pixels; source files are never mutated.
- Last-source recovery uses IndexedDB. No artwork or project metadata leaves the device.
- A versioned service worker precaches the shell, legal pages, icons, and offline fallback; hashed assets are cached on first use.
- iOS export uses Web Share with a ZIP `File` when supported, otherwise a standard Blob download.
- Mobile safety guards: 25 MB per compressed source, 32 decoded megapixels per project, and 8192px per export-sheet edge.
- Pocket Pro is a US $9 one-time unlock for custom palettes and batches above 16 frames. It follows the Sociobot checkout/verify contract, caches verification for one day, and supports pasted-license restore. Core 16-frame export remains free.
- `/privacy/` and `/terms/` are physical static pages. There are no analytics, CDN assets, third-party fonts, or embedded payment providers.
- Original art-deco depot art was generated with `factory-image`, reviewed, corrected to remove letter-like artifacts, cropped, and optimized to a 33.5 KB WebP. Prompt and provenance are in `.factory/design.md` and `assets/src/`.

## Run and verify

```sh
npm install
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Deployment contract: static output is `./dist`; `dist/index.html` exists at its root. Exact build command: `npm run build`.

Verification completed August 27, 2026:

- `npm test`: 4/4 unit tests pass (palette parsing, alpha bounds/trim, grid inference, ZIP signatures).
- `npm run build`: passes TypeScript and Vite build; `dist/` includes the app shell, manifest, service worker, offline page, legal routes, robots, sitemap, icons, and art.
- `npm run test:e2e`: 10/10 across desktop Chromium and mobile Chromium at iPhone-class dimensions. Covers a real 16-frame atlas ZIP download, ZIP entry integrity, animated GIF timing/frame navigation, palette transform, offline service-worker reload, static legal routes, console/page errors, semantic landmarks, and axe.
- Axe via Playwright: zero serious or critical violations on desktop and mobile.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.2 s, Speed Index 0.9 s, CLS 0, Total Blocking Time 0 ms.
- Output budgets: JS 26.69 KB (10.09 KB gzip), CSS 16.36 KB (4.54 KB gzip), hero WebP 33.5 KB.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Manual screenshots reviewed at desktop and 393px mobile widths.

## Known gaps and release steps

- Browsers without `ImageDecoder` expose only the first frame of an animated WebP. The app says so at intake and recommends animated GIF or numbered PNGs; static WebP remains fully supported.
- The iOS share-sheet branch is implemented but cannot be exercised in container Chromium. Standard ZIP download is covered end to end.
- The factory must register the paid product/test product and confirm the final US $9 price before release. No product ID is hardcoded. Local/staging hosts use `pilot-api.sociobot.in`; the canonical production hostname uses `api.sociobot.in`.
- Atlas output is JSON hash format with per-frame duration. Engine-specific formats are post-v1 additions.
