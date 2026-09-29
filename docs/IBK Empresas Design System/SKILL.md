---
name: ibk-empresas-design
description: Use this skill to generate well-branded interfaces and assets for Interbank Empresas (IBK Empresas / Banca por Internet Empresas), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick index

- `README.md` — brand overview, content fundamentals, visual foundations, iconography
- `colors_and_type.css` — color & type tokens as CSS custom properties (`--ibk-green`, `--fg-1`, etc.), semantic variables, base element styles, `@font-face` declarations for Geometria
- `fonts/Geometria-*.ttf` — primary display typeface, full weight range
- `assets/logo-interbank-color.svg` — wordmark
- `assets/icons/*.svg` — in-house icon set (Spanish names: `descarga`, `foco`, `edificios`, `billetes`, etc.)
- `preview/*.html` — design-system specimen cards (colors, type, components)
- `ui_kits/ibk-empresas/` — clickable recreation of the Banca por Internet Empresas web product
  - `index.html` — prototype entry (login → pagos masivos → nuevo pago → confirmación)
  - `Shell.jsx` — Header, PrimaryNav, SideNav, Footer, Button, ActionTile, Stepper, StatusChip, Icon
  - `Screens.jsx` — LoginScreen, PagosMasivosScreen, NuevoPagoScreen, ConfirmacionScreen
  - `styles.css` — UI-kit scoped styles

## Non-negotiables

- **Language:** Peruvian Spanish, **tú** voice, sentence case. Never "usted". Currency `S/ 1.234,00`.
- **Colors:** brand green `#05BE50` for text/links/active, `#00A94F` for filled buttons & footer strip, `#0039A6` for section titles. Neutrals from `--fg-1…6`, page bg `#F4F5F7`.
- **Type:** Geometria for headings/nav/buttons (Medium default, `-0.5px` tracking on titles); Montserrat for body; Inter for numeric chips. Never Arial / Roboto / Inter as display.
- **Iconography:** Interbank's own SVG set only. **No emoji, no Unicode glyphs, no hand-drawn SVG.** If a needed icon is missing, use Lucide as a bridge and flag it.
- **Radii:** 4/5 cards, 12 tiles, 20 pills, 24 CTAs.
- **Shadow:** one soft card shadow `0 4px 10px rgba(0,0,0,.05)`. Never darker by default.
- **Footer signature:** thin 18px `#00A94F` strip at the very bottom. Do not omit.

## Known caveats to pass on

- **Omnes** (used for some button labels in source) is not shipped — Geometria Medium substitutes. Ask for Omnes if pixel fidelity matters.
- SVGs are served as `text/plain` by some sandboxes. Use CSS `background-image: url(...)` instead of `<img src>` for icons when targeting those environments.
