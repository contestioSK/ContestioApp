# Contestio Notification Center Design Guidelines

## Design Approach
**System-Based Design** following shadcn/ui patterns with Contestio's established dark theme palette. Drawing inspiration from Discord's notification system and GitHub's activity center for battle invitation interactions.

## Core Design Elements

### A. Color Palette
**Dark Mode Foundation:**
- Primary Background: `192 100% 11%` (#012a36 - sidebar/header)
- Content Background: `192 52% 11%` (#0c1f28 - main content)
- Dropdown Background: `192 52% 9%` (darker than main for depth)
- Card Background: `192 40% 14%` (invitation cards)
- Card Hover: `192 40% 16%`

**Cyan Accent System:**
- Primary Cyan: `186 100% 45%` (CTAs, highlights)
- Cyan Muted: `186 80% 35%` (secondary elements)
- Cyan Subtle: `186 60% 25%` (hover states)

**Status & Interaction:**
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