# UI Overhaul Design Spec — Agentic Knowledge Workspace
**Date:** 2026-04-28  
**Direction:** Clean & Authoritative (Stripe / Linear / Vercel aesthetic)  
**Scope:** Styling layer only — no routing, business logic, or data changes

---

## 1. Design System Tokens

All tokens are defined as CSS custom properties in `app/globals.css` and referenced everywhere via Tailwind v4's `@theme inline` block. The existing `lib/design-tokens.ts` is updated to match.

### 1.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-brand-dark` | `#0F172A` | Logo, H1 headings, user message bubbles |
| `--color-primary` | `#2563EB` | Primary buttons, links, active nav border |
| `--color-accent` | `#7C3AED` | AI elements: citation chips, AI avatar, badge-ai |
| `--color-bg-base` | `#F8FAFC` | Page background (replaces `gray-50`) |
| `--color-bg-surface` | `#FFFFFF` | Cards, sidebar, modals |
| `--color-bg-subtle` | `#F1F5F9` | Hover rows, filter pills, input backgrounds |
| `--color-bg-muted` | `#E2E8F0` | Dividers, disabled states |
| `--color-text-primary` | `#0F172A` | Body text, headings |
| `--color-text-secondary` | `#475569` | Subtitles, labels, nav items |
| `--color-text-muted` | `#94A3B8` | Placeholders, captions, timestamps |
| `--color-border-default` | `#E2E8F0` | Card borders, input borders |
| `--color-border-strong` | `#CBD5E1` | Hover borders, focus rings base |
| `--color-success` | `#16A34A` | Completed status |
| `--color-warning` | `#D97706` | Processing status |
| `--color-error` | `#DC2626` | Failed status, danger buttons |

### 1.2 Typography

**Font pairing loaded via `next/font/google` in `app/layout.tsx`:**

- **Heading font:** `Plus Jakarta Sans` — weights 600, 700, 800. Used for all `h1`–`h3`, stat numbers, brand name, card titles.
- **Body font:** `DM Sans` — weights 400, 500, 600. Used for all body copy, labels, buttons, inputs, nav items.
- **Mono font:** `JetBrains Mono` (already referenced in design-tokens; add to layout import). Used for file type labels, code blocks, hex values.

**Type scale (applied via `globals.css` utility classes):**

| Role | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| Page H1 | 36px | 800 | −0.04em | 1.1 |
| Section H2 | 24px | 700 | −0.03em | 1.2 |
| Card H3 | 16px | 600 | −0.01em | 1.3 |
| Body | 14px | 400 | 0 | 1.6 |
| Label | 12.5px | 500 | 0 | 1.4 |
| Caption / Meta | 12px | 400 | +0.01em | 1.4 |
| Overline | 11px | 700 | +0.08em | 1 |

### 1.3 Spacing, Radius, Shadow

**Spacing base unit: 8px.** All padding/gap values are multiples of 4px.

| Radius token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Badges, kbd chips |
| `--radius-md` | 8px | Inputs, small buttons |
| `--radius-lg` | 12px | Cards, modals, upload zone |
| `--radius-xl` | 16px | Large modals |
| `--radius-full` | 9999px | Status badges, doc chips |

| Shadow token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.06)` | Cards at rest |
| `--shadow-md` | `0 4px 12px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.05)` | Cards on hover, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.06)` | Modals, command palette |

### 1.4 Motion

All interactive transitions use `150ms ease` for micro-interactions (hover color, border-color) and `200ms ease` for layout changes (sidebar, modal open). No transitions exceed 300ms.

Entrance animations: `fade-in` + `slide-in-from-bottom-2` with 50ms staggered delay per item, max 300ms total.

---

## 2. Global Styles (`app/globals.css`)

**Changes from current:**

