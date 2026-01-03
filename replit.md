# Overview

Contestio is a live fishing competition platform offering multi-role management for spectators, organizers, and referees. It features real-time competition tracking, team management, catch recording, and live leaderboards with WebSocket integration.

The platform is expanding with a "Fishing Diary" module for personal catch logging, including freemium tiers (FREE: 1 trip/20 catches; PREMIUM: unlimited, battles). Recent key features include instant catch saving with background photo uploads, a dark theme, a weather forecast module with a premium "Fish Activity Index", a favorites system for competitions and teams, clickable statistics cards on the diary dashboard, enhanced toast notifications with emoji icons and color-coded success states, and a global Floating Action Button (FAB) for instant catch entry across all diary pages. The battle system has been enhanced with automatic catch assignment, minimum weight filtering, and optimized login.

## QR Code Sharing (December 2024)

"Scan-and-Go" QR code feature for quick onboarding:
- **Competitions**: Organizers can share QR codes linking to competition registration page
- **Battles**: Users can share QR codes to invite friends to battles
- **Components**: `QRShareDialog.tsx` reusable component with copy link, download PNG, and native share
- **API**: `GET /api/competitions/:id/qr` and `GET /api/diary/battles/:id/qr` endpoints using `qrcode` library

## Design System (December 2024)

A unified 10-color palette has been implemented in `client/src/lib/colors.ts` for consistent visualization across the application. Key points:
- **Dark mode**: Uses shade 500 (brighter, neon effect)
- **Light mode**: Uses shade 600 (darker for better contrast)
- Colors: Lime (brand), Blue (water), Amber (attention), Purple (premium), Rose (critical), Cyan (fresh), Emerald (nature), Orange (action), Indigo (night), Fuchsia (tech)
- Use `getChartColorByIndex(index)` for Recharts and `BG_CLASSES_DARK/LIGHT` arrays for Tailwind

## Email System (January 2025)

Competition email flow with 3 automated emails:

1. **Email 1 - Registration Confirmation**: Sent immediately when organizer submits competition registration form
   - Function: `sendRegistrationConfirmationEmail()`
   - Trigger: On competition creation in routes.ts

2. **Email 2 - Setup Reminder**: Sent 24-48h after competition registration
   - Function: `sendCompetitionReminderEmail()`
   - Scheduler: `startCompetitionReminderScheduler()` (runs every 60 minutes)
   - Schema field: `competitions.reminderSentAt`
   - Logic: Sends if `createdAt` is 24+ hours ago AND `reminderSentAt` is null AND status is not 'finished'

3. **Email 3 - Day-Before Competition**: Sent the day before competition starts
   - Function: `sendDayBeforeCompetitionEmail()`
   - Scheduler: `startDayBeforeCompetitionScheduler()` (runs every 60 minutes)
   - Schema field: `competitions.dayBeforeReminderSentAt`
   - Logic: Sends if `startDate` is tomorrow AND `dayBeforeReminderSentAt` is null AND status is not 'finished'/'live'

### Email Templates
- Dark theme: #0c1f28 background, #0f2632 card background
- Orange CTA buttons: #f97316
- All emails in Slovak language

## Stripe Payment Integration (January 2025)

### Competition Payments (One-time)
- **Endpoint**: `POST /api/competitions/:id/pay`
- **Plans**: Basic (€69), Pro (€199), Premium (€599)
- **Flow**: Creates Stripe Checkout session → Webhook confirms payment → Competition status → 'ready'

### Diary Premium Subscriptions (Recurring)
- **Checkout Endpoint**: `POST /api/diary/subscribe`
- **Billing Portal**: `POST /api/diary/subscription/portal`
- **Status Endpoint**: `GET /api/diary/subscription`
- **Plans**: 
  - Monthly: €5.90 (STRIPE_PRICE_MONTHLY env var)
  - Yearly: €59.90 (STRIPE_PRICE_YEARLY env var) - 15% savings
- **Database**: `user_subscriptions` table with `stripeCustomerId`, `stripeSubscriptionId`, `billingInterval`, `cancelAtPeriodEnd`

### Webhook Events Handled
- `checkout.session.completed` - Activates subscription/payment
- `customer.subscription.updated` - Syncs status changes (renewal, cancellation scheduled)
- `customer.subscription.deleted` - Downgrades user to FREE tier
- `invoice.payment_failed` - Marks subscription as past_due

