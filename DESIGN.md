---
name: BlindSweeper
description: A minefield game played entirely by feel.
colors:
  cleared-signal: "#34d399"
  cleared-signal-bright: "#6ee7b7"
  cleared-signal-border: "#10b981"
  void: "#050505"
  board-void: "#000000"
  depth-1: "#090909"
  surface-raised: "#18181b"
  surface-overlay: "#1c1c1f"
  border-subtle: "#27272a"
  border-active: "#3f3f46"
  text-primary: "#f4f4f5"
  text-secondary: "#a1a1aa"
  text-muted: "#71717a"
  danger: "#f87171"
  danger-deep: "#450a0a"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
rounded:
  default: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.cleared-signal}"
    textColor: "{colors.board-void}"
    rounded: "{rounded.default}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.cleared-signal-bright}"
    textColor: "{colors.board-void}"
    rounded: "{rounded.default}"
    padding: "12px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.default}"
    padding: "6px 12px"
  button-ghost-hover:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.default}"
    padding: "6px 12px"
  button-resume:
    backgroundColor: "transparent"
    textColor: "{colors.cleared-signal-bright}"
    rounded: "{rounded.default}"
    padding: "12px 20px"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    rounded: "{rounded.default}"
    padding: "10px 20px"
  setting-toggle:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.default}"
    padding: "12px 16px"
  stat-display:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.default}"
    padding: "12px 8px"
---

# Design System: BlindSweeper

## 1. Overview

**Creative North Star: "The Dead of Night"**

BlindSweeper is played in effective darkness. The board is pure black during play; you cannot see what you are looking for. Every surface, every label, every button should feel like it belongs to that darkness rather than sitting on top of it. The UI is not a frame around the game; it is the game's outermost layer.

The visual approach is immersive restraint. Surfaces grade from void (pure black, the board) to near-void (depth-0, depth-1) to barely raised (surface-raised). The single accent color, Cleared Signal, is reserved for exactly what the name implies: states and actions the player knows are safe. Everything else is graded zinc and near-black. Chrome withdraws during play. Information appears only when it has something to say.

This system explicitly refuses the conventions of polished SaaS dashboards: no card grids, no sidebar navigation, no metric tiles with gradient accents. It refuses casual mobile game conventions: no bouncy entrances, no star rewards, no bright-on-white palettes. The design should feel like holding something heavy in a dark room. Calm, precise, slightly tense.

