# Design

This file owns the visual and interaction system for Me Health Dashboard.

## Product scene

One person reviews private health records on a Mac before an appointment or
after receiving a result. They need to understand what changed, where it
belongs in the body, and what they may want to discuss with a clinician. The
interface should recede behind that review.

## Product model

The app has four workspaces rather than a page for every data type.

1. **Overview** uses the body as navigation. Selecting an organ changes the
   health record at the right without leaving the scene.
2. **Timeline** combines results, symptoms, conditions, regimen changes, and
   legacy body notes into one chronological record. Daily Log is its own
   focused page within this workspace.
3. **Library** keeps source material and guided tools together: health files,
   regimen, fasting, breathing, and research.
4. **Assistant** is a conversation workspace. AI is also available from the
   persistent capture surface where it is useful.

Settings and developer diagnostics are utilities. They do not compete with the
health-review workspaces.

## Interaction principles

- Start from the body or the timeline, not from a dashboard of summary cards.
- Keep the selected organ visible while its latest signals are read.
- Preserve chronology. Dates are the main organizing structure for medical
  history.
- Put capture near review. Add Result exposes both individual and file intake;
  Log symptom and Daily Log stay one action away without covering the record.
- Use progressive disclosure for editing, conditions, and destructive file
  actions.
- Keep AI advisory and visibly separate from saved medical facts.

## Navigation

A 248 px text-labelled sidebar contains Overview, Timeline, Library, and
Assistant. It follows the quiet, native density of a code workspace while
retaining the health app's own terminology.

- Each destination has an icon and a visible label. The current workspace uses
  a shallow neutral row fill, never an edge marker or high-chroma container.
- Settings, diagnostics, and encrypted-local status stay at the bottom.
- Sidebar and main canvas are differentiated by adjacent neutral surfaces, not
  a structural border.
- Command-1 through Command-4 map to the four workspaces.

## Layout

### Overview

Overview follows a desktop three-pane reading model:

- body-system index;
- organ anatomy stage;
- selected-organ record.

The anatomy image owns the available height. The organ index is independently
scrollable. The selected-organ record uses normal document flow and hairline
separators rather than nested cards.

### Timeline

Timeline is a centered reading column. A single vertical rule connects events.
Date labels occupy a stable left column and never repeat for adjacent events on
the same day. Status appears at the far edge so titles and values scan cleanly.

Results and Symptoms may enter a management mode for sorting, charts, editing,
and deletion. Daily Log uses its own reverse-chronological reading page for
entry, editing, and deletion. Returning to the timeline restores chronological
context.

### Library

Library uses a stable 228 px index and one detail canvas. It does not add page
navigation to the global rail.

- Documents uses one two-source intake strip for result documents and Apple
  Health exports, with a visible file chooser on each source, followed by a
  saved-file archive.
- Regimen uses one split composition: editor on the left, history and active
  items on the right.
- Settings uses a narrow, single-column preference sheet. Each section keeps
  its title directly above its fields so controls never clip into a second pane.

## Visual system

### Color

All colors are OKLCH tokens in `src/styles/foundations.css`.

- Canvas and chrome are dark, chroma-neutral surfaces with a slight violet
  bias. Content planes are one restrained step lighter than the canvas.
- Berry is reserved for primary actions, selected AI controls, and compact
  identity marks. The renderer and shadcn primitives use the same berry token.
- Normal is green, Monitor is amber, and Attention is vermilion.
- Every health status includes text and position in addition to color.
- The dark sidebar stays neutral and functional. It never competes with health status colors or primary actions.

### Typography

- Use the native Apple system stack, led by SF Pro on macOS.
- One family serves labels, prose, controls, and data.
- Product headings use fixed sizes from 15 to 27 px.
- Core body copy is 12 to 14 px; 11 px is reserved for compact secondary
  metadata. Every text token meets WCAG AA contrast on its intended surface.
- Numeric health values use tabular figures where alignment matters.

### Shape

- Squircle geometry uses `corner-shape: superellipse(1.6)` when available.
- General surfaces use 9 to 14 px fallback radii.
- Pills are reserved for statuses, counts, and compact segmented controls.
- The anatomy stage, timeline, and preference sheets are structural planes,
  not giant rounded cards.

### Materials and elevation

- Opaque content surfaces carry health data.
- The top bar blends into the canvas without a separator. The sidebar is
  defined by its neighboring surface, not a line.
- The persistent AI composer is a compact inset surface with no outline and a
  two-pixel-or-less shadow.
- Selected list rows use a shallow three-pixel shadow at most.
- Cards never combine a decorative outline with a wide diffuse shadow.

### Motion

- Feedback and state transitions run from 120 to 200 ms with ease-out curves.
- Anatomy rotation communicates the selected body view.
- Modal capture settles vertically over 180 ms.
- The breathing orb expands and contracts for the complete inhale or exhale
  duration; pause preserves both the timer and visual phase position.
- No orchestrated page-load animation is used.
- `prefers-reduced-motion` reduces transitions to immediate changes.

## Components

### Body index

Each row includes status dot, organ name, and system. Selection updates the
anatomy hotspot and right-side record together.

### Anatomy stage

- Internal and Surface are a two-option segmented control.
- Organ hotspots expand only for the current selection.
- Surface mode supports front, right, back, and left controls plus horizontal
  drag.
- Exact-area body notes are created only in Surface mode and remain anchored to
  their saved view.

### Organ record

The record starts with system, name, follow-up status, plain-language context,
and counts. Result and symptom capture follow. Recent signals, conditions, and
daily context are separated by hairlines.

### Capture

Result, symptom, daily-log, body-note, and document-review capture use the same
modal vocabulary. Save buttons name the record being saved. Required fields
have visible focus and validation states. The persistent AI composer centers at
the bottom of non-AI workspaces, with a writing area above its provider and
send controls. Body-note editing remains available for legacy entries in
Timeline; there is no surface capture mode.

### Empty and loading states

- Loading uses skeleton shapes that match the destination.
- Empty timeline copy explains which record types will appear.
- Empty health states never invent normal results or reassuring medical facts.
- AI-disabled states link to Settings and never generate substitute analysis.

## Accessibility and responsive behavior

- Minimum supported window size is 820 by 680.
- At the minimum width, the organ index becomes denser but remains visible; the
  anatomy and selected-organ record do not reorder or disappear.
- Tables and matrices scroll inside their own surface.
- Every icon-only control has an accessible label and tooltip.
- Focus uses a visible blue halo.
- Reduced motion is supported.
- Health status never relies on color alone.

## Verification checklist

- Run `bun run typecheck`, `bun run test`, and `bun run check`.
- Run `bun run tauri:dev` in the native desktop runtime.
- Verify Overview, Timeline, all Library sections, Assistant, Settings, and
  diagnostics with real empty states.
- Verify organ selection, Daily Log, capture dialogs, record management,
  timers, document review, AI enabled and disabled states, keyboard focus,
  reduced motion, and the 820 by 680 minimum window.
- Build the production `.app` and `.dmg` with `bun run tauri:build`.
