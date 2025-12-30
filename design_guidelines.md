# Contestio Design System

## Design Approach
**System-Based Design** following shadcn/ui patterns with Contestio's established dark theme palette.

## Core Design Elements

### A. Contestio 10-Color Palette (MANDATORY)

All charts, graphs, progress bars, and data visualizations MUST use this palette.
Colors are defined in `client/src/lib/colors.ts`.

| ID | Name | Dark Mode (500) | Light Mode (600) | Usage |
|----|------|-----------------|------------------|-------|
| 1 | Contestio Lime | lime-500 (#84cc16) | lime-600 (#65a30d) | Brand, Primárne dáta |
| 2 | Deep Blue | blue-500 (#3b82f6) | blue-600 (#2563eb) | Voda, Sekundárne |
| 3 | Solar Amber | amber-500 (#f59e0b) | amber-600 (#d97706) | Pozornosť, Teplo |
| 4 | Royal Purple | purple-500 (#a855f7) | purple-600 (#9333ea) | Premium, Hĺbka |
| 5 | Signal Rose | rose-500 (#f43f5e) | rose-600 (#e11d48) | Kritické, Akcent |
| 6 | Aqua Cyan | cyan-500 (#06b6d4) | cyan-600 (#0891b2) | Sviežosť, Plytčina |
| 7 | Forest Emerald | emerald-500 (#10b981) | emerald-600 (#059669) | Príroda, Úspech |
| 8 | Energy Orange | orange-500 (#f97316) | orange-600 (#ea580c) | Dynamika, Akcia |
| 9 | Abyss Indigo | indigo-500 (#6366f1) | indigo-600 (#4f46e5) | Noc, Hlboká voda |
| 10 | Neon Pink | fuchsia-500 (#d946ef) | fuchsia-600 (#c026d3) | Moderný Tech |

**Usage Rules:**
- Dark mode uses **500** shades (brighter, neon effect on dark backgrounds)
- Light mode uses **600** shades (darker for better contrast on white)
- For Recharts: use `getChartColorByIndex(index)` from `@/lib/colors`
- For Tailwind: use `bgColors[index]` and `textColors[index]` arrays

### B. Background Colors (UNCHANGED)
**Dark Mode Foundation:**
- Primary Background: `192 100% 11%` (#012a36 - sidebar/header)
- Content Background: `192 52% 11%` (#0c1f28 - main content)
- Dropdown Background: `192 52% 9%` (darker than main for depth)
- Card Background: `192 40% 14%` (invitation cards)
- Card Hover: `192 40% 16%`

### C. Status & Interaction Colors
- Success Green: `142 76% 36%` (accept actions)
- Danger Red: `0 84% 60%` (reject actions)
- Badge Alert: `0 90% 50%` (notification count)
- Text Primary: `0 0% 98%`
- Text Secondary: `192 20% 70%`
- Border: `192 30% 20%`

### B. Typography
**Font Stack:** Inter (via Google Fonts CDN)
- Bell Icon: text-base (16px)
- Badge Count: text-xs font-bold (12px)
- Dropdown Title: text-sm font-semibold (14px)
- Invitation Sender: text-sm font-medium (14px)
- Battle Details: text-xs (12px)
- Timestamps: text-xs text-muted (11px)
- Buttons: text-sm font-medium (14px)

### C. Layout System
**Spacing Primitives:** Tailwind units of 2, 3, 4, 6, 8
- Component padding: p-4 to p-6
- Card spacing: p-4
- Button padding: px-4 py-2
- Badge positioning: -top-1 -right-1
- Dropdown width: w-96 (384px)
- Card gap: space-y-2

### D. Component Library

**Bell Icon Button:**
- Relative positioned container
- Heroicons outline bell icon
- Cyan hover state with subtle background
- Smooth transition (150ms)
- Badge: absolute positioned, circular (h-5 w-5), red background, white text

**Dropdown Container:**
- Positioned absolute, right-aligned below bell
- Border radius: rounded-lg (8px)
- Shadow: shadow-2xl with cyan glow effect
- Max height: max-h-[500px] with overflow-y-auto
- Border: 1px solid border color

**Dropdown Header:**
- "Battle Invitations" title with count
- "Mark all as read" link (cyan, text-sm)
- Flex justify-between, items-center
- Bottom border separator

**Invitation Cards:**
- Rounded-lg background on card bg color
- Border-l-4 with cyan accent for emphasis
- Flex layout: avatar section + content + actions
- Hover state: background lightens slightly

**Avatar Section:**
- w-12 h-12 rounded-full
- Gradient placeholder or user image
- Ring-2 ring-cyan on active invitations

**Content Section:**
- Sender name (font-medium, primary text)
- Battle type badge (pill shape, cyan background, text-xs)
- Details: Location/Tournament name (secondary text)
- Timestamp: relative time, muted color

**Action Buttons:**
- Two-button layout: Accept (success green) + Reject (subtle border)
- Accept: bg-success with hover darken, text-white
- Reject: border variant with hover bg-subtle
- Both: rounded-md, text-sm, px-4 py-1.5
- Flex gap-2 for spacing

**Empty State:**
- Center-aligned container
- Heroicons check-circle icon (h-12, muted color)
- "All caught up!" heading
- "No pending invitations" subtext
- py-12 vertical padding

**Loading State:**
- Skeleton cards with animate-pulse
- 3 placeholder cards showing structure

### E. Interactions

**Minimal Animation Strategy:**
- Dropdown: slideDown + fadeIn (200ms ease-out)
- Badge pulse: subtle scale animation when count updates (300ms)
- Card hover: background transition (150ms)
- Button states: built-in shadcn/ui interactions
- NO complex scroll animations or decorative effects

## Implementation Notes

**Icon Library:** Heroicons via CDN (bell, check-circle, x-mark)

**Scrollbar Styling:**
- Custom dark scrollbar for dropdown
- Thin (w-1.5) with cyan thumb
- Track: transparent, hover: visible

**Responsive Behavior:**
- Mobile: dropdown width w-[calc(100vw-2rem)] max-w-96
- Position adjusts based on viewport edge
- Touch-friendly button sizes maintained

**Accessibility:**
- ARIA labels on bell button ("Notifications, X unread")
- Role="menu" on dropdown
- Keyboard navigation support (Tab, Enter, Escape)
- Focus visible states with cyan ring

This design creates a cohesive, professional notification system that seamlessly integrates with Contestio's dark fishing competition aesthetic while maintaining clear hierarchy and actionable elements.