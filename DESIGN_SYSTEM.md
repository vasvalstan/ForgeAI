# ForgeAI Design System v7 — Floating-Card Architecture

Reference Figma: `figma.com/design/N29r0YQSwAAH2pE4q0dp7Y/Untitled?node-id=1-4971`

---

## 1. Foundations

### Design Philosophy — "Floating Cards"

Every major UI region (nav, sidebar, canvas, AI panel, toolbar, auth forms, landing sections) is rendered as a **floating rounded card** with `border`, `shadow-card`, and generous `border-radius` (24–32px). The `forge-bg` background color is visible in the gaps between cards, creating a spatial, almost macOS-desktop feel.

### Color Palette

#### Backgrounds

| Token                    | Light       | Dark        | Usage                              |
|--------------------------|-------------|-------------|-------------------------------------|
| `--color-forge-bg`       | `#F8F9FA`   | `#0a0a0a`   | App background (cool neutral), visible between cards |
| `--color-forge-surface`  | `#ffffff`   | `#141414`   | Cards, panels, modals, dropdowns    |
| `--color-forge-surface-2`| `#F1F3F5`   | `#1e1e1e`   | Toolbars, nested inputs, inset areas |

#### Text

| Token                          | Light       | Dark        | Usage                  |
|---------------------------------|-------------|-------------|------------------------|
| `--color-forge-text`           | `#212529`   | `#ececec`   | Headings, primary text |
| `--color-forge-text-secondary` | `#495057`   | `#a3a3a3`   | Body copy, labels      |
| `--color-forge-text-dim`       | `#868E96`   | `#888888`   | Captions, meta, hints  |

#### Borders

| Token                          | Light                    | Dark                         |
|---------------------------------|--------------------------|------------------------------|
| `--color-forge-border`         | `rgba(0, 0, 0, 0.08)`   | `rgba(255, 255, 255, 0.12)` |
| `--color-forge-border-subtle`  | `rgba(0, 0, 0, 0.05)`   | `rgba(255, 255, 255, 0.08)` |

#### Primary & Brand Accents

| Token               | Value     | Usage                            |
|----------------------|-----------|----------------------------------|
| `--color-primary-500`| `#2563eb` | Interactive elements, links      |
| `--color-primary-600`| `#1d4ed8` | Hover state for primary          |
| `--color-primary-400`| `#3b82f6` | Light tint / active highlight    |
| `--color-brand-500`  | `#7c3aed` | Brand violet, canvas glow        |
| `--color-brand-600`  | `#6d28d9` | Hover state for brand            |
| `--color-brand-400`  | `#8b5cf6` | Light tint                       |

#### Sidebar Active Highlight

| Token                    | Value     | Usage                                |
|--------------------------|-----------|--------------------------------------|
| `--color-forge-amber`    | `#b8860b` | Team labels, category accents        |
| `--color-forge-amber-bg` | `#E9D8A6` | Selected sidebar item background     |

#### Status Badge Colors

PASTEL backgrounds with DARK text (`forge-text`).

| Status     | Background | Text        | CSS Variable                |
|------------|------------|-------------|-----------------------------|
| Running    | `#99E9F2`  | `forge-text`| `--color-status-running`    |
| Inactive   | `#DEE2E6`  | `forge-text`| `--color-status-inactive`   |
| Overdue    | `#FFC9C9`  | `forge-text`| `--color-status-overdue`    |
| Done       | `#B2F2BB`  | `forge-text`| `--color-status-done`       |

#### Semantic Colors

| Name    | Value     | Usage                          |
|---------|-----------|--------------------------------|
| Success | `#16a34a` | Completed items, confirmations |
| Warning | `#f59e0b` | Attention, pending states      |
| Danger  | `#ef4444` | Errors, destructive actions    |
| Info    | `#2563eb` | Informational messages         |

#### Category Colors (Discovery)

| Category | Value     | Variable                    |
|----------|-----------|-----------------------------|
| Pain     | `#ef4444` | `--color-category-pain`     |
| Feature  | `#2563eb` | `--color-category-feature`  |
| Praise   | `#16a34a` | `--color-category-praise`   |
| Question | `#f59e0b` | `--color-category-question` |

