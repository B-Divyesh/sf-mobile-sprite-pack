# Pocket Sprite Pack

Pocket Sprite Pack is a touch-first, offline sprite handoff tool for game-jam artists working from a phone, tablet, or shared asset folder. It turns PNG sequences, animated GIF/WebP files, and uniform spritesheets into an engine-ready `spritesheet.png` plus `atlas.json`, downloaded together as a ZIP.

Live product: <https://mobile-sprite-pack.sociobot.in>

## What it does

- Opens PNG, GIF, and WebP without uploading art.
- Reconstructs animated GIF frames and timing; uses the browser's native animated WebP decoder where available.
- Suggests common uniform grids and supports explicit rows/columns.
- Previews frames with pixel-perfect zoom, playback, keyboard arrow navigation, and a touch-friendly frame strip.
- Trims transparency, adds transparent padding, and quantizes to three included palettes with optional Floyd–Steinberg dithering.
- Exports a valid PNG spritesheet and JSON atlas in a ZIP. On iOS it uses the share sheet when the browser supports file sharing.
- Persists the last source project in IndexedDB for local recovery and works offline after the first successful visit.

The free tier supports the complete 16-frame workflow. Pocket Pro is a US $9 one-time license that adds custom palettes and batches above 16 frames through the Sociobot billing API; no payment provider is embedded.

## Develop

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
```

The app is plain TypeScript with Vite. There are no runtime CDNs, accounts, analytics, or server-side image processors.

## Test and build

```sh
npm test
npm run build
npx playwright install chromium   # once, for browser tests
npm run test:e2e
```

The exact production build command is `npm run build`. It creates `dist/` with `dist/index.html` at its root, plus physical `/privacy/`, `/terms/`, and offline fallback pages. The postbuild step generates a fresh service-worker cache version and precaches every app-shell dependency, including hashed JS and CSS.

Deploy `dist/` as a static site over HTTPS. It includes Azure Static Web Apps' `staticwebapp.config.json` (and a portable `_headers` equivalent): content-hashed assets are immutable for one year; HTML and `sw.js` revalidate; CSP, Permissions-Policy, referrer, MIME, and frame protections are defined in the artifact. Do not overwrite those headers at the host.

## Browser notes

- Animated GIF decoding is bundled and works offline.
- Animated WebP uses `ImageDecoder`; browsers without it open the first frame and show an explicit warning. A GIF or numbered PNG sequence is the interoperable fallback.
- Projects are capped at 25 MB per input file and 32 decoded megapixels to avoid mobile tab termination. Export sheets are capped at 8192 px on either edge.
- Source files are never modified. Clearing the local project removes only the IndexedDB recovery copy.

## Product records

The researched scope is in [`.factory/brief.json`](.factory/brief.json), the visual system and image provenance are in [`.factory/design.md`](.factory/design.md), and verification details are in [`.factory/handoff.md`](.factory/handoff.md).

## License

MIT. See [`LICENSE`](LICENSE).
