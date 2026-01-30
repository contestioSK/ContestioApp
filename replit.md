# Overview

Contestio is a live fishing competition platform designed for spectators, organizers, and referees, offering real-time competition tracking, team management, catch recording, and live leaderboards. The platform is expanding with a "Fishing Diary" module for personal catch logging, including freemium tiers (FREE: 1 trip/20 catches; PREMIUM: unlimited, battles) and a battle system.

Key capabilities include:
- Instant catch saving with background photo uploads.
- Dark theme support.
- Weather forecast module with a premium "Fish Activity Index".
- Favorites system for competitions and teams.
- Clickable statistics cards on the diary dashboard.
- Enhanced toast notifications with emoji icons and color-coded success states.
- Global Floating Action Button (FAB) for instant catch entry.
- Enhanced battle system with automatic catch assignment, minimum weight filtering, and optimized login.
- "Scan-and-Go" QR code feature for quick onboarding to competitions and battles.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite.
- **Routing**: Wouter for client-side routing with role-based navigation.
- **State Management**: TanStack Query for server state management and caching.
- **Styling**: Tailwind CSS with shadcn/ui component library.
- **Real-time Updates**: Custom WebSocket hook.
- **Authentication**: Session-based authentication with Replit Auth.
- **Design System**: Unified 10-color palette for consistent visualization (`client/src/lib/colors.ts`). Dark mode uses shade 500, Light mode uses shade 600.

### Contestio Obsidian Ember v2.0 Design Manual (January 2025)
**Philosophy**: Profesionálny rybársky prístroj. Farba = Význam. UI = Ticho.

**Color Tokens:**
- Dark: bg `#0B1C2F`, surface `#0F172A`, border `#1E293B`, text `#F8FAFC`, accent `#F97316`
- Light: bg `#F8FAFC`, surface `#FFFFFF`, border `#E2E8F0`, text `#0F172A`, accent `#C2410C`

**Light Mode Policy (LOCKED):**
- Contestio je navrhnuté výhradne pre tmavé prostredie
- Light mode slúži VÝLUČNE na vývojové účely (calibration, testovanie kontrastu)
- NIE JE súčasťou produkčného MVP
- V produkcii: žiadny prepínač, ani skrytý
- V kóde používaj: `DEV_LIGHT_MODE` alebo `CALIBRATION_MODE` (nikdy "Light mode")