---

### Typography

**Font**: Inter via `next/font/google`, loaded with `--font-inter` CSS variable.

| Role                | Size   | Weight | Letter-spacing | Transform   |
|---------------------|--------|--------|----------------|-------------|
| Logo "FORGE AI"     | 16px   | 700    | 0.08em         | uppercase   |
| Nav link            | 14px   | 500    | -0.01em        | —           |
| Section header      | 12px   | 600    | 0.06em         | uppercase   |
| Card title          | 14px   | 600    | -0.01em        | —           |
| Card body           | 13px   | 400    | -0.005em       | —           |
| Meta / dates        | 12px   | 400    | 0              | —           |
| Badge label         | 12px   | 600    | 0              | —           |
| Caption / helper    | 11px   | 400    | 0              | —           |
| Button label        | 13px   | 500-600| 0              | —           |

---

### Spacing

Use Tailwind's default 4px-based scale. Recurring patterns:

| Context              | Value   | Tailwind     |
|----------------------|---------|--------------|
| Panel inner padding  | 16px    | `p-4` or `px-4 py-4` |
| Card inner padding   | 16–20px | `p-4` to `p-5` |
| Gap between panels   | 16px    | `gap-4`      |
| Section divider gap  | 24px    | `gap-6`      |
| Inline icon+label    | 8px     | `gap-2`      |
| Tight icon+label     | 10px    | `gap-2.5`    |
| Sidebar item padding | `px-3 py-2` | 12px / 8px |
| Outer shell padding  | 16px    | `px-4 pt-4 pb-4` |

---

### Border Radius

| Element                 | Radius       | Tailwind             |
|-------------------------|--------------|----------------------|
| Top nav bar             | 28px         | `rounded-[28px]`     |
| Canvas panel            | 28px         | `rounded-[28px]`     |
| Sidebar / AI panels     | 24px         | `rounded-[24px]`     |
| Landing section cards   | 32px         | `rounded-[32px]`     |
| Auth form cards         | 28px         | `rounded-[28px]`     |
| Auth nav pill           | 20px         | `rounded-[20px]`     |
| Logo pill in nav        | 20px         | `rounded-[20px]`     |
| Inner content cards     | 12–16px      | `rounded-xl`         |
| Status badges           | 9999px       | `rounded-full`       |
| Buttons                 | 8–12px       | `rounded-lg` / `rounded-xl` |
| Input fields            | 12px         | `rounded-xl`         |
| Avatars                 | 9999px       | `rounded-full`       |
| Dropdown menus          | 12px         | `rounded-xl`         |
| Bottom floating toolbar | 9999px       | `rounded-full`       |
| CTA hero buttons        | 16px         | `rounded-2xl`        |

---

### Shadows

| Name             | Value                                                              | Usage                 |
|------------------|--------------------------------------------------------------------|-----------------------|
| `shadow-card`    | `0 4px 20px rgba(0, 0, 0, 0.05)`                                  | All floating panels, cards |
| `shadow-panel`   | `0 1px 2px rgba(15,23,42,0.06), 0 10px 28px rgba(15,23,42,0.10)` | Bottom toolbar, overlays |
| `shadow-dropdown`| `0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`       | Dropdown menus        |
| `shadow-glow`    | `0 0 0 1px rgba(37,99,235,0.20), 0 14px 40px rgba(37,99,235,0.12)`| Focus glow (primary)  |

---

## 2. Layout

### Workspace App Shell — Floating Card Architecture

All major regions are separate floating cards with `border border-forge-border`, `bg-forge-surface`, `shadow-card`, and generous `rounded-[N]` radius. The `forge-bg` background is visible between them.