### User Fields Synced
- `users.isPremium` - Boolean premium status
- `users.userTier` - 'FREE' or 'PREMIUM'
- `users.premiumExpiresAt` - Subscription end timestamp

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite
- **Routing**: Wouter for client-side routing with role-based navigation
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Real-time Updates**: Custom WebSocket hook
- **Authentication**: Session-based authentication with Replit Auth

## Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Design**: RESTful API with structured error handling
- **Real-time Communication**: WebSocket server
- **Authentication**: Replit Auth integration with OpenID Connect
- **File Handling**: Multer for image uploads
- **Database Access**: Drizzle ORM for type-safe operations

## Database Design
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations
- **Session Storage**: PostgreSQL-based session store
- **Data Models**: Comprehensive schema for users, competitions, teams, catches, battles, and referees

## Authentication & Authorization
- **Primary Method**: Replit Auth with OpenID Connect
- **Session Management**: Server-side sessions in PostgreSQL
- **Role-based Access**: Three-tier system (public, organizer, referee)
- **Route Protection**: Client-side and server-side guards

## Real-time Features
- **WebSocket Integration**: Automatic cache invalidation and live updates
- **Event Broadcasting**: Real-time catch submissions and leaderboard updates
- **Data Synchronization**: TanStack Query integration

## File Management
- **Upload Handling**: Multer-based file upload with size and type restrictions
- **Image Processing**: Support for JPEG, PNG, GIF with 5MB limit
- **Storage Strategy**: Local file system storage

## Development Environment
- **Build System**: Vite with React plugin
- **Type Safety**: Full TypeScript coverage
- **Code Organization**: Monorepo structure with shared schema

# External Dependencies

## Database & Hosting
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Infrastructure**: Integrated hosting and authentication

## UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Form & Validation
- **React Hook Form**: Performant form library
- **Zod**: TypeScript-first schema validation
- **Hookform Resolvers**: Integration with Zod

## Real-time & Networking
- **WebSocket (ws)**: Native WebSocket implementation
- **TanStack Query**: Data fetching and caching library

## Authentication
- **OpenID Client**: Standard-compliant authentication integration
- **Passport**: Authentication middleware
- **Express Session**: Session management

# Onboarding System

## Current Implementation
- **3-step onboarding flow** for new users after registration
- **Step 1 - Fishing Style**: Kaprárina, Prívlač, Feeder, Muškárenie, Sumčiarina
- **Step 2 - Main Goal**: Súťaženie s kamošmi, Súkromný denník, Analýza a štatistiky
- **Step 3 - Visual Preference**: Minimalistické zoznamy, Grafy a mapy
- **Data storage**: `users.preferences` JSONB column
- **Auto-redirect**: Router guard redirects to `/onboarding` if `onboardingCompleted: false`
- **Skip option**: Users can skip onboarding if they don't want to answer

## Future Personalization Possibilities (Not Yet Implemented)
Based on collected preferences, the UI could be personalized:

1. **By fishingStyle**:
   - Show relevant fish species icons in statistics
   - Pre-select common fish for chosen fishing style
   - Customize tips and content

2. **By mainGoal**:
   - Reorder dashboard cards (battles first vs diary first vs statistics first)
   - Highlight relevant features in navigation
   - Personalize welcome messages

3. **By visualPreference**:
   - Toggle between table/list view and chart/graph view
   - Default visualization mode across the app
   - Compact vs detailed card layouts

# Planned Features (TODO)

## Communication Hub (Priority: Medium)
Kompletný komunikačný modul pre súťaže s 3 tabmi:

1. **Noticeboard (Oficiálne oznamy)**
   - Admin môže písať, tímy len čítajú, verejnosť nemá prístup
   - Tabuľka: `announcements` (id, competition_id, author_id, message, created_at, is_priority)
   - WebSocket event: `new_announcement`

2. **Public Chat (Verejný chat)**
   - Otvorený pre všetkých (admin, tímy, hostia)
   - Tímy majú zvýraznené správy, hostia zadávajú nickname
   - Tabuľka: `public_chat_messages` (id, competition_id, sender_name, sender_id, is_team, message, created_at)
   - Limit: posledných 50 správ
   - WebSocket event: `public_chat_message`

3. **Helpdesk (Podpora)**
   - Súkromný 1:1 kanál medzi tímom a adminom
   - Tabuľka: `support_messages` (id, competition_id, team_id, sender_id, message, created_at, is_read)
   - WebSocket event: `support_message`

Odhadovaný čas: 2-3 hodiny