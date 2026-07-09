# Design

This file owns the **visual system**: tokens, color and status semantics,
typography, layout, components, motion, and accessibility specifics. The status
enums themselves (`normal` | `monitor` | `attention`, etc.) are defined in
`ARCHITECTURE.md`; this file defines how they look. Product voice and principles
live in `PRODUCT.md`.

Source of truth for tokens is `src/styles.css` (Tailwind v4 `@theme inline` +
CSS custom properties) and `src/components.css`. Update both together.

## Foundations

### Color system

Tailwind v4 with shadcn (`radix-nova`, `neutral` base, CSS variables on).
Colors are `oklch` in a light color-scheme. A `.dark` variant is wired
(`@custom-variant dark`) but the app ships light.

Core tokens (`:root`):

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `oklch(0.973 0.004 220)` | App background |
| `--foreground` | `oklch(0.2 0.02 240)` | Body text |
| `--card` / `--card-foreground` | `oklch(1 0 0)` / `oklch(0.2 0.02 240)` | Panels |
| `--popover` / `--popover-foreground` | `oklch(1 0 0)` / `oklch(0.2 0.02 240)` | Hotspot labels, menus |
| `--primary` | `oklch(0.48 0.09 186)` | Teal accent, primary actions |
| `--ring` | `oklch(0.62 0.08 186)` | Focus rings |
| `--border` | `oklch(0.9 0.01 225)` | Dividers, card edges |
| `--input` | `oklch(0.84 0.012 225)` | Input borders |
| `--destructive` | `oklch(0.55 0.2 30)` | Destructive actions |
| `--sidebar` | `oklch(0.19 0.03 235)` | Dark sidebar |
| `--sidebar-muted` | `oklch(0.72 0.026 230)` | Sidebar secondary text |
| `--sidebar-line` | `rgb(255 255 255 / 9%)` | Sidebar dividers |

`@theme inline` maps these to Tailwind color utilities (`bg-background`,
`text-foreground`, `border-border`, etc.). Prefer these utilities over raw
hex/oklch values in components.

### Health status semantics (authoritative visual mapping)

Status never relies on color alone. Each status has a color, a label
(`statusLabel` in `dashboard-model.ts`), and an icon/dot.

| Status | Token | Value | Meaning |
| --- | --- | --- | --- |
| `normal` | `--status-normal` | `#1c7259` | In range / healthy |
| `monitor` | `--status-monitor` | `#9a540f` | Slightly off, watch |
| `attention` | `--status-attention` | `#b64235` | Clearly abnormal, act |
| (empty) | `--status-empty` | `oklch(0.66 0.02 235)` | No data yet |

Lab flag (`low`/`high`/`normal`/`unknown`) renders as directional context on a
result row, not as a fourth status color. `--trend-line: #5f7186` for sparklines.

### Organ colors

Per-organ colors live in `organVisuals` (`dashboard-model.ts`) and are applied
via the `--organ-color` custom property on organ rows, icons, and anatomy
hotspots. Example: heart `#e05a47`, lungs `#53b7c0`, liver `#9a5b45`,
kidneys `#b46a78`. Reuse these; do not invent organ colors per component.

### Radius and shadow

- `--radius: 0.625rem`. Derived: `--radius-sm`, `--radius-md`, `--radius-lg`,
  `--radius-xl`. Use `--radius-xl` for the anatomy stage and hero, `--radius`
  for cards and tiles.
- `--shadow-floating` for popovers and elevated panels.

### Typography

- `--font-family-sans` (body) and `--font-family-heading` mapped through
  `@theme` to `--font-sans` / `--font-heading`.
- Headings use tighter tracking (`letter-spacing: -0.02em` on hero, `-0.01em`
  on organ card titles) and `text-wrap: balance`.
- Numeric lab values use the `.tnum` utility (`tabular-nums`) so columns align.

## Layout

### App shell

Sidebar + main grid (`app-shell`). Sidebar holds brand, grouped nav, and an
encrypted-records footer. Main holds a draggable title bar, page header with
title/description and actions, then the workspace.

- `body-workspace-grid`: `240px minmax(420px, 1fr) 336px` — organ rail,
  anatomy stage, detail rail.
- Overview hero sits above the grid: `minmax(0, 1fr) auto` with stat tiles.

### Responsive breakpoints

- `≤ 1180px`: detail rail wraps to full width; anatomy stage relaxes to a
  fixed `560px` min-height.
- `≤ 900px`: sidebar collapses to a 68px icon rail (labels, group labels,
  and shortcuts hidden); body workspace becomes single column.

Use these existing breakpoints. Do not add component-local media queries that
conflict with them.

### Anatomy stage

The body map is an image with absolutely-positioned hotspots. Hotspots are
18px circles using `--organ-color`, a white border, and a soft ring. They scale
to 1.25 on hover, focus-visible, and selected. Labels appear above the hotspot
(`label-below` flips them). Keep hotspots keyboard-focusable; they are
`<button>`s.

## Components

shadcn primitives in `src/components/ui/` (Radix-backed): `alert`, `badge`,
`button`, `card`, `checkbox`, `dialog`, `empty`, `field`, `input`, `label`,
`scroll-area`, `section`, `select`, `separator`, `skeleton`, `sonner`,
`table`, `tabs`, `textarea`. `components.json` configures the registry:
`radix-nova` style, `neutral` base, CSS variables on, `lucide` icons, aliases
`@/components`, `@/components/ui`, `@/lib/utils`.

Rules:

- Add new primitives through the shadcn config, not by hand-rolling equivalents.
- Compose with the `Section`/`Card` shells for consistent padding and headers.
- Use `EmptyMessage` for empty states and `Skeleton` for loading states; never
  show a blank panel.
- Toasts go through `sonner` (`toast.success`/`error`/`warning`), with copy
  from the i18n catalog.

## Motion

Easing tokens (`:root`): `--ease-out-quart`, `--ease-out-quint`, `--ease-out-expo`.
Duration tokens (`--dur-feedback`, `--dur-state`) drive hotspot and label
transitions. Keep motion short and purposeful — feedback for selection and
state changes, not decoration. Respect `prefers-reduced-motion`.

## Accessibility

- Visible focus: `focus-visible:ring` using `--ring`. Hotspots and nav buttons
  show a ring on keyboard focus.
- Status is not color-only: label + icon/dot accompany every status color.
- Targets are at least 18px on hotspots; nav buttons have comfortable padding.
- The active nav item sets `aria-current="page"`; nav has `aria-label`.
- Drag regions (`data-tauri-drag-region`) are marked `aria-hidden` so they do
  not capture screen-reader focus.
- Contrast meets the calm-clinical baseline; avoid low-contrast muted text for
  values the user must read.

## Internationalization

All user-facing strings go through `t(key, values)` from `src/i18n.ts`. The
catalog is `src/i18n/locales/en.json` and is typed via `TranslationKey`. Hard
UI strings fail the `check:i18n` gate with zero allowed violations. When adding
a string, add the key to the catalog and the baseline if the check requires it.