```
┌─────────────────────────────────────────────────────────────────┐
│  px-4 pt-4                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Top Nav — rounded-[28px], shadow-card, h-[60px]            ││
│  │ [Logo pill] Home Settings        Search Avatars Share Bell  ││
│  └─────────────────────────────────────────────────────────────┘│
│  px-4 pt-3 pb-4   gap-4                                        │
│  ┌──────────┐ ┌─────────────────────────────┐ ┌──────────────┐ │
│  │ Sidebar  │ │ Canvas — rounded-[28px]     │ │ AI Panel     │ │
│  │ 260px    │ │ flex-1                      │ │ 320px        │ │
│  │ r-[24px] │ │ Page1 v  undo redo ...      │ │ r-[24px]     │ │
│  │          │ │                             │ │              │ │
│  │ Projects │ │      tldraw canvas          │ │ AI ASSISTANT │ │
│  │ Personal │ │                             │ │ Opus 4.6 v   │ │
│  │ Team     │ │                    Search   │ │ New chat     │ │
│  │  Team 1  │ │                    Avatars  │ │              │ │
│  │  Team 2  │ │                    Share    │ │ Past chats   │ │
│  │ Drafts   │ │                             │ │              │ │
│  │ Free ver │ │                             │ │              │ │
│  └──────────┘ └─────────────────────────────┘ └──────────────┘ │
│                                                                 │
│         [Sticker]  [▸ Tt ◇ ⬡ ◐ ✎ 💬 ⊞]  [</>]                 │
│         Bottom toolbar: center pill + flanking icon buttons      │
└─────────────────────────────────────────────────────────────────┘
```

### Top Navigation Bar

- Floating pill: `rounded-[28px]`, `h-[60px]`, `border border-forge-border`, `bg-forge-surface`, `shadow-card`
- Outer padding: `px-4 pt-4`
- Left: Logo pill (`rounded-[20px]`, `bg-forge-surface-2`, `border`), then Home and Settings nav links
- Right: Search + Avatar stack + Share pill, Bell icon, User avatar (round with border)

### Sidebar (Projects)

- Floating card: `rounded-[24px]`, `border`, `bg-forge-surface`, `shadow-card`
- Width: 260px (collapsible to 56px)
- Inner padding: `px-3 py-4`
- Sections wrapped in an inner container with `rounded-[20px]` border
- Tree items: `px-3 py-2`, `rounded-xl`
- Selected item: `bg-forge-amber-bg`
- Section headers: `text-[12px]`, `font-semibold`, `tracking-[0.06em]`, `uppercase`, `text-forge-text-secondary`

### Canvas Panel

- Floating card: `rounded-[28px]`, `border`, `bg-forge-surface`, `shadow-card`, `flex-1`
- Floating inner controls (top):
  - Left: Page selector pill (`rounded-full`, `border`, `shadow-card`) with undo/redo/more
  - Right: Search + avatars + share pill (`rounded-full`, `border`, `shadow-card`)
- tldraw fills the card area; dot grid via CSS pseudo-element

### AI Assistant Panel

- Floating card: `rounded-[24px]`, `border`, `bg-forge-surface`, `shadow-card`
- Width: 320px (collapsible to 56px)
- Inner padding: `px-4 py-4`
- Header: `text-[12px]` uppercase section label
- Model selector + New chat row below header
- Input: `rounded-2xl`, `border`, `shadow-card`

### Bottom Toolbar

- Three separate floating elements in a row:
  - Left icon button: `rounded-2xl`, `w-12 h-12`, `border`, `shadow-card`
  - Center pill: `rounded-full`, `border`, `shadow-panel`, holds tool icons separated by `w-px` dividers
  - Right icon button: same as left

### Landing Page

- Floating nav: `rounded-[28px]`, `max-w-5xl`, `shadow-card`
- Section cards: `rounded-[32px]`, `border`, `bg-forge-surface`, `shadow-card`
- Canvas mockup: `rounded-[28px]`, `border`, `shadow-card`
- CTA card: `rounded-[32px]`, gradient `from-forge-surface to-primary-500/5`

### Auth Pages

- Layout: `forge-bg` full page, floating nav pill at top
- Auth nav pill: `rounded-[20px]`, `h-[52px]`, `max-w-md`
- Form card: `rounded-[28px]`, `border`, `bg-forge-surface`, `shadow-card`
- Inputs: `h-12`, `rounded-xl`, `border`, `shadow-card`

---

## 3. Components

### Status Badge

Pill-shaped label. PASTEL backgrounds with DARK text.

