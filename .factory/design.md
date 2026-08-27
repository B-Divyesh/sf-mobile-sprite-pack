# Pocket Sprite Pack — visual system

## Thesis

Pocket Sprite Pack is an **art-deco transit poster turned portable dispatch desk**. A game-jam sprite is treated like precious cargo moving through a fast, legible route: Load → Frame → Finish → Export. Stepped arches, route lines, ticket-like labels and exacting geometry echo 1930s transit graphics without imitating any historical brand. Decoration is restricted to the landing illustration and progress rail; the editor itself defers to the pixels.

The treatment is intentionally single-mode. A deep midnight platform reduces glare during late jam sessions; warm paper and brass controls create clear hierarchy and make transparency checkerboards unmistakable.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#101A22` | app background / midnight platform |
| `--ink-raised` | `#172630` | controls and work surfaces |
| `--paper` | `#FFF5D6` | primary text / poster stock |
| `--muted` | `#B9C7C0` | secondary text (≥ 4.5:1 on ink) |
| `--brass` | `#F4B942` | actions, route markers, focus |
| `--brass-dark` | `#A25C05` | dark accent against paper |
| `--coral` | `#EF6A5B` | errors and destructive cues |
| `--mint` | `#62D2A2` | success / ready state |
| `--line` | `#40535A` | dividers and inactive rails |

All text pairs are targeted at WCAG AA. Color is always paired with a word, icon, pattern, or state announcement.

## Type

- Display: `Copper`, a bundled subset font when available, falling back to Georgia and Times. Uppercase, spaced, compact—poster titles and route numerals only.
- Utility/body: system sans (`Inter`-like platform stack), 16px minimum, 1.5 leading. This keeps controls crisp and avoids a network font dependency.
- Measurements and atlas values use the system monospace stack with tabular numerals.

Scale: 14 (metadata only), 16, 20, 28, fluid 40–64px. Exactly one `h1`; editor sections use ordered `h2` headings.

## Spacing and shape

An 8px base rhythm: 4, 8, 12, 16, 24, 32, 48, 64. Controls are at least 44px. Panels use clipped ticket corners or 2px ruled edges; they do not float as generic rounded cards. Radius is 2–12px depending on physical metaphor. The desktop editor uses a 280px control rail plus flexible preview; at ≤760px it becomes a single route with the canvas first after source controls.

## Interaction grammar

- A four-stop route rail communicates current workflow state; completed stops gain a mint core and text.
- Primary actions are brass ticket buttons with a 2px lower edge and a small translate-on-press response.
- File drop is a station portal: drag-over illuminates the inner arch; keyboard activation opens the native picker.
- Frame navigation uses previous/next controls and arrow keys when the preview has focus.
- Every transform updates a terse live status and a non-destructive preview. Sources are never mutated.

## Motion

Motion is functional and short: panel reveal 220ms, button press 120ms, route progress 180ms. Preview frame playback follows actual GIF timing. No ambient looping decoration. Under `prefers-reduced-motion`, reveals and transforms are instant; animated preview defaults to paused and can still be advanced manually.

## Original asset plan and provenance

- `hero-depot.webp`: generated art-deco pixel-sprite transit depot illustration, used as the landing visual; optimized below 300KB. It clarifies the “asset dispatch” metaphor, not app capability.
- App marks and PWA icons: hand-authored geometric SVG/canvas-derived originals using the route arch and three sprite pixels.
- UI glyphs: text/inline SVG authored for this product; no icon library.

### Prompt sheet

**Use case:** stylized-concept. **Subject:** a tiny pixel-art courier carrying translucent sprite-frame cels through a miniature 1930s art-deco night train depot. **World/materials:** ink-blue enamel, cream paper, warm brass rails, coral signal lamps, mint glass tiles. **Composition:** landscape poster, strong stepped arch, subject on right half, generous quiet midnight space on left, crisp geometric silhouettes. **Light/lens:** flat screen-print lighting, slight paper grain, orthographic poster perspective. **Palette words:** midnight ink, warm ticket cream, signal brass, coral, mint. **Negative list:** no words, no letters, no logos, no watermark, no famous characters, no brand marks, no photorealism, no fake UI, no gradients, no excessive detail.

Generated with the factory Azure image model (`factory-image`) on 2026-08-27. Original for this product; no reference images or third-party assets used. The footer discloses AI-generated decorative artwork.
