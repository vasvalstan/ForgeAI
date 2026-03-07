# ForgeAI Design System v6

Reference design screenshot: `assets/Screenshot_2026-03-07_at_11.43.53-*.png`

---

## 1. Foundations

### Color Palette

#### Backgrounds

| Token                    | Light       | Dark        | Usage                              |
|--------------------------|-------------|-------------|-------------------------------------|
| `--color-forge-bg`       | `#F8F9FA`   | `#0a0a0a`   | App background (cool neutral)       |
| `--color-forge-surface`  | `#ffffff`   | `#141414`   | Cards, panels, modals, dropdowns    |
| `--color-forge-surface-2`| `#F1F3F5`   | `#1e1e1e`   | Sidebar bg, secondary surfaces      |
| `--color-ink-950`        | `#F8F9FA`   | `#0a0a0a`   | Alias for `forge-bg`               |
| `--color-ink-900`        | `#ffffff`   | `#141414`   | Alias for `forge-surface`          |
| `--color-ink-850`        | `#F1F3F5`   | `#1e1e1e`   | Alias for `forge-surface-2`        |

The light-mode palette uses a cool neutral gray base with high-chroma semantic accents.

#### Text

| Token                          | Light       | Dark        | Usage                  |
|---------------------------------|-------------|-------------|------------------------|
| `--color-forge-text`           | `#212529`   | `#ececec`   | Headings, primary text |
| `--color-forge-text-secondary` | `#495057`   | `#a3a3a3`   | Body copy, labels      |
| `--color-forge-text-dim`       | `#868E96`   | `#888888`   | Captions, meta, hints  |

#### Borders

| Token                          | Light                       | Dark                          |
|---------------------------------|-----------------------------|-------------------------------|
| `--color-forge-border`         | `rgba(0, 0, 0, 0.08)`   | `rgba(255, 255, 255, 0.12)`  |
| `--color-forge-border-subtle`  | `rgba(0, 0, 0, 0.05)`   | `rgba(255, 255, 255, 0.08)`  |

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
| `--color-forge-amber-bg` | `#E9D8A6` | Selected sidebar item background (muted gold) |

#### Status Badge Colors

PASTEL backgrounds with DARK text (`forge-text`).

| Status     | Background | Text        | Notes                      | CSS Variable                |
|------------|------------|-------------|----------------------------|-----------------------------|
| Running    | `#99E9F2`  | `forge-text`| pastel cyan, dark text     | `--color-status-running`    |
| Inactive   | `#DEE2E6`  | `forge-text`| pastel gray, dark text     | `--color-status-inactive`   |
| Overdue    | `#FFC9C9`  | `forge-text`| pastel red, dark text      | `--color-status-overdue`    |
| Done       | `#B2F2BB`  | `forge-text`| pastel green, dark text    | `--color-status-done`       |

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

| Role                | Size   | Weight | Letter-spacing | Transform   | Tailwind                                 |
|---------------------|--------|--------|----------------|-------------|------------------------------------------|
| Logo "FORGE AI"     | 16px   | 700    | 0.08em         | uppercase   | `text-base font-bold tracking-widest uppercase` |
| Nav link            | 14px   | 500    | -0.01em        | —           | `text-sm font-medium`                    |
| Page title          | 18px   | 600    | -0.01em        | —           | `text-lg font-semibold`                  |
| Section header      | 11px   | 600    | 0.06em         | uppercase   | `text-[11px] font-semibold tracking-wider uppercase` |
| Card title          | 14px   | 600    | -0.01em        | —           | `text-sm font-semibold`                  |
| Card body           | 13px   | 400    | -0.005em       | —           | `text-[13px]`                            |
| Meta / dates        | 12px   | 400    | 0              | —           | `text-xs`                                |
| Badge label         | 12px   | 600    | 0              | —           | `text-xs font-semibold`                  |
| Caption / helper    | 11px   | 400    | 0              | —           | `text-[11px]`                            |
| Button label        | 13px   | 500    | 0              | —           | `text-[13px] font-medium`               |
| AI panel body       | 13px   | 400    | -0.005em       | —           | `text-[13px]`                            |

---

### Spacing

Use Tailwind's default 4px-based scale. Recurring patterns:

| Context              | Value   | Tailwind     |
|----------------------|---------|--------------|
| Panel padding        | 16px    | `p-4`        |
| Card inner padding   | 16px    | `p-4`        |
| Card grid gap        | 16px    | `gap-4`      |
| Section divider gap  | 24px    | `gap-6`      |
| Inline icon+label    | 8px     | `gap-2`      |
| Tight icon+label     | 10px    | `gap-2.5`    |
| Sidebar item padding | `px-2.5 py-2` | 10px / 8px |
| Between sidebar sections | 16px | `mb-4`      |

---

### Border Radius