- Shape: `rounded-full`, `px-2.5 py-0.5`
- Text: `text-xs font-semibold text-forge-text`
- See Status Badge Colors table

### Task / Project Card

- `bg-forge-surface`, `rounded-xl`, `shadow-card`, `p-4`, `border border-forge-border-subtle`
- Team label in amber, status badge top-right
- Due date bottom-left, avatar stack bottom-right

### Sidebar Tree Item

- `rounded-xl`, `px-3 py-2`, `text-[13px]`
- Selected: `bg-forge-amber-bg text-forge-text font-medium`
- Hover: `hover:bg-forge-surface-2`

### Dropdown Menu

- `rounded-xl`, `border-forge-border`, `shadow-dropdown`, `bg-forge-surface`
- Item: `px-2.5 py-1.5`, hover `bg-black/[0.04]`

### Input Field

- `h-12`, `rounded-xl`, `border-forge-border`, `shadow-card`, `bg-forge-surface`
- Focus: `border-primary-500`, `ring-2 ring-primary-500/30`
- Placeholder: `text-forge-text-dim`

### Avatar Stack

- Overlapping circles: `-space-x-2`
- Size: `w-6 h-6`
- Border: `border-2 border-forge-surface`

### Buttons

| Variant    | Background               | Text                | Border           |
|------------|--------------------------|---------------------|------------------|
| Primary    | `primary-500`            | `white`             | none             |
| Brand      | `brand-500`              | `white`             | none             |
| Secondary  | `transparent`            | `forge-text`        | `forge-border`   |
| Ghost      | `transparent`            | `forge-text-dim`    | none             |
| Icon       | `transparent`            | `forge-text-dim`    | none             |

All buttons: `cursor-pointer`, `transition-colors`, hover darkens by 5-10%.

---

## 4. Icons

| Context              | Library                    | Default Size | Weight    |
|----------------------|----------------------------|-------------|-----------|
| Workspace UI         | `@phosphor-icons/react`    | 16-18px     | `regular` |
| Landing page         | `lucide-react`             | 20-24px     | —         |

Icon button pattern: `p-2 rounded-xl hover:bg-forge-surface-2 transition-colors cursor-pointer`

---

## 5. Animations

| Type               | Properties                    | Duration | Easing   |
|--------------------|-------------------------------|----------|----------|
| Card entrance      | opacity 0→1, translateY 8→0   | 300ms    | ease-out |
| Panel slide        | opacity 0→1, translateY 8→0   | 200ms    | ease-out |
| Hover transitions  | background-color, color       | 150ms    | default  |
| Section collapse   | height, opacity               | 200ms    | ease-out |
| Panel resize       | width (transition-all)        | 300ms    | ease-in-out |

---

## 6. Dark Mode

- Toggled via `.dark` class on `<html>` (managed by `next-themes`)
- Custom variant: `@custom-variant dark (&:is(.dark *));`
- All semantic tokens switch automatically via CSS variables in `:root` vs `.dark`
- Floating cards keep `bg-forge-surface` (dark: `#141414`), background shows `forge-bg` (dark: `#0a0a0a`)

---

## 7. Glassmorphism Utilities

```css
.glass         → background: forge-surface, backdrop-blur: 16px, border: forge-border
.glass-strong  → background: forge-surface, backdrop-blur: 18px, border: forge-border
```

---

## 8. Conventions

- **Floating cards everywhere**: Every panel, form, nav bar, and section is a floating rounded card
- **Styling**: Prefer Tailwind classes with CSS variables over inline `style={{}}` props
- **Class merging**: Use `cn()` helper from `clsx` + `tailwind-merge`
- **File naming**: kebab-case for files (`agent-panel.tsx`), PascalCase for components (`AgentPanel`)
- **Accessibility**: All interactive elements get `cursor-pointer`, visible focus ring
- **Co-location**: Component styles live alongside components, no separate CSS modules
- **Icons**: Phosphor for workspace (size 16-18), Lucide for marketing pages (size 20-24)
- **State management**: Zustand stores in `lib/stores/`
- **Radix primitives**: Use for dropdowns, dialogs, tooltips, scroll areas