1. Add all CSS custom property tokens from §1.1 to `:root`.
2. Replace `font-family: Arial, Helvetica, sans-serif` on `body` with `var(--font-body)` (DM Sans).
3. Add `--font-heading` and `--font-mono` CSS variables.
4. Add `.text-heading` utility class: `font-family: var(--font-heading); letter-spacing: -0.03em;`
5. Refine scrollbar thumb color to `#CBD5E1` (current `#d1d5db` is close; unify to token).
6. Keep all existing animation keyframes (`fade-in`, `slide-in-from-bottom`, `zoom-in`) — they are already used.
7. Add `@theme inline` entries for all new color tokens so Tailwind v4 utility classes (`bg-brand-dark`, `text-primary`, etc.) are generated.

---

## 3. Root Layout (`app/layout.tsx`)

**Changes:**

1. Replace `import { Inter } from "next/font/google"` with imports for `Plus_Jakarta_Sans` and `DM_Sans`.
2. Apply both font CSS variables to `<html>` element via `className`.
3. Update `<title>` metadata to `"Agentic Workspace"` (shorter, cleaner).
4. No other changes to AuthProvider or structure.

---

## 4. Dashboard Layout Shell (`app/(dashboard)/layout.tsx`)

### 4.1 Top Bar

- Height: `h-14` (56px, up from 64px) for tighter feel.
- Background stays `bg-white` with `border-b border-border-default`.
- **Brand name** added to topbar when sidebar is open: `⚡ Agentic Workspace` in `font-heading font-extrabold text-brand-dark`.
- **Command palette trigger:** Replace empty left side with a `⌘K` search pill (styled as `bg-subtle border border-border-default rounded-lg text-xs text-muted px-3 py-1.5 flex items-center gap-2`). Clicking it opens the existing `CommandPalette`.
- **User avatar:** Replace plain `user.email` text with a small gradient avatar circle (initials from email, `bg-gradient-to-br from-primary to-accent`). Email shown on hover tooltip only.
- **Tenant switcher:** Keep existing logic; restyle button to match filter-pill style (`bg-subtle border rounded-lg text-sm`).
- Remove the logout text link; put logout in a small dropdown from the avatar. The `logout()` function call is preserved exactly — only the trigger element moves.

### 4.2 Sidebar

- Width stays `w-64` open / `w-16` collapsed.
- **Brand header:** Show `⚡` icon in a `24×24` gradient rounded square + `"Agentic Workspace"` in `font-heading font-extrabold`. Replace current plain `h2`.
- **Nav items:** Change active state from `bg-gray-100` to `bg-[#EFF6FF] text-primary border-l-2 border-primary font-semibold`. Inactive: `text-secondary hover:bg-subtle hover:text-primary`.
- **Section labels:** Change from `text-gray-500` to `text-muted text-[10px] font-bold tracking-widest uppercase` — more refined overline style.
- **Icons:** Keep emoji icons; add consistent `text-[13px]` sizing and `w-4` fixed width for alignment.
- **Collapsed tooltips:** Keep existing logic; restyle tooltip to use `bg-brand-dark` (already `bg-gray-900`) with `rounded-md`.
- **Footer:** Add user avatar + email in a `border-t border-border-default` strip at the bottom. The collapse button moves to be a `≡` icon in the topbar (visible only when collapsed — existing behavior kept).
- **Background:** Keep `bg-white`; add subtle `box-shadow: 2px 0 8px rgba(15,23,42,0.04)` on the right edge.

---

## 5. Login Page (`app/login/page.tsx`)

**New layout:** Two-column split (50/50 on desktop, stacked on mobile).

**Left panel (`hidden md:flex`):**
- Background: `bg-brand-dark`.
- Two radial gradient glows: blue at top-left, violet at bottom-right — implemented as two `<div>` overlay elements with `absolute pointer-events-none` and `bg-[radial-gradient(...)]` (Tailwind arbitrary value). This avoids pseudo-element limitations in React JSX.
- Brand mark top: `⚡ Agentic Workspace` in white `font-heading font-extrabold`.
- Tagline bottom: `"Your knowledge, amplified by AI."` in `text-2xl font-extrabold text-white`, secondary line in `text-slate-400`.

