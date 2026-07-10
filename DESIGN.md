# Design

This file owns the **visual system**: tokens, color and status semantics,
typography, layout, components, motion, and accessibility specifics. The status
enums themselves (`normal` | `monitor` | `attention`, etc.) are defined in
`ARCHITECTURE.md`; this file defines how they look. Product voice and principles
live in `PRODUCT.md`.

Source of truth for tokens is `src/styles.css` (Tailwind v4 `@theme inline` +
CSS custom properties). Shell and body-workbench layout lives in
`src/layout.css`; shared route-surface refinements live in `src/redesign.css`;
component and chart details live in `src/components.css`. Update the relevant
file and this document together.

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
| `--input` | `oklch(0.66 0.012 225)` | Input borders; at least 3:1 against cards |
| `--destructive` | `oklch(0.55 0.2 30)` | Destructive actions |
| `--sidebar` | `oklch(0.19 0.03 235)` | Dark sidebar |
| `--sidebar-muted` | `oklch(0.72 0.026 230)` | Sidebar secondary text |
| `--sidebar-line` | `rgb(255 255 255 / 9%)` | Sidebar dividers |

`@theme inline` maps these to Tailwind color utilities (`bg-background`,
`text-foreground`, `border-border`, etc.). Prefer these utilities over raw
hex/oklch values in components.

### Health status semantics (authoritative visual mapping)

Status never relies on color alone. Record statuses use `statusLabel` in
`dashboard-model.ts`; the UI-only empty state uses `status.noData`. Each state
has a color, a label, and an icon/dot.

| Status | Token | Value | Meaning |
| --- | --- | --- | --- |
| `normal` | `--status-normal` | `#1c7259` | Routine / no current follow-up |
| `monitor` | `--status-monitor` | `#9a540f` | Monitor over time |
| `attention` | `--status-attention` | `#b64235` | Discuss soon |
| (empty) | `--status-empty` | `oklch(0.48 0.02 235)` | No data yet |

Lab flag (`low`/`high`/`normal`/`unknown`) renders as neutral directional context
on result rows, trends, and detail views, not as a fourth status color. Follow-up
priority stays visually separate. `--trend-line: #5f7186` for sparklines.

### Organ colors

Per-organ colors live in `organVisuals` (`dashboard-model.ts`) and are applied
via the `--organ-color` custom property on organ rows, icons, and anatomy
hotspots. Example: heart `#e05a47`, lungs `#53b7c0`, liver `#9a5b45`,
kidneys `#b46a78`. Reuse these; do not invent organ colors per component.

### Radius and shadow

- `--radius: 0.625rem`. Derived: `--radius-sm`, `--radius-md`, `--radius-lg`,
  `--radius-xl`. Use `--radius-xl` for the connected body workbench and
  `--radius` for cards and controls.
- `--shadow-floating` for popovers and elevated panels.

### Typography

- `--font-family-sans` (body) and `--font-family-heading` mapped through
  `@theme` to `--font-sans` / `--font-heading`.
- Headings use restrained tracking (`-0.01em` to `-0.02em`) and a compact,
  fixed product-UI scale.
- Numeric lab values use the `.tnum` utility (`tabular-nums`) so columns align.

## Layout

### App shell

Sidebar + main grid (`app-shell`). The 200px sidebar holds brand, grouped nav,
and an encrypted-records footer. Main is a three-row native shell: draggable
page bar, scrollable workspace, then the persistent text-only AI dock. The dock
participates in layout and must never cover records.

- `body-workbench`: `204px minmax(320px, 1fr) 316px` - organ rail, stable
  anatomy plane, selected-organ inspector.
- A compact status strip sits above the workbench. It replaces the previous
  hero and stat tiles.
- The inspector is one continuous pane with dividers. Selected-organ content
  must not become a stack of separate floating cards.
- The global daily-log history sits below the workbench; it must not appear
  inside the selected-organ inspector.
- Body attention, organ, daily-log, and inspector panels can collapse. The
  organ and inspector panels retain a narrow reopen rail so the anatomy stage
  gains space without losing the control needed to restore the panel.

### Responsive breakpoints

- `≤ 1180px`: organs become a horizontal source strip above the map while the
  anatomy plane and inspector remain adjacent.
- `≤ 900px`: sidebar collapses to a 64px icon rail (labels, group labels, and
  shortcuts hidden). The map and inspector still remain adjacent at the native
  820px minimum width.
