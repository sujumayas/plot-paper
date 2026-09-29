# IBK Empresas · UI Kit

High-fidelity recreation of the **Banca por Internet Empresas** (IBK Empresas) web product, based on the Figma source (`BIE.fig` → `Pagos-masivos/DesktopPagosMasivosIndexHomologado*`, `login/`, etc.).

## Screens in this kit

1. **Login** — `LoginScreen.jsx` — RUC + usuario + contraseña
2. **Dashboard / Pagos masivos (index)** — `PagosMasivosScreen.jsx` — sidenav + action tiles + empty state
3. **Nuevo pago masivo** — `NuevoPagoScreen.jsx` — datos de cargo, carga de archivo, resumen
4. **Confirmación** — `ConfirmacionScreen.jsx` — resumen + token digital + success state

Run `index.html` — clickable prototype that walks through the happy path.

## Components (reusable)

- `Header.jsx` — top bar (logo, search, FX promo chip, user)
- `PrimaryNav.jsx` — Inicio / Consultas / Pagos y Transferencias / Solicitudes / Autorizaciones
- `SideNav.jsx` — scoped submenu for the current section
- `Footer.jsx` — support links + WhatsApp + the 18px brand-green strip
- `ActionTile.jsx` — the icon + label tile used on the "¿Qué tipo de pago…?" grid
- `Button.jsx` — primary / outline / disabled
- `StatusChip.jsx` — completado / en proceso / rechazado / borrador
- `EmptyStateCard.jsx` — illustration + copy + CTA
- `Stepper.jsx` — horizontal numbered steps

## Notes

- Every hex, radius, shadow and spacing is lifted from the CSS tokens in `../../colors_and_type.css`.
- Copy comes from the Figma source (Peruvian Spanish, tú-voice, sentence case).
- Icons are the project's `assets/icons/*.svg` — no emoji, no hand-drawn SVG.
- Where Figma disagrees with this document, **trust Figma**: this is a recreation, not a fork.