**Right panel:**
- Clean white background, center-aligned form in `max-w-sm`.
- Heading: `"Welcome back"` / `"Create account"` in `font-heading text-2xl font-extrabold text-brand-dark`.
- Sub: `"Sign in to your workspace"` in `text-sm text-secondary`.
- Inputs: Use the new input style (border `#E2E8F0`, focus ring `rgba(37,99,235,0.12)`, `rounded-lg`).
- Submit button: Full-width primary button with `→` arrow.
- Toggle link: `"Don't have an account? Sign up"` centered below button in `text-muted`.
- Error state: Red banner with left border accent (`border-l-4 border-error bg-red-50`).

**Mobile:** Left panel hidden, right panel is full screen centered.

---

## 6. Dashboard Page (`app/(dashboard)/app/page.tsx`)

**Changes:**

- `h1` switches to `font-heading font-extrabold tracking-tight text-brand-dark`.
- **Stat cards:** Replace plain `text-3xl font-bold` numbers with `font-heading text-[28px] font-extrabold tracking-tighter`. Add hover-lift (`hover:-translate-y-px hover:shadow-md transition-all duration-150`). Add `stat-sub` line showing trend or percentage.
- **Quick Actions card:** Replace emoji-prefixed button text with icon + label layout; use proper Button variants.
- **Recent Documents list:** Add file-type icon in a `bg-[#EFF6FF] rounded-md` square. Replace plain status span with the `StatusBadge` component (which gets restyled — see §8).
- **Empty state:** Keep existing 3-step guide; restyle step icons from plain emoji to icon-in-circle (`bg-subtle rounded-full w-12 h-12`), step text in `font-heading font-semibold`.

---

## 7. Documents Page (`app/(dashboard)/app/documents/page.tsx`)

**Upload zone:**
- Change border from `border-gray-300` to `border-border-strong border-dashed`.
- Hover state: `hover:border-primary hover:bg-[#EFF6FF]` (currently `hover:border-blue-400` — align to token).
- Add file-type pills row below description text: `PDF CSV MD TXT DOCX` as small monospaced chips (`font-mono text-[10px] bg-white border rounded px-1.5 py-0.5 text-muted`).
- Upload icon: Wrap in a `w-10 h-10 bg-white border border-border-default rounded-xl shadow-sm` box.

**Filter bar:**
- Search input: add magnifying glass icon absolutely positioned inside (`pl-9`).
- Status filter and Sort: restyle from plain `<Select>` to pill-style dropdowns with `▾` chevron.
- Selected items count banner: restyle from `border-t` strip to an inline sticky banner with `bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg`.

**Documents table:**
- Add a subtle `bg-subtle` table header row with uppercase overline labels.
- Each row: add `doc-icon` (file emoji in `bg-[#EFF6FF] rounded-md w-8 h-8`). File type column in `font-mono text-muted`.
- Delete button: Change from plain red link to a ghost icon button (trash icon, `text-muted hover:text-error`).
- Checkboxes: style with `rounded` and `accent-primary`.

---

## 8. UI Components

### 8.1 `components/ui/Button.tsx`

No structural changes. Style updates only:

- `primary`: Add `shadow-[0_1px_2px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)]`.
- `secondary`: Change `bg-gray-200` → `bg-subtle` and `text-gray-900` → `text-primary`; add `border border-border-default`.
- `ghost`: `text-secondary hover:bg-subtle hover:text-primary`.
- `danger`: Change to `bg-red-50 text-error border border-red-200 hover:bg-red-100` (softer than solid red).
- All variants: `rounded-lg` (currently `rounded-lg` — confirm stays 8px, matches `--radius-md`).
- Spinner color: inherit from button text color.

### 8.2 `components/ui/Card.tsx`

- Base: Change `shadow` → `shadow-sm` (the new `--shadow-sm` token).
- `border-gray-200` → `border-border-default`.
- `hover` prop: Add `hover:-translate-y-px hover:shadow-md hover:border-border-strong` (currently only `hover:shadow-md hover:border-gray-300`).
- Header: `border-gray-200` → `border-border-default`; title uses `font-heading font-semibold`.
- Footer: `bg-gray-50` → `bg-subtle`.

