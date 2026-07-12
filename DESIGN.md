# Design

This file owns the visual and interaction system for Me Health Dashboard.

## Product scene

One person reviews private health records on a Mac before an appointment or
after receiving a result. They need to understand what changed, where it
belongs in the body, and what they may want to discuss with a clinician. The
interface should recede behind that review.

## Product model

The app uses one body-centered shell with direct, task-named destinations.

1. **Overview** uses the body as navigation. Selecting an organ changes the
   health record at the right without leaving the scene.
2. **Timeline** combines results, symptoms, conditions, regimen changes, meals,
   daily logs, and legacy body notes into one chronological record.
3. **Documents** imports result files and Apple Health export summaries, then
   keeps the saved source archive available for review.
4. **Routines** contains Diet, Medications, Fasting, Breathing, and Challenges as direct
   destinations. Each page performs one task and writes only its own local data.
5. **Intelligence** contains Chat and Deep Research. Chat answers questions;
   Deep Research creates a structured report from a focused question and the
   complete approved record context.

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

A 248 px text-labelled sidebar groups direct destinations under Health record,
Routines, and Intelligence. It follows the quiet, native density of a code
workspace while retaining the health app's own terminology.

- Each destination has an icon and a visible label. The current workspace uses
  a shallow neutral row fill, never an edge marker or high-chroma container.
- Settings, diagnostics, and the current storage status stay at the bottom.
- The sidebar, top bar, and page canvas use one neutral background so the shell
  stays continuous. Selected rows and semantic panels provide grouping without
  introducing a second page background.
- Command-1 through Command-4 map to Overview, Timeline, Documents, and Chat.
- Settings exposes the same shortcuts as editable, persisted preferences with
  the Command/Control modifier kept portable across operating systems.

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

### Shared page shell

Every routed page renders inside the standard page shell. The shell owns the
scroll boundary, responsive horizontal gutter, maximum reading width, and
canvas background. A page may opt into a full-bleed content layout for a
workspace such as Chat or Timeline, but it keeps the same shell plane and
height contract.

### Task pages

- Documents uses one two-source intake strip for result documents and Apple
  Health exports, followed by a saved-file archive.
- Challenges uses a compact definition form beside a local routine list, with
  completion as an explicit state rather than a health status.
- Diet and Regimen use one split composition: editor on the left, local history
  on the right.
- Fasting keeps the active timer and stage guidance in one view. Breathing keeps
  technique selection, the paced orb, safety state, and controls in one view.
- Deep Research keeps the report canvas, visible context coverage, depth choice,
  and shared AI composer together. Its result remains part of conversation history.
- Settings uses a narrow preference sheet. Each section keeps its title directly
  above its fields so controls never clip into a second pane.

## Visual system

### Color

All colors are OKLCH tokens in `src/styles/foundations.css`.

- The app rail, top bar, and routed page canvas share the same theme-aware,
  chroma-neutral canvas token with a slight violet bias. Surface tokens are
  reserved for semantic panels, cards, and controls rather than alternate page
  backgrounds.
- Berry is reserved for primary actions, selected AI controls, and compact
  identity marks. The renderer and shadcn primitives use the same berry token.
- Normal is green, Monitor is amber, and Attention is vermilion.
- Every health status includes text and position in addition to color.
- The sidebar stays neutral and functional in both themes. It never competes
  with health status colors or primary actions.

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
- The top bar and sidebar blend into the same canvas without a separator.
  Selected rows and semantic panels provide the visual grouping.
- The persistent AI composer is a compact inset surface with a hairline focus
  ring and a two-pixel-or-less shadow.
- Selected list rows use a shallow three-pixel shadow at most.
- Cards never combine a decorative outline with a wide diffuse shadow.

### Motion

- Feedback and state transitions run from 120 to 200 ms with ease-out curves.
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

- The selected male or female anatomy asset and its hotspot map share one
  intrinsic 3:2 coordinate plane, so responsive cropping cannot move a dot away
  from its organ.
- Localized organ hotspots use health-status color, matching the body index, and
  expand only for the current selection.
- Blood, bones, skin, and reproductive health are whole-body systems. They stay
  selectable in the index but do not claim one misleading point on the image.
- The anatomy grade changes with the app theme so the bright source illustration
  does not overpower a dark canvas.

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
- Verify Overview, Timeline, Documents, Diet, Medications, Fasting, Breathing,
  Challenges, Chat, Deep Research, Settings, and diagnostics with real empty states.
- Verify organ selection, Daily Log, capture dialogs, record management,
  timers, document review, AI enabled and disabled states, keyboard focus,
  reduced motion, and the 820 by 680 minimum window.
- Build the production `.app` and `.dmg` with `bun run tauri:build`.