| Element            | Radius   | Tailwind         |
|--------------------|----------|------------------|
| Cards              | 12px     | `rounded-xl`     |
| Status badges      | 9999px   | `rounded-full`   |
| Buttons            | 8px      | `rounded-lg`     |
| Input fields       | 8px      | `rounded-lg`     |
| Avatars            | 9999px   | `rounded-full`   |
| Dropdown menus     | 12px     | `rounded-xl`     |
| Sidebar panels     | 0 (flush)| —                |
| Icon buttons       | 8px      | `rounded-lg`     |
| CTA hero buttons   | 16px     | `rounded-2xl`    |

---

### Shadows

| Name         | Value                                                              | Usage                 |
|--------------|--------------------------------------------------------------------|-----------------------|
| `shadow-card`| `0 4px 20px rgba(0, 0, 0, 0.05)`        | Task/project cards    |
| `shadow-panel`| `0 1px 2px rgba(15,23,42,0.06), 0 10px 28px rgba(15,23,42,0.10)` | Sidebar, AI panel     |
| `shadow-dropdown`| `0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)`    | Dropdown menus        |
| `shadow-glow`| `0 0 0 1px rgba(37,99,235,0.20), 0 14px 40px rgba(37,99,235,0.12)`| Focus glow (primary)  |
| `shadow-glow-accent`| See globals.css                                             | Focus glow (brand)    |

---

## 2. Layout

### App Shell

Three-column layout with top nav and bottom toolbar.

```
┌──────────────────────────────────────────────────────────────┐
│  Top Nav Bar (h-14, sticky)                                  │
│  Logo · Home · Settings     Search · Avatars · Share  Bell · Avatar │
├───────────┬──────────────────────────────┬───────────────────┤
│           │                              │                   │
│  Sidebar  │   Main Content Area          │  AI Assistant     │
│  (240px)  │   (flex-1)                   │  Panel (300px)    │
│           │   Cards / Canvas / etc.      │                   │
│           │                              │                   │
├───────────┴──────────────────────────────┴───────────────────┤
│  Bottom Floating Toolbar (glassmorphism pill, centered icons)│
└──────────────────────────────────────────────────────────────┘
```

**Top navigation bar**: Full-width sticky bar with logo, nav links, search, avatars, share, bell, and user avatar. Background: `forge-surface` with bottom border.

**Bottom floating toolbar**: Glassmorphism pill (`glass` class), fixed at bottom center, with `rounded-full` and `shadow-panel`. Contains centered icon buttons for workspace actions.

### Top Navigation Bar

- Height: 56px (`h-14`)
- Background: `forge-surface` with bottom border
- Left: Logo "FORGE AI" (bold, uppercase, tracking wide)
- Center-left: Nav links (Home, Settings) with icons
- Center-right: Search icon, avatar stack, Share button
- Right: Notification bell, user avatar

### Sidebar (Projects)

- Width: 240px (collapsible to icon-only ~48px)
- Sections: Personal, Team (with sub-teams), Drafts
- Section headers: uppercase, `11px`, `tracking-wider`, dim text
- Tree items: `13px`, with expand/collapse carets
- Selected item: `forge-amber-bg` background highlight
- Team labels: `forge-amber` color text
- "Free version · Learn more" at bottom
- Add buttons appear on hover (`opacity-0 group-hover:opacity-100`)

### AI Assistant Panel

- Width: 300px (collapsible)
- Header: panel title, history icon, expand icon
- Model selector dropdown (pill-style)
- New chat button
- Chat input area with toolbar (mode, model, image, mic, send)
- Past chats list at bottom

### Bottom Toolbar

- Floating glassmorphism pill at bottom center (`fixed bottom-4 left-1/2 -translate-x-1/2`)
- Uses `glass` class (backdrop-blur, forge-surface, forge-border)
- `rounded-full`, `shadow-panel`
- Centered row of icon buttons
- Grouped with visual separators
- Icons at 20px size

---

## 3. Components

### Task / Project Card

White card with status badge, metadata, and actions.

```
┌────────────────────────────────────┐
│ Team 1   [Running ▾]    ↗  │
│                                    │
│ Meeting Records                    │
│ Transcription of meeting record    │
│ 05.03.2026, highlight the main...  │
│                                    │
│ Due: 08.03.2026   👤👤 ▾  ⋮ │
└────────────────────────────────────┘
```

Properties:
- Background: `forge-surface` (white)
- Border radius: `rounded-xl` (12px)
- Shadow: `shadow-card`
- Padding: `p-4`
- Status badge: pill in top right
- Team label: amber text in top left
- Expand icon: top right corner
- Three-dot overflow menu: bottom right
- Assignee avatars: bottom, overlapping circles
- Due date: bottom left, dim text

### Status Badge

Pill-shaped label with dropdown chevron. PASTEL backgrounds with DARK text.

- Shape: `rounded-full`, `px-2.5 py-0.5`
- Text: `text-xs font-semibold text-forge-text` (dark text on pastel bg)
- Colors: See Status Badge Colors table above
- Includes dropdown chevron icon