### 8.3 `components/ui/StatusBadge.tsx`

Restyle to use pill badges with colored dot:

- `completed`: `bg-green-50 text-green-700` + green dot.
- `processing` / `pending`: `bg-amber-50 text-amber-700` + amber dot.
- `failed`: `bg-red-50 text-red-700` + red dot.

Replace any inline `px-3 py-1 rounded-full text-xs` patterns in `app/(dashboard)/app/page.tsx` and `app/(dashboard)/app/documents/page.tsx` with this component.

### 8.4 `components/ui/Input.tsx`

- Border: `border-border-default` (was `border-gray-300`).
- Focus: `focus:ring-[3px] focus:ring-primary/10 focus:border-primary` (was `focus:ring-blue-500 focus:border-blue-500`).
- Rounded: `rounded-lg` → keep as-is.
- Error state: `border-error focus:ring-error/10`.

### 8.5 `components/ui/Modal.tsx`

- Overlay: `bg-black/40 backdrop-blur-sm` (add subtle blur).
- Dialog: `rounded-xl shadow-lg` (upgrade from `rounded-2xl shadow-xl` — align to token; `rounded-xl` = 16px = `--radius-xl`).
- Header: Font heading on title.

### 8.6 `components/ui/Badge.tsx`

Add `ai` variant: `bg-[#EDE9FE] text-[#6D28D9]` for AI-generated content.

### 8.7 `components/ui/EmptyState.tsx`

- Icon: Wrap in `w-14 h-14 bg-subtle rounded-2xl flex items-center justify-center mx-auto mb-4` instead of raw emoji.
- Title: `font-heading font-bold text-brand-dark`.
- Description: `text-secondary text-sm`.

### 8.8 `components/ui/Toast.tsx`

- Restyle with left border accent (`border-l-4`) matching toast type color.
- Background: `bg-white shadow-lg border border-border-default rounded-lg`.

---

## 9. Chat Page (`app/(dashboard)/app/chat/page.tsx`)

**Changes (styling only):**

- **Source sidebar:** Already exists (`SourceSidebar` component). Style the sidebar panel: `border-l border-border-default bg-surface`. Source items: citation number as `bg-[#EDE9FE] text-accent rounded px-1.5 py-0.5 text-xs font-bold`. Snippet text: `text-secondary text-xs leading-relaxed`.
- **Citation chips:** Change from plain blue text `[1]` button to a small `bg-[#EDE9FE] text-accent rounded px-1 text-[11px] font-bold` chip (the violet AI accent color).
- **AI avatar:** Add a `26×26` gradient circle (`from-primary to-accent`) with `⚡` on the left of each assistant message.
- **User messages:** Change `bg-gray-900` → `bg-brand-dark` (same value, but now uses the token).
- **Action buttons tray:** Change from `border-t border-gray-100` strip to a cleaner row with `text-muted hover:text-secondary hover:bg-subtle rounded` icon buttons.
- **Input box:** Change `bg-gray-50 border-gray-200` → `bg-subtle border-border-default`; focus ring: `focus:ring-[3px] focus:ring-primary/10 focus:border-primary`; `rounded-2xl` stays.
- **Send button:** Style the send/stop icon button with `bg-primary text-white rounded-lg w-8 h-8` when there is input.
- **Document chip in header:** Selected doc pills use `bg-[#EFF6FF] border border-[#BFDBFE] text-primary text-xs rounded-full`.
- **Empty state:** Replace `text-3xl font-light` → `font-heading font-extrabold text-brand-dark text-2xl`. Example question buttons: `border border-transparent hover:border-border-default hover:bg-subtle` (currently correct, minor alignment to tokens).
- **Loading stages:** "Searching documents…" / "Generating answer…" text in `text-secondary text-sm`.

---