**Key Characteristics:**
- Four-grade depth stack: board void (#000) > page void (#050505) > header dark (#090909) > raised surface (#18181b)
- One accent color (Cleared Signal, emerald) used at under 10% surface coverage
- Type is functional, never decorative: labels are facts
- Motion is state-only: transitions respond to interaction, never perform on load
- The board dominates the game screen; all chrome exists to orient, not to compete

## 2. Colors: The Depth Grades Palette

One accent against a four-grade depth stack. The palette has no warmth; it is what you see when your eyes adjust to a dark room.

### Primary
- **Cleared Signal** (#34d399): The emerald green used for confirmed-safe states: the primary CTA, the active level indicator, marked cell backgrounds. Its rarity is the point. If Cleared Signal is on more than 10% of a screen, something is wrong.
- **Cleared Signal Bright** (#6ee7b7): Hover state for the primary button, active stat numbers. One step lighter, same role.
- **Cleared Signal Border** (#10b981): Ghost border for the resume button. The color at 40-60% opacity where a full fill would be too loud.

### Neutral: Depth Grades
- **Board Void** (#000000): The game board only. True black. Forbidden on UI chrome outside the board container.
- **Page Void** (#050505): All page backgrounds: home, settings. Near-black with imperceptible tint.
- **Header Dark** (#090909): The game header background. One grade above Page Void.
- **Surface Raised** (#18181b, zinc-900): Stat display backgrounds, setting toggle backgrounds. The highest surface grade used in the UI.
- **Border Subtle** (#27272a, zinc-800): Borders at rest. Dividers. The default border color on all elements.
- **Border Active** (#3f3f46, zinc-700): Borders on hover. One step above Subtle.
- **Text Primary** (#f4f4f5, zinc-100): Headings, important numbers, button labels when on dark surface.
- **Text Secondary** (#a1a1aa, zinc-400): Ghost button text, secondary labels, back/utility controls.
- **Text Muted** (#71717a, zinc-500): Descriptions, timestamps, non-essential context.

### Danger
- **Danger** (#f87171, red-400): Explosion state text, "Boom" label, run-ended indicator, destructive action label.
- **Danger Deep** (#450a0a, red-950): Explosion cell background. The red that looks like a burn.

### Named Rules
**The One Signal Rule.** Cleared Signal (#34d399) is used only for confirmed-safe states: active run, primary CTA, marked cells, the primary action button. It is forbidden as a decorative color or for hover feedback on neutral elements. Its rarity is its meaning.

**The Board Void Rule.** #000000 (true black) belongs to the game board. Page surfaces use #050505 or darker, never true black, so the board registers as deeper than everything around it.

## 3. Typography

**Body / Display Font:** Inter (ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)

One typeface. No display serif. No decorative pairing. Inter's geometric precision and large x-height reads cleanly at small sizes in low light, which is exactly when this app is used.

### Hierarchy
- **Display** (700, 2.25rem/36px, line-height 1.1, tracking -0.02em): Home screen title only. The single moment of typographic weight in the entire UI.
- **Headline** (600, 1.5rem/24px, line-height 1.25): Settings page title. One per screen maximum.
- **Body** (400, 0.875rem/14px, line-height 1.5): Descriptions, setting toggle descriptions, supporting text. Max line length 60ch on mobile.
- **Label** (600, 0.75rem/12px, line-height 1, letter-spacing 0.1em, uppercase): Section identifiers, all button text, game header data labels (Level, Marked). Uppercase labels are used sparingly: navigation chrome only, not body copy.
- **Numeric** (700, tabular-nums): Stat display numbers, mine counts, level numbers. Always tabular. Never proportional.

### Named Rules
**The Uppercase Budget Rule.** Uppercase + wide tracking (letter-spacing ≥ 0.08em) is reserved for navigation chrome and game-state labels. Maximum two uppercase label elements per screen. Applied to body copy or headings, it reads as decoration. That is prohibited.

## 4. Elevation

This system is flat by design. Depth is expressed through the four-grade background stack, not through shadows. The only shadow in the entire UI is on the game board, and it is not a structural shadow: it is a dynamic glow tied to proximity intensity, computed in JavaScript.

No shadow appears on buttons, cards, headers, or containers. Surfaces are distinguished by background value, not by lift.

### Shadow Vocabulary
- **Proximity Glow** (`inset box-shadow with rgba(16, 185, 129, ...)` intensity driven by game state): Applied to the game board only. Not a design token; a game mechanic expressed as CSS. Forbidden on UI chrome.
- **Danger Glow** (`inset 0 0 96px rgba(127, 29, 29, 0.28)`): Applied to the game board when the run has failed or the level is exploded.

### Named Rules
**The Flat-By-Default Rule.** If a UI element appears to float, cast a shadow, or sit above its surface, it is wrong. Separation is achieved by background value. Shadows are game feedback, not interface decoration.

## 5. Components

### Buttons

Three variants, all using the same 4px radius. No pill shapes. No fully-rounded buttons.

- **Primary** (bg: Cleared Signal #34d399, text: Board Void #000, padding: 12px 20px): New Run, Start. The call to action. Hover shifts to Cleared Signal Bright (#6ee7b7). Full-width on mobile home screen.
- **Resume** (bg: transparent, border: Cleared Signal Border #10b981 at 60% opacity, text: Cleared Signal Bright #6ee7b7, padding: 12px 20px): Resume Run. A ghost of the primary. Used only when a run is active.
- **Ghost** (bg: transparent, border: Border Subtle #27272a, text: Text Secondary #a1a1aa, padding: 6px 12px): Back, Settings, Restart. Navigation chrome. Hover: border shifts to Border Active, text to Text Primary. Small padding; these do not compete with primary actions.
- **Destructive** (bg: transparent, border: red-900/60, text: Danger #f87171, padding: 10px 20px): Reset all data. Full-width, isolated at the bottom of Settings with a top divider. Never used inline with other actions.

### Setting Toggle

A full-width labeled row with a checkbox. Not a custom toggle switch: a native checkbox with `accent-color: #34d399` (Cleared Signal). Label on the left with a sub-description in Text Muted. Checkbox on the right. Background: surface-raised at 40% opacity. Border: Border Subtle. 12px vertical, 16px horizontal padding.

### Stat Display

Three numbers shown as a horizontal row, only when there is a run to display. Each cell: surface-raised at 60% opacity, Border Subtle border, 4px radius, 12px vertical and 8px horizontal padding. Number in Display weight (700), 1.5rem; active number in Cleared Signal Bright, all others in Text Primary. Label below the number in Label style (10px, uppercase, Text Muted). These are not cards; they are a readout strip.

**The No-Blank-Stats Rule.** The stat row is hidden when there is no run. An empty stat row with dashes is a SaaS pattern. This system does not show empty metrics.

### Game Header

A slim border-bottom bar (bg: #090909, border-bottom: Border Subtle at 70% opacity, 12px vertical padding). Three zones: Ghost button left (Back), centered readout (Level + Marked count in Label style, level number in Cleared Signal or Danger depending on run state), Ghost button right (Restart). Compact by design: the header takes as little vertical space as possible.

### Game Board

The playing surface. Pure black (#000) background, 4px radius border (Border Subtle at rest, red-950 when failed). The board is the product; everything else frames it.

- Active cells: black background, zinc-950 border grid lines
- Marked cells: emerald-950/70 background tint
- Hovered cell (visual feedback enabled): zinc-900 background
- Exploded cell: red-600 background
- Debug-revealed mine: red-950 background

The board's box-shadow is game state, not design: emerald glow when active (intensity proportional to proximity), red glow when failed.

### Proximity Meter

A floating 5-bar equalizer anchored to the bottom center of the board. Black/80% background, Border Subtle border, 8-12px bars. Active bars: Cleared Signal Bright. Inactive bars: zinc-800. Visible only when visual feedback is enabled and the run is active.

## 6. Do's and Don'ts

### Do:
- **Do** use #050505 for page backgrounds and #000000 only for the game board. The depth difference between them matters.
- **Do** use Cleared Signal (#34d399) exclusively for confirmed-safe and active states: primary CTA, active level number, marked cells, proximity meter active bars.
- **Do** use Ghost buttons for all navigation chrome (Back, Settings, Restart). They should recede behind primary actions.
- **Do** hide the stat display entirely when there is no run. Empty states show copy, not empty metric tiles.
- **Do** keep all buttons at 4px radius. No pill, no full-round, no large radius softening.
- **Do** use uppercase + wide tracking only for navigation labels and game-state readouts (Level, Marked). Two instances per screen maximum.
- **Do** suppress all transitions when `prefers-reduced-motion: reduce` is set.

### Don't:
- **Don't** use card grids, sidebar navigation, metric tiles with gradient accents, or any pattern that reads as a SaaS dashboard. These are explicitly prohibited by the product's anti-references.
- **Don't** use bouncy or spring-curve animations, entrance choreography, star or reward iconography, or bright-on-light color palettes. Casual mobile game conventions are prohibited.
- **Don't** use neon-on-black, purple-to-cyan gradients, or glowing border decorations. RGB gaming aesthetics are prohibited.
- **Don't** use true black (#000000) on page surfaces outside the game board. Page void is #050505; the board's black must read deeper.
- **Don't** add shadows to UI chrome elements. The Flat-By-Default Rule is absolute. The only shadows in this system are dynamic game-state glows on the board.
- **Don't** use Cleared Signal as a decorative accent, hover indicator on neutral elements, or background for anything other than the primary button. Its scarcity is its signal value.
- **Don't** show dashes or zeros in the stat display when there is no active run. Hide it entirely.
- **Don't** soften the design with large border radii, warm neutrals, or playful copy. The brand personality is Tense, Precise, Unforgiving. The UI should feel like that.
