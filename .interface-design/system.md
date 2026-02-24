# Research Forge — Design System

## Intent

**Who:** Japanese humanities/social science researchers — professors, graduate students. At their desk between reading a PDF and writing a paragraph. Not programmers.

**What:** Describe a research need in conversation, watch it become a working interactive tool. The verb: *forge* an instrument from dialogue.

**Feel:** A scholar's workshop. Warm like a well-used library desk. Quiet like a university study. Not a tech product — an extension of the research environment. Focused, unhurried, respectful.

## Direction

The left panel is the workbench — warm, conversational. The right panel is the finished piece — cleaner, polished. Chat messages flow as a dialogue transcript, not a messaging app. The forge green accent concentrates on actions and state changes, not decoration.

## Palette

Built from the university study room — aged paper, wooden furniture, garden through the window.

| Token family | Role | Source |
|---|---|---|
| `sand-` | Surfaces, canvas, warmth | Aged manuscript paper |
| `ink-` | Text hierarchy (50–950) | Sumi ink, warm near-black |
| `forge-` | Accent, actions, brand | Campus moss green |

**CSS variables (globals.css):**
- `--earth-cream` (#faf7f2) — body background
- `--earth-warm` (#e8ddd0) — scrollbar, warm accents
- `--earth-stone` (#9e9688) — scrollbar hover
- `--earth-leaf` (#3d6b4f) — streaming cursor
- `--text-primary` (#3a3530) — body text

## Surfaces — 3 levels

| Level | Usage | Token |
|---|---|---|
| Canvas | Page background, right panel | `bg-sand-50` |
| Panel | Left panel, toolbars, banners | `bg-white` |
| Overlay | Modals, dropdowns | `bg-white` + shadow |

Warm at base, cleaner as surfaces rise.

## Depth Strategy: Borders-only

No shadows on inline elements. Borders define structure.

| Boundary | Weight | Example |
|---|---|---|
| Primary division | `border-sand-300/60` | Chat ↔ Preview split |
| Secondary | `border-sand-200/80` | Header bottom, banner bottom |
| Tertiary | `border-sand-200/70` | Tab bars, input area |

**Exception:** Modals use `shadow-2xl` — overlays need clear separation.

## Border Radius Scale

| Context | Value | Class |
|---|---|---|
| Inputs, buttons, controls | 8px | `rounded-lg` |
| Cards, tool generation notices | 8px | `rounded-lg` |
| Academic advice callouts | 6px | `rounded-md` |
| Modals | 16px | `rounded-2xl` |
| Suggestion pills | full | `rounded-full` |

Single border weight: `border` (1px). Never `border-2`.

## Typography

| Role | Family | Class |
|---|---|---|
| Display (titles, tool names) | Noto Serif JP | `font-display` |
| Body (UI, chat, labels) | Noto Sans JP | `font-body` (default) |
| Code | JetBrains Mono | `font-mono` |

**Text hierarchy:** `ink-900` (primary) → `ink-700` (body) → `ink-500` (secondary) → `ink-400` (muted) → `ink-300` (placeholder/hint)

Body text size: `text-[15px]` in chat, `text-sm` (14px) for UI controls.

## Spacing

Base unit: 4px. Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48.

- Message gaps: 12px (`space-y-3`)
- Panel padding: 16px (`p-4`, `px-4`)
- Header padding: `px-5 py-2.5`
- Toolbar padding: `px-3 py-1.5`

## Chat Messages

**Assistant:** Left-aligned. Small square forge icon (`w-6 h-6 rounded-md bg-forge-100`). No background on message text. `text-ink-700`. Copy button shows on hover (`opacity-0 group-hover:opacity-100`).

**User:** Right-aligned (`justify-end`). `max-w-[80%]`. Solid warm background `bg-sand-100 rounded-lg px-4 py-2.5`. `text-ink-800`. No icon.

**Tool generation card:** `bg-forge-50 rounded-lg border border-forge-200`. Academic advice: `rounded-md border-l-2 border-forge-300`.

**Streaming progress:** Same card style as tool generation. Progress bars use `h-1.5 rounded-full`.

## Tabs

Active: `text-ink-900 font-medium bg-sand-100/60`. Inactive: `text-ink-400`. Hover: `text-ink-600 bg-sand-50`. No colored backgrounds on active state.

## Header

Compact: `py-2.5`. Icon-only action buttons (`w-8 h-8`) with tooltips. All icons `w-4 h-4`. Logo: `w-8 h-8 rounded-lg bg-forge-600`.

## Empty States

Recede, don't announce. Guide toward action. No headlines — just a quiet icon and a one-line instruction. Example: "チャットで研究の課題を教えてください。最適なツールを作ります。"

## Preview Panel (Right)

**Banner:** `bg-white border-b`. Tool title in `font-display font-bold`. Primary action: "ツールを使う" button. Download as ghost icon button.

**Tab bar:** `bg-sand-50`. Save/publish as icon buttons with tooltips. Text-only tab labels (no icons).

## Grain Texture

`grain-overlay::before` — fractal noise at 1.5% opacity. `z-index: 40` (below Radix overlays at z-50). `pointer-events: none`.

## Animation

- Message enter: `translateY(6px)` → 0, 350ms ease-out
- Typing dots: staggered 1.4s pulse
- Streaming cursor: 1s blink
- Page transitions: `fadeIn` 500ms, `slideUp` 400ms

## Avoid

- `rounded-xl` on inline elements (use `rounded-lg`)
- `border-2` on controls (use `border`)
- Colored tab backgrounds for active state
- Shadow on anything that isn't a modal/dropdown
- Full-width colored banners (use white + border)
- `z-index` above 50 on non-overlay elements
- Unused CSS variables or tokens
