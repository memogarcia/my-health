# Design

This is the visual source of truth for Me Health Dashboard. It has been reset
for a new UI/UX direction. No current layout, palette, typography system,
component style, motion language, or visual asset is approved by this file.

The previous interface is documented in `FEATURES.md` so the next interface
can recover the product behavior without inheriting the old visual structure.
The renderer is intentionally blank while this design is rebuilt.

## Design status

- **Status:** reset, ready for exploration.
- **Audience:** one person reviewing sensitive health information on a local
  desktop machine.
- **Product register:** private desktop tool, not a marketing surface.
- **Primary source for behavior:** `FEATURES.md`.
- **Product intent and safety:** `PRODUCT.md`.
- **Technical/runtime constraints:** `ARCHITECTURE.md`.
- **Privacy and security constraints:** `SECURITY.md` and `AI.md`.

## Non-negotiables

These are product constraints, not visual decisions:

- The supported runtime is the native Tauri app. A raw browser/Vite URL is not
  a supported product surface.
- Health records remain in the local SQLCipher-encrypted SQLite database unless
  the user explicitly opts into the relevant remote AI context.
- AI output is advisory. The interface must not present it as diagnosis,
  treatment, or emergency triage.
- Health status must communicate meaning with text and accessible semantics,
  never color alone.
- Health data must be readable, reviewable, and editable. Dense information is
  allowed when it improves scanning and record review.
- Every user-facing string must use the typed i18n catalog.
- Existing shadcn primitives, controller methods, Rust commands, and persisted
  data contracts should be reused unless the redesign requires a deliberate
  change.

## Reset boundary

The redesign starts at the rendered application surface. The native runtime
bootstrap, Rust backend, storage schema, command layer, feature helpers, tests,
and feature inventory remain available. The previous React page components and
CSS have been deleted; they are not design authority or a recovery mechanism.

When a new surface is implemented:

1. Define its user goal and information hierarchy here.
2. Define the visual and interaction rules here before spreading them into
   components.
3. Implement from the rules using existing product contracts.
4. Verify the exact native Tauri screen and update this file with decisions that
   proved durable.

## Open design work

The following decisions are intentionally unanswered:

### Product scene

- Where is the app used: desk, bedside, clinical review, or another setting?
- Is the dominant mode quick daily check-in, longitudinal review, data entry,
  or a deliberate combination?
- Which action should be reachable first after unlock?

### Information architecture

- What is the smallest useful top-level navigation model for the feature set in
  `FEATURES.md`?
- Which features belong in the primary workspace, and which belong in a
  secondary utility area?
- What is the relationship between body-system context and global history?
- How should ongoing AI work, document review, and errors stay visible without
  competing with health records?

### Visual language

- Choose a physical scene and ambient-light assumption.
- Choose a color strategy and define semantic status roles.
- Choose one product typeface system and a fixed UI scale.
- Define surface, border, radius, shadow, icon, and density rules.
- Decide whether the anatomy representation is a primary control, a secondary
  visualization, or a replaceable view.

### Interaction and layout

- Define the first-run and unlock experience.
- Define the empty, loading, error, offline, consent, and review states for
  every feature group.
- Define desktop window behavior and the minimum supported size.
- Define keyboard navigation, focus movement, drag/drop behavior, and dialogs.
- Define how users select and edit one record versus a group of records.

### Motion and accessibility

- Motion may communicate state or progress, but must not delay work.
- Every animated state needs a reduced-motion behavior.
- Define focus, contrast, target-size, screen-reader, and non-color status rules
  before finalizing the component system.

## Future system template

Fill these sections as the new UI is designed. Until they contain a deliberate
decision, implementation should not infer one from the old renderer.

### Foundations

- Color tokens:
- Semantic status mapping:
- Typography:
- Spacing and density:
- Radius and borders:
- Elevation:
- Iconography:

### Shell

- Window and title-bar behavior:
- Primary navigation:
- Secondary navigation:
- Global actions:
- Persistent status and job feedback:

### Feature surfaces

- Body and organ workspace:
- Labs and results:
- Symptoms and conditions:
- Medications and supplements:
- Daily context:
- Fasting and breathing:
- Documents and imports:
- Assistant and research:
- Settings and data export:
- Developer diagnostics:

### Components

For each shared component, record its purpose and default, hover, focus,
active, disabled, loading, error, empty, and responsive states.

### Verification checklist

- The native Tauri app renders the intended screen after unlock.
- No raw browser session is used as product verification.
- Keyboard and assistive-technology paths are usable.
- Status meaning survives grayscale and color-vision differences.
- Long labels, dates, units, empty data, and errors fit without clipping.
- Reduced motion is honored.
- `FEATURES.md` still matches the behavior exposed by the new UI.