### Sidebar Tree Item

```
├─ ▸ Boards (3)         [+]
│    Board 1
│    Board 2  ← selected (amber bg)
│    Board 3
├─ ▸ PRDs (0)
```

- Collapsed: caret right + section icon + label + count
- Expanded: children indented below
- Hover: `hover:bg-black/[0.03]`
- Selected: `bg-forge-amber-bg` with `font-medium`
- Add button: appears on section hover

### Dropdown Menu

Built with `@radix-ui/react-dropdown-menu`.

- Background: `forge-surface`
- Border: `border-forge-border`
- Shadow: `shadow-dropdown`
- Radius: `rounded-xl`
- Item padding: `px-2.5 py-1.5`
- Item hover: `hover:bg-black/[0.04]` (light) / `hover:bg-white/[0.05]` (dark)
- Separator: 1px, `forge-border-subtle`
- Section labels: `10px`, uppercase, `tracking-wider`, dim

### Input Field

- Container: `rounded-lg`, `border-forge-border`, `bg-forge-surface-2`
- Icon: left-aligned, `forge-text-dim`
- Text: `text-sm` or `text-[13px]`
- Focus: `border-primary-500`, `ring-2 ring-primary-500/15`

### Avatar Stack

- Overlapping circles: `-space-x-1.5`
- Size: `w-6 h-6` (24px) or `w-7 h-7` (28px)
- Border: `border-2 border-forge-surface` (to create gap effect)
- Shape: `rounded-full`

### Buttons

| Variant    | Background               | Text                | Border           |
|------------|--------------------------|---------------------|------------------|
| Primary    | `primary-500`            | `white`             | none             |
| Secondary  | `transparent`            | `forge-text`        | `forge-border`   |
| Ghost      | `transparent`            | `forge-text-dim`    | none             |
| Danger     | `transparent`            | `forge-danger`      | none             |
| Icon       | `transparent`            | `forge-text-dim`    | none             |

All buttons: `cursor-pointer`, `transition-colors`, hover darkens bg by 5-10%.

### Task Checklist (inside expanded cards)

- Checkbox: `w-4 h-4 rounded border-forge-border`
- Checked: `bg-status-done` (pastel green), dark checkmark
- Unchecked: empty with border
- Label: `text-[13px] text-forge-text`
- Checked label: no strikethrough (clean look)

### Share Controls

- Avatar stack (team members)
- Search magnifying glass icon
- "Share" button with lock/unlock icon, `rounded-lg`, border style

### Page Selector

- "Page 1" dropdown with chevron
- Undo/redo arrow buttons
- Three-dot overflow menu

---

## 4. Icons

| Context              | Library                    | Default Size | Weight    |
|----------------------|----------------------------|-------------|-----------|
| Workspace UI         | `@phosphor-icons/react`    | 16-18px     | `regular` |
| Landing page         | `lucide-react`             | 20-24px     | —         |

Icon button pattern: `p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors cursor-pointer`

---

## 5. Animations

| Type               | Properties                    | Duration | Easing   |
|--------------------|-------------------------------|----------|----------|
| Card entrance      | opacity 0→1, translateY 8→0   | 300ms    | ease-out |
| Panel slide        | opacity 0→1, translateY 8→0   | 200ms    | ease-out |
| Hover transitions  | background-color, color       | 150ms    | default  |
| Section collapse   | height, opacity               | 200ms    | ease-out |

Use `motion` library for JS-driven animations. Use CSS `transition-*` for hover/focus states.

---

## 6. Dark Mode

- Toggled via `.dark` class on `<html>` (managed by `next-themes`)
- Custom variant: `@custom-variant dark (&:is(.dark *));`
- All semantic tokens switch automatically via CSS variables in `:root` vs `.dark`
- Use `dark:` Tailwind prefix for overrides
- Never hardcode light-mode hex values in component `className` or `style` props
- Always verify both modes when building components

---

## 7. Glassmorphism Utilities

```css
.glass         → background: forge-surface, backdrop-blur: 16px, border: forge-border
.glass-strong  → background: forge-surface, backdrop-blur: 18px, border: forge-border
```

Used for sidebar, AI panel, and overlays.

---

## 8. Conventions

- **Styling**: Prefer Tailwind classes with CSS variables over inline `style={{}}` props
- **Class merging**: Use `cn()` helper from `clsx` + `tailwind-merge`
- **File naming**: kebab-case for files (`agent-panel.tsx`), PascalCase for components (`AgentPanel`)
- **Accessibility**: All interactive elements get `cursor-pointer`, visible focus via `focus-visible:ring-2`
- **Co-location**: Component styles live alongside components, no separate CSS modules
- **Icons**: Prefer Phosphor for workspace, Lucide for marketing pages
- **State management**: Zustand stores in `lib/stores/`
- **Radix primitives**: Use for dropdowns, dialogs, tooltips, scroll areas