## 10. Agents Page (`app/(dashboard)/app/agents/page.tsx`)

- Agent icon: Wrap emoji in `w-10 h-10 bg-subtle border border-border-default rounded-xl` box.
- Connection status dot: `w-[7px] h-[7px] rounded-full` — `bg-success` when connected, `bg-muted` when not.
- Connected text: `text-success font-semibold text-xs`.
- Disconnected text: `text-muted text-xs`.
- Card hover: Already has `hover` prop on `Card`; ensure new Card styles apply (translate + shadow-md).
- History rows: Add type icon in `text-xl` + badge for status.

---

## 11. Settings Page (`app/(dashboard)/app/settings/page.tsx`)

Styling pass (page already has content):

- Integration cards: `border border-border-default rounded-xl p-6 bg-surface shadow-sm`.
- Connection status: same dot + text pattern as Agents page.
- "Connect" / "Test Connection" / "Disconnect" buttons: Use Button component variants (primary / ghost / danger-ghost).
- Credential info block: `bg-subtle rounded-lg p-3 text-xs font-mono`.

---

## 12. Audit Log Page (`app/(dashboard)/app/settings/audit/page.tsx`)

- Log rows: `hover:bg-subtle transition-colors`.
- Timestamp: `font-mono text-muted text-xs`.
- Event type: `font-heading font-semibold text-sm`.
- Details: `text-secondary text-xs`.

---

## 13. Eval Page (`app/(dashboard)/app/eval/page.tsx`)

- Stat metric cards: Apply same stat card pattern (font-heading bold number, muted label).
- Table rows: `hover:bg-subtle`.
- Score badges: Map to `badge-success` / `badge-warning` / `badge-error` based on value thresholds.

---

## 14. Constraints & Non-Changes

- **No routing changes.** All `href` values, `Link` components, redirects stay identical.
- **No data logic changes.** API calls, state management, `useEffect` hooks, localStorage keys — all untouched.
- **No component structure changes.** Existing component prop APIs stay the same. Only `className` strings and minor JSX wrapper `<div>`s for icon wrapping.
- **No content changes.** All text labels, section titles, error messages kept verbatim.
- **KaTeX CSS** stays imported in `layout.tsx`.
- **Dark mode** CSS variables in `globals.css` (the `@media prefers-color-scheme: dark` block) are removed — the design is light-only. The existing dark mode block only set background/foreground anyway; removing it is safe and prevents unintended dark flashes.
- **Tailwind config** — using Tailwind v4 with `@theme inline` in CSS, so no `tailwind.config.js` changes needed. New tokens registered directly in `globals.css`.

---

## 15. Implementation Order

1. `app/globals.css` — tokens + font variables (everything downstream depends on this)
2. `app/layout.tsx` — font imports
3. `lib/design-tokens.ts` — sync token values
4. `components/ui/Button.tsx`
5. `components/ui/Card.tsx`
6. `components/ui/Input.tsx`, `Select.tsx`, `Modal.tsx`, `Badge.tsx`, `StatusBadge.tsx`, `EmptyState.tsx`, `Toast.tsx`
7. `app/(dashboard)/layout.tsx` — sidebar + topbar
8. `app/login/page.tsx`
9. `app/(dashboard)/app/page.tsx` — dashboard
10. `app/(dashboard)/app/documents/page.tsx`
11. `app/(dashboard)/app/chat/page.tsx`
12. `app/(dashboard)/app/agents/page.tsx`
13. `app/(dashboard)/app/settings/page.tsx`
14. `app/(dashboard)/app/settings/audit/page.tsx`
15. `app/(dashboard)/app/eval/page.tsx`
16. Chat sub-components: `components/chat/SourceSidebar.tsx`, `DocumentSelector.tsx`
17. Agent modals: `components/agents/EmailDraftModal.tsx`, `JiraTicketModal.tsx`, `ReportModal.tsx`
18. Settings modals: `components/settings/EmailCredsModal.tsx`, `JiraCredsModal.tsx`
