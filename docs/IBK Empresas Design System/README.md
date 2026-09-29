# IBK Empresas Design System

Interbank Perú's digital banking experience for business customers ("Banca por Internet Empresas"/IBK Empresas). This is the brand & component system used across their web product — login, payments, transfers, mass-payments (pagos masivos), international transfers, and related flows.

Interbank is Peru's second-largest bank; its visual identity is instantly recognizable by a **vivid green** (`#05BE50`), clean white surfaces, and the Interbank wordmark.

## Sources

- **Figma:** `BIE.fig` — mounted as a read-only VFS under `/Page-1/` with 4 top-level frames:
  - `login` — password-recovery flow, biometría onboarding
  - `Pagos-masivos` — massive payments (the largest frame; ~44 desktop screens of the flow)
  - `TX-al-exterior` — international transfers
  - `Recuperar-contrase-a` — password recovery
- **Uploaded logo spec board:** `uploads/Interbank.svg` (Figma export of a brand sheet, 1440×2222)
- **Fonts:** `uploads/Geometria_Principal.zip` *(not extractable in this environment — see Fonts below)*

The design language is shared with the broader Interbank retail product (`interbank.pe`) and the IBK consumer app.

---

## Index

- `README.md` — this document
- `SKILL.md` — agent-skill manifest so this system is portable to Claude Code / other skill hosts
- `colors_and_type.css` — color + type tokens as CSS custom properties, semantic vars, base element styles
- `fonts/` — webfont files (+ fallback notes)
- `assets/` — logos (`logo-interbank-color.svg`) and `assets/icons/*.svg` (Interbank's in-house icon set)
- `preview/` — design-system cards (registered as assets — visible in the Design System tab)
- `ui_kits/ibk-empresas/` — UI kit with core screens: login, Pagos Masivos index, nuevo pago flow, confirmación
- `screenshots/` — diagnostic screenshots from development

---

## CONTENT FUNDAMENTALS

**Language: Peruvian Spanish.** All copy is in Spanish (Perú flavor: "soles" `S/`, "DNI", "planilla", "CTS"). English is reserved for trade-names like "WhatsApp".

**Tone:** direct, warm, institutional. Not playful, not stiff. Short verbs, sentence case, imperative for CTAs.

**Pronoun:** second-person **tú** (informal) — *"Paga planillas, CTS, a tus proveedores..."*, *"Déjanos tu sugerencia"*, *"Usa tu TC especial"*. Never "usted". This is a deliberate brand choice — Interbank speaks to business users as a peer, not a servant.

**Casing:**
- Page titles & H1s: sentence case — "Pagos masivos", "Nuevo pago masivo", "Pago a proveedores"
- Buttons: also sentence case — "Continuar", "Guardar", "Cancelar", "Ok"
- Nav: sentence case — "Inicio", "Consultas", "Pagos y Transferencias", "Solicitudes", "Autorizaciones"
- ALL CAPS is extremely rare; reserved for small label affordances (e.g. "EJEMPLO:") inside helper boxes

**Punctuation:** Spanish opening marks are used — *"¡Afíliate a pagos masivos!"*, *"¿Qué tipo de pago quieres realizar?"*. Commas are Peruvian (decimal `,` for soles: "S/ 3.270" uses `.` for thousands in some layouts).

**Voice examples from the Figma file:**
- Hero: *"Pagos masivos"* / *"Paga planillas, CTS, a tus proveedores y realiza otros pagos masivos."*
- Promo chip: *"Usa tu TC especial — Compra S/ 3.270 · Venta S/ 3.270"*
- Greeting: *"Hola, María Fernanda"*
- Empty state CTA: *"¡Afíliate a pagos masivos!"* / *"Solicita la afiliación 100% digital para usar pagos masivos en tu empresa"*
- Footer trust: *"© 2022. Todos los derechos reservados."*
- Support: *"Whatsapp — 999 999 999"* / *"Torre Interbank - Carlos Villarán 140, La Victoria"*

**Emoji:** Never. The Figma source contains zero emoji. Decorative accent is handled by the icon set and a small library of spot illustrations (Alert, Avión, Cactus, Persona Gracias, Nueva Carta).

**Numbers:** currency always prefixed — `S/ 3.270,00`. Phone numbers are space-separated triads (`999 999 999`).

**Microcopy patterns:**
- Helper text starts with the affordance: *"Déjanos tu sugerencia"*
- Explanatory boxes lead with `EJEMPLO:` then the example
- Errors/alerts use a short title + one explanatory sentence — never a paragraph

---

## VISUAL FOUNDATIONS

**Palette.** Interbank's signature is a single saturated green; everything else is quiet.

- **Brand green** `#05BE50` (primary) — text links, active states, confirmation chips. 939× usage.
- **Secondary green** `#00A94F` — button fills, footer strip. 71× usage. Slightly darker, used when the element is a surface rather than text.
- **Interbank blue** `#0039A6` — section titles inside payment flows ("Nuevo pago masivo"), illustrations. 639× usage.
- **Deep blue accent** `#2F4A9F` — used for "Déjanos tu sugerencia"-style inline links inside the dashboard.
- **Ink** `#0F191E` — near-black body text. 1499× usage.
- **Dark gray** `#333333` — most running copy. 819× usage.
- **Mid gray** `#878C8F` — muted metadata text. 216× usage.
- **Neutral gray** `#B7BABC` — disabled text & icons. 246×.
- **Line gray** `#D9DADB` — default borders. 330×.
- **Surface gray** `#F4F5F7` — page background on logged-in screens. 123×.
- **Card gray** `#FBFBFB` — disabled tile backgrounds. 380×.
- **Semantic red** `#EB0046` — destructive / error. 105×.
- **Semantic amber** `#FFB406` — warning / in-progress. 44×.
- **Semantic mint** `#CDF2DC` — success background (promo chips, completed pills). 87×.

**Type.**
- **Geometria** — primary typeface. Geometric humanist sans. Used for **headings, buttons, navigation, numeric readouts.** Weights in use: Light 28px (display), Regular, Medium (default), Bold. Titles use `letter-spacing: -0.5px`.
- **Montserrat** — secondary / body. Used for **descriptive copy, form labels, supporting text, promotional chips.** Weights: Regular, Medium, SemiBold, Bold.
- **Omnes** — button labels and small display accents (Semibold 18/24px headline, Medium for buttons). Used selectively.
- **Inter** — numeric readouts inside small chips (FX rates, amounts under chips). Rare.
- **Default text sizes observed:** 11, 12 (metadata), 14 (body), 16 (body emphasis, buttons), 18, 20 (subtitles), 24 (section titles), 28 (display), 32 (hero).
- **Line-height rule of thumb:** `1.0–1.2×` for Geometria titles, `1.5×` for Montserrat body.

**Backgrounds.** No hand-drawn textures, no grain, no repeating patterns. Surfaces are **flat white** (`#FFFFFF`) over a **cool neutral page** (`#F4F5F7`). Section hierarchy is created by cards with soft shadow, not by colored bands. Full-bleed imagery is only used on the login / marketing screens (photographic office scenes, warm color grade, human-centric).

**Cards.**
- Radius: **5px** (cards), **12px** (tiles / action-choice affordances), **20px** (pills, promo chips), **24px** (buttons, CTA lockups).
- Shadow: `0 4px 10px rgba(0,0,0,0.05)` — extremely soft, barely there. A secondary deeper shadow `rgba(0,0,0,0.2)` exists for floating menus only.
- Border: `1px solid #ECEDED` (default) or `#D9DADB` (stronger). Cards combine shadow + no border; tiles use border + no shadow.

**Buttons.**
- Primary: green (`#00A94F`) pill, 48px tall, 24px radius, white Omnes Medium 16/100% label, soft green shadow `0 1px 4px rgba(0,134,63,0.2)`.
- Outline: white fill, green border, green label.
- Disabled: `#F4F5F7` fill, `#B7BABC` text, no shadow.
- Small icon button: 32×32 circle, used in toolbars.

**Hover / press.** Interbank doesn't expose hover states in Figma (everything is "default"), but the live product uses a ~8% darken on fill and ~4% darken on text. Press = subtle scale 0.98 on action tiles; no bounce.

**Borders.** Hairlines are 1px, no heavier. A 1px 30%-opacity gray is used as a section rule (`rgba(190,190,190,0.3)`). Dashed borders appear only in Figma as dev-only annotations.

**Transparency / blur.** Essentially unused. Alerts sometimes have a translucent overlay (`rgba(0,0,0,0.2)` dim), but there is no `backdrop-filter` blur in this system.

**Inner shadows.** Not used.

**Corner rhythm.** Small controls use 4–5px radius; medium surfaces 12px; capsules/pills 20–24px; full pills for CTAs and badges. Never sharp-cornered at the surface level.

**Imagery vibe.** Photographic, warm-daylight, business-casual people, Peruvian context (faces and settings). Small illustrations (Cactus, Alert, Avión, Persona Gracias) are flat geometric, limited palette around brand green + neutral, no shadows. When an illustration appears in an empty state it sits inside a white card with a 12px radius.

**Iconography.** Single-weight solid icons drawn on a 24×24 or 32×32 grid. Color applied via `currentColor` / the parent's color style. More below in **ICONOGRAPHY**.

**Animation.** Figma shows no motion specs. Product behavior, inferred: `180–240ms` ease-out transitions for state changes, `cubic-bezier(.2,.8,.2,1)` for the common dropdown/sidenav reveal. Modal overlays fade-in ~150ms. No spring/bounce.

**Layout.**
- Desktop design grid: **1440px** canvas, `96px` horizontal gutter (`padding: 0 96px`), content column often centered in a 1250-wide safe zone.
- Global chrome: header `82px`, primary nav `45px`, footer `108px` (green derechos strip `18px`).
- Sidenav (logged-in): **248px** wide, left-aligned, white card with soft shadow.
- Main content: 12px gutter between sidenav and body; internal cards use 32px padding.
- Grid cards: 12 / 16 / 24 px gap scale.

**Fixed elements.** Header, primary nav, and footer are full-bleed white bars. The footer's thin green strip (`#00A94F`, 18px tall) at the very bottom is an unmistakable brand signature.

**Spacing scale (observed).** 4, 8, 10, 12, 14, 16, 20, 24, 28, 32, 48, 64, 80, 96. Use 4 as the atom.

---

## ICONOGRAPHY

Interbank ships its **own custom icon set** — there's no Lucide/Heroicons here. Icons in Figma are named by Spanish initial + concept: `Icono/D/Descarga`, `Icono/F/Foco`, `Icono/E/Edificios`, etc. They're drawn on a 24×24 grid (sometimes 32×32 for larger tile icons), single weight, solid-fill style (not stroke), and typically monochrome — color comes from the parent text-color style.

All icons are `<svg>` (never PNG, never emoji, never icon-font). Copied into `assets/icons/`:

- **Action:** `aumentar.svg` (+ plus), `archivo.svg`, `descarga.svg` (download), `upload.svg`, `lapiz.svg` (edit), `tacho.svg` (trash), `guardar.svg` (save), `equis.svg` (close), `otros.svg` (kebab).
- **Navigation:** `inicio.svg` (home), `foco.svg` (bullseye/focus), `ubicacion.svg` (pin), `whatsapp.svg`, `combos.svg` (Interbank promo brand mark).
- **Finance:** `billetes.svg` (banknotes = CTS/cash), `edificios.svg` (buildings = providers), `solicitud.svg` (request = payroll), `pagos.svg` (payments), `cuenta.svg` (account/avatar), `perfil.svg`.

**Emoji: never used.** Unicode glyphs as icons: never used.

**Substitution flags:** none required — the Interbank icons are copied in directly. If an icon is needed that doesn't exist in this set (common example: social logos beyond WhatsApp), use Lucide as a bridge and **flag it as a substitution**.

---

## Fonts

**Geometria** (ParaType) is shipped in `/fonts` with the full weight range — Thin/ExtraLight/Light/Regular/Medium/Bold/ExtraBold/Heavy + italics — and declared in `colors_and_type.css` via `@font-face`. Montserrat and Inter come from Google Fonts.

| Role | Family | Source |
|---|---|---|
| Display / headings / nav | **Geometria** | local `fonts/Geometria-*.ttf` |
| Body / descriptive | **Montserrat** | Google Fonts |
| Button labels | **Omnes** | **substituted with Geometria Medium** — Omnes was not uploaded. Flag & ask the user if you need the exact Omnes metrics. |
| Numeric chips | **Inter** | Google Fonts |

> **⚠ Still outstanding:** Omnes is used in the Figma for button labels and some display accents. It is not shipped in `/fonts`. Geometria Medium is close in proportion but not identical — if you need pixel fidelity, ask the user to upload Omnes.

