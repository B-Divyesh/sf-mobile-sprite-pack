# Pocket Sprite Pack — verification handoff

## FAIL — do not release

Independent verification of candidate `dc38043cd485b436b3f48a494f82216d148620b3` against https://mobile-sprite-pack.sociobot.in/ completed on 2026-08-27 UTC. The live deployment byte-matches the candidate, and the ordinary online 16-frame export workflow works, but the release fails the offline-PWA and data-integrity acceptance contract.

The full evidence is in `.factory/verification.md`.

## Reproduce

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

All four commands pass for the candidate (4/4 unit tests; 10/10 desktop/mobile Playwright tests). The type check is included in `npm run build`; there is no lint script. Static output is `dist/`.

## Blocking defects

1. **P1 offline PWA:** the service worker does not precache the hashed JS/CSS. A fresh activated install reloaded offline becomes a static page; the JS/CSS fail and controls do not work. The live host's 30-second HTTP cache can mask this temporarily.
2. **P1 sprite integrity/input handling:** a 64×64 source split 3×3 silently becomes 9×21×21 frames and discards edge pixels. Out-of-range grid input throws an uncaught page error rather than an actionable validation message.
3. **P1 update notice:** a changed worker with unchanged `psp-v1` cache name updates without displaying the required in-app update toast.
4. **P2 deployment policy:** hashed static assets are only cached for 30 seconds and production lacks CSP, Permissions-Policy, and clickjacking protection.

## Positive evidence

- Build sizes: JS 26,697 bytes / 10,090 gzip; CSS 16,372 / 4,540 gzip; hero 33,462 bytes.
- Lighthouse mobile: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; FCP 1.1s, LCP 1.2s, TBT 30ms, CLS 0.001.
- Axe serious/critical: zero on desktop and mobile. Keyboard focus, reduced motion, 390px layout, normal input recovery, live 16-frame ZIP export, privacy/legal routes, and no third-party normal-workflow requests passed.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Next steps

Precache all generated app-shell assets using a build-versioned manifest; generate a new worker/cache version each release and test an old-profile update; validate and announce grid constraints before slicing; configure immutable caching for hashed assets plus CSP/Permissions-Policy/frame protections; then rerun the evidence in `.factory/verification.md`.