**Typography Rules:**
- `font-black italic` (900) → ONLY for H1 Hero headlines
- `font-bold` (700) → Section headers, card titles
- `font-medium font-mono` (500) → Data values, numbers, percentages (in Apex Orange #F97316)

**Icon Colors:**
- Icons use `text-muted-foreground` (gray), NOT orange
- Apex Orange (#F97316) is reserved for DATA and INTERACTION only

**Border Radius (LOCKED):**
- Use standard Contestio values: `rounded-xl` (12px), `rounded-lg` (8px)
- Do NOT use larger values like `rounded-[2.5rem]` or `rounded-3xl` from design manual
- Reference: `/diary/seasonal-goals` for correct styling

**Forbidden:**
- No gradients on buttons and cards
- No pastel or "candy" colors
- No Black weight (900) for regular text

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **API Design**: RESTful API with structured error handling.
- **Real-time Communication**: WebSocket server.
- **Authentication**: Replit Auth integration with OpenID Connect.
- **File Handling**: Multer for image uploads.
- **Database Access**: Drizzle ORM for type-safe operations.

## Database Design
- **Database**: PostgreSQL with Neon serverless hosting.
- **Schema Management**: Drizzle Kit for migrations.
- **Session Storage**: PostgreSQL-based session store.
- **Data Models**: Comprehensive schema for users, competitions, teams, catches, battles, and referees.

## Authentication & Authorization
- **Primary Method**: Replit Auth with OpenID Connect.
- **Session Management**: Server-side sessions in PostgreSQL.
- **Role-based Access**: Three-tier system (public, organizer, referee).
- **Route Protection**: Client-side and server-side guards.

## Real-time Features
- **WebSocket Integration**: Automatic cache invalidation and live updates for catch submissions and leaderboard updates.
- **Data Synchronization**: TanStack Query integration.
- **Polling Strategy**: Visibility-aware polling using `useVisibilityAwarePolling` hook, pausing when the tab is hidden or offline. Polling intervals vary from 5s (Referee Live) to 60s (Organizer), with static data having a 5-minute stale time.

### Server-side Cache (January 2025)
In-memory cache for high-frequency read endpoints (`server/cache.ts`):

**Cached Endpoints:**
- `/api/competitions/:id/leaderboard` - 5s TTL
- `/api/competitions/:id/catches` - 3s TTL (referees need faster updates)
- `/api/competitions/:id/sectors/:sector/statistics` - 5s TTL
- `/api/competitions/:id/sectors/leaderboards` - 5s TTL

**Cache Invalidation Map:**
| Akcia | Invaliduje |
|-------|-----------|
| `createCatch` | leaderboard, catches, sectorStats, sectorLeaderboards |
| `resetCatches` / `deleteCatches` | leaderboard, catches, sectorStats, sectorLeaderboards |
| `bulkImport` | leaderboard, catches, sectorStats, sectorLeaderboards |

Note: `verifyCatch` and `updateWeight` endpoints don't exist - catches are verified automatically at creation.

**Benefits:**
- One DB calculation serves thousands of viewers
- Prevents database overload during live competitions
- 5s delay is acceptable for spectators (not real-time critical)

### WebSocket Architecture (January 2025)
**Role-based Access:**
- `referee`, `organizer`, `admin` → WebSocket connection allowed
- `user` (viewers) → WebSocket denied, use polling + cache instead

**Rationale:**
- Max 10-20 active WebSocket connections (referees/organizers only)
- Viewers (potentially thousands) use visibility-aware polling with server-side cache
- Prevents connection overload and simplifies debugging

## File Management
- **Upload Handling**: Multer-based file upload with size (5MB limit) and type restrictions (JPEG, PNG, GIF).
- **Storage Strategy**: Local file system storage for original files.
- **Image Processing**: Robust background photo processing system (`PhotoJobQueue`, `ImageService`) creating WebP/JPEG variants (200w, 800w, 1920w) and storing them in `attached_assets/diary_photos/{userId}/`. Includes auto-recovery for stuck photos and frontend fallbacks.

## Email System
- Automated email flow for competitions: Registration Confirmation, Setup Reminder (24-48h after registration), and Day-Before Competition emails.
- Email templates support dark theme and are in Slovak.

## Payment Integration
- **Stripe Integration**: Supports one-time payments for competitions (Basic, Pro, Premium plans) and recurring subscriptions for Diary Premium (Monthly, Yearly plans).
- **Webhook Handling**: Processes `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed` events to manage subscription status and user tiers.
- **User Sync**: `isPremium`, `userTier`, and `premiumExpiresAt` fields are synced with Stripe subscription status.

## Onboarding System
- 3-step onboarding flow for new users: Fishing Style, Main Goal, and Visual Preference, stored in `users.preferences` as JSONB. Users can skip.

## Navigation System
- Global Top Navigation Shell (`TopNavigationShell.tsx`) for authenticated pages, including a fixed header (`TopBar.tsx`) with glassmorphism effect.
- Components include `NotificationsDropdown`, `RoleSwitcher`, `UserMenu`, and `MobileMenu` (hamburger → Sheet).
- Role-specific dashboards (diary/referee-interface/organizer) are accessible via logo click.

# External Dependencies

## Database & Hosting
- **Neon Database**: Serverless PostgreSQL hosting.
- **Replit Infrastructure**: Integrated hosting and authentication.

## UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Form & Validation
- **React Hook Form**: Performant form library.
- **Zod**: TypeScript-first schema validation.
- **Hookform Resolvers**: Integration with Zod.

## Real-time & Networking
- **WebSocket (ws)**: Native WebSocket implementation.
- **TanStack Query**: Data fetching and caching library.

## Authentication
- **OpenID Client**: Standard-compliant authentication integration.
- **Passport**: Authentication middleware.
- **Express Session**: Session management.

## Payments
- **Stripe**: Payment gateway for one-time competition payments and recurring diary subscriptions.

## QR Code Generation
- **qrcode**: Library for generating QR codes.

# Tech Debt Notes

## TeamOverviewContent - Variant A (January 2025)
**Status**: Planned future improvement

Currently `TeamOverviewContent.tsx` is a shared component used only in competition-detail.tsx modals. The standalone team-detail.tsx page has its own layout (multi-column grid).

**Future improvement (Variant A)**:
- Refactor `TeamOverviewContent` to support two modes:
  - `compact` mode: for modals (current behavior)
  - `full` mode: for standalone page (expanded layout with all details)
- Parent controls layout via prop, component remains "dumb"
- Benefits: Single source of truth for team visualization, consistent UX

**Current workaround (Variant B)**:
- Modal = "quick look" (TeamOverviewContent)
- Page = "deep dive" (team-detail.tsx with full grid)
- Navigation and copy should make this distinction clear to users