- `≤ 760px`: the workbench may stack for unsupported smaller render targets.

The native window minimum is `820px`, so both responsive states are reachable
through normal window resizing.

Use these existing breakpoints. Do not add component-local media queries that
conflict with them.

### Anatomy stage

The body map uses a centered 3:4 portrait coordinate plane cut from the 3:2
source image. Hotspot X coordinates are remapped into that fixed crop, so the
image and controls share the same geometry at every supported window size.
Hotspots have a 40px keyboard and pointer target with an 18px visible dot using
`--organ-color`, a white border, and a soft ring. Labels appear above the
hotspot (`label-below` flips them). Keep hotspots keyboard-focusable; they are
`<button>`s.

## Components

shadcn primitives in `src/components/ui/` (Radix-backed): `alert`, `badge`,
`button`, `card`, `checkbox`, `dialog`, `empty`, `field`, `input`, `label`,
`scroll-area`, `section`, `select`, `separator`, `skeleton`, `sonner`,
`table`, `tabs`, `textarea`, `calendar`, `popover`, `progress`, `tooltip`.
The app-level `date-picker` wrapper composes Calendar + Popover for ISO dates.
`components.json` configures the registry:
`radix-nova` style, `neutral` base, CSS variables on, `lucide` icons, aliases
`@/components`, `@/components/ui`, `@/lib/utils`.

Rules:

- Add new primitives through the shadcn config, not by hand-rolling equivalents.
- Compose with the `Section`/`Card` shells for consistent padding and headers.
- Use `EmptyMessage` for empty states and `Skeleton` for loading states; never
  show a blank panel.
- Toasts go through `sonner` (`toast.success`/`error`/`warning`), with copy
  from the i18n catalog.
- Dates use the shared `DatePicker` wrapper everywhere a health record accepts
  an ISO date. It opens the shadcn `Calendar` in a `Popover` and submits the
  existing ISO string through a hidden form field.
- Background work uses `JobCenter` in the app bar. Rows pair a text status,
  icon, and `Progress`; indeterminate progress is used when the native task
  cannot provide an exact percentage.
- The Developer page is a compact diagnostic workspace: expandable LLM-call
  rows show request metadata and timing, while a chronological event list shows
  renderer stages and bounded errors. It is operational UI, not a second chat
  surface; prompt contents and health payloads stay out of the visible log.

Charts live in `src/components/charts/` and use compact inline SVG, not a chart
library. Use neutral trend lines, muted grid lines, and status color only for
the current state or high-severity bars. Reference ranges should be visible as a
soft band or normalized strip. Every chart needs a text summary, empty state,
and accessible title/label.

Document review rows identify themselves as `RESULT {n}`. Their outer border and
follow-up badge use the existing status mapping, while an unset priority remains
visibly labeled as `Needs review`.

## Motion

Easing tokens (`:root`): `--ease-out-quart`, `--ease-out-quint`, `--ease-out-expo`.
Duration tokens (`--dur-feedback`, `--dur-state`) drive hotspot and label
transitions. Keep motion short and limited to state feedback. Do not animate
page entry or pulse health indicators continuously. Respect
`prefers-reduced-motion`.

## Accessibility

- Visible focus: `focus-visible:ring` using `--ring`. Hotspots and nav buttons
  show a ring on keyboard focus.
- Status is not color-only: label + icon/dot accompany every status color.
- Hotspot targets are 40px; nav buttons have comfortable padding.
- Selected organ controls expose `aria-pressed`. A concise hidden live region
  announces only the new organ and status rather than the full inspector tree.
- The active nav item sets `aria-current="page"`; nav has `aria-label`.
- Route changes reset workspace scroll and focus the new page heading.
- Drag regions (`data-tauri-drag-region`) are marked `aria-hidden` so they do
  not capture screen-reader focus.
- Date picker triggers expose their label, expanded state, and required state;
  the calendar keeps keyboard navigation through React Day Picker.
- Job rows expose running/completed/failed labels in addition to color and
  preserve task error text when available.
- Contrast meets the calm-clinical baseline; avoid low-contrast muted text for
  values the user must read.

## Internationalization

All user-facing strings go through `t(key, values)` from `src/i18n.ts`. The
catalog is `src/i18n/locales/en.json` and is typed via `TranslationKey`. Hard
UI strings fail the `check:i18n` gate with zero allowed violations. When adding
a string, add the key to the catalog and the baseline if the check requires it.
