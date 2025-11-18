# Overview

Contestio is a comprehensive live fishing competition platform for managing and viewing competitive fishing events. It offers a multi-role system for spectators, organizers, and referees, featuring real-time competition tracking, team management, catch recording, and live leaderboards with WebSocket integration.

The platform is expanding with a "Fishing Diary" module, providing personal catch logging with freemium tiers (FREE: 1 trip/20 catches; PREMIUM: unlimited, battles). Key recent developments include instant catch saving with background photo uploads, a systematic dark theme rollout, a comprehensive weather forecast module with intelligent location handling and a premium "Fish Activity Index", and a favorites system for competitions and teams. The battle system has been enhanced with automatic catch assignment and minimum weight filtering, alongside critical bug fixes for invitation acceptance. The login experience has been optimized for direct redirection to the diary.

## Recent Favorites System Implementation (November 18, 2025)
- **Toggle Favorites**: Users can mark competitions and teams as favorites from detail pages via heart button
- **Favorites Page**: Dedicated `/favorites` page displays all favorited competitions and teams with removal functionality
- **Navigation Integration**: Heart icon link in navigation header for quick access to favorites
- **Authentication Guards**: Favorite buttons and queries properly gated with `isAuthenticated && !authLoading` checks
- **Production-Ready Cache Management**: 
  - Query keys include `user?.id` for proper cache partitioning per user
  - Mutations capture stable `userId` in `onMutate` context to prevent cache desync across auth transitions
  - Optimistic updates with proper rollback on error using `onMutate` context
  - Cache invalidation targets all related queries (favorites, competitions, teams)
- **Notification Filtering**: Notification preferences support filtering by favorite competitions/teams (already implemented)
- **Technical Implementation**: TanStack Query with proper authentication timing handling, avoiding 401 spam and cache inconsistencies

## Recent Battle Finish Functionality (November 16, 2025)
- **Battle Termination Feature**: Implemented "Ukončiť Battle" (Finish Battle) functionality for battle owners
- **Ownership-Gated UI**: Only trip owners see the finish button when battle status is "active"
- **Backend Enhancement**: Added `isOwner` flag to `GET /api/diary/battles/:id` response for simplified frontend ownership checks
- **Authorization**: Server-side ownership validation via `storage.updateDiaryBattle` → `getDiaryBattle` → `checkTripOwnership`
- **Status Update**: Battle owners can finish battles via `PUT /api/diary/battles/:id` with `{ status: "finished" }`
- **UI Flow**: Confirmation dialog → Status update → Redirect to archive → Toast notification
- **Cache Management**: Automatically invalidates battle detail, catches, battle list, and archive queries after successful finish
- **Archive Integration**: Finished battles appear in `/diary/battles/archive` page
- **Automatic Battle Finish**: Background scheduler runs every 60 seconds to automatically finish expired battles
  - Scheduler checks for battles where `status === "active"` and `endAt < now`
  - Automatically calculates final results using `calculateBattleResults` with premium check bypassed
  - Broadcasts WebSocket notification (`battle_finished`) to all participants
  - Logs each auto-finished battle with battle name and ID
  - Works for both premium and free user trip owners

## Recent Password Reset Implementation (November 16, 2025)
- **Secure Password Reset Flow**: Implemented email-based password reset using time-limited tokens (24h expiration)
- **Admin-triggered reset**: Admins can trigger password reset from user detail page (`/admin/users/:userId`)
- **Backend endpoints**: 
  - `POST /api/admin/users/:userId/reset-password` - Admin triggers reset, generates token, sends email
  - `POST /api/auth/reset-password` - User submits new password with token
- **Frontend page**: `/reset-password` - User-facing page for entering new password via email link
- **Email service**: Uses EmailService (server/utils/email.ts) with nodemailer
- **⚠️ EMAIL CONFIGURATION REQUIRED**: Email functionality requires either:
  - SMTP credentials: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (env vars)
  - OR SendGrid API key: SENDGRID_API_KEY (recommended, simpler setup)
- **Security**: Passwords validated (min 7 chars, special char required), hashed with bcrypt, tokens expire after 24h
- **Token reuse**: Reuses existing email verification token infrastructure (verificationToken, verificationTokenExpires fields)

## Recent Battle Statistics Dashboard (November 17, 2025)
- **Comprehensive Post-Battle Analytics**: Finished battles now display extensive statistics and visualizations
- **Winner Announcement**: Large winner card with trophy emoji, final score, and personalized "Gratulujeme!" badge for the winner
- **Personal Results Card**: Shows user's position, final score, catch count, biggest catch, and score gap from winner
- **Visual Charts** (Recharts integration):
  - Bar chart comparing all participant scores with color-coding (gold for winner, primary for user, gray for others)
  - Pie chart showing fish types distribution with catch counts and weights
  - Both charts respect battle mode (integers for most_fish, decimals for weight modes)
- **Battle Insights**: Fun facts including total fish count, most active angler, biggest catch, competition closeness indicator
- **Mode-Specific Formatting**: All score displays properly format based on battle.rules.mode:
  - most_fish: integers with "ks" unit (e.g., "3 ks")
  - Weight modes: one decimal with "kg" unit (e.g., "25.3 kg")
  - Applied to leaderboard, winner card, personal stats, tooltips, and insights
- **Smart Guards**: Zero score gaps hidden, participant count checks prevent runtime errors
- **Conditional UI**: Statistics only appear when battle.status === "finished", active battles show time remaining

## Recent Battle Notifications System (November 17, 2025)
- **4 Notification Types**: Battle starting (15 min before), battle ending (30 min with leader), new catch from opponent, battle finished with results
- **NotificationService Methods**: notifyBattleStarting, notifyBattleEnding, notifyBattleCatchAdded, notifyBattleFinished
- **Battle Notification Scheduler**: Runs every 60s with 1-minute time windows to prevent duplicates
- **Integration Points**: Catch creation endpoint, auto-finish scheduler, manual finish endpoint
- **Personalized Messages**: Winner gets "Vyhrali ste!", others see their position and score gap
- **WebSocket + Push**: Dual notification delivery with VAPID infrastructure

## Recent Battle Score Fix (November 17, 2025)
- **CRITICAL FIX**: Battle scores were showing 0 kg because catches were marked `verified=false` while battle rules required `includeOnlyVerified: true`
- **Auto-verification**: Catches created during active battles are now automatically verified (`verified=true`) in POST /api/diary/catches
- **Logic**: Server detects when battleId is assigned (catch created during active battle timeframe) and sets verified=true
- **Historical fix**: Updated 6 existing catches in "Októbrový masaker na šírave" battle to verified=true via SQL
- **Results recalculation**: Created and ran scripts/recalculate-battles.ts to update all 3 finished battles
- **Outcome**: Battle archive now displays correct scores (e.g., "Októbrový masaker" shows 25.3kg winner score)
- **Design rationale**: User-created catches with photos during battles are trusted content and should count in scoring

## Recent Battle Archive Display Fix (November 16, 2025)
- **Fixed getAllUserBattles()**: Now returns battles where user is EITHER trip owner OR participant
- **Removed PREMIUM check**: FREE users can now see battles where they participate (when invited)
- **SQL participant filtering**: Uses `jsonb_array_elements` with EXISTS to match userId and userName in participants array
- **Duplicate prevention**: Participant query excludes owned trips using `not(inArray())` for safe parameterization
- **Mock data removed**: Removed all mock battle data from battle-index.tsx and battle-archive.tsx
- **Auto cache invalidation**: Added `useEffect` hooks to invalidate stale React Query cache on page mount
- **Archive now shows real data**: Battle archive and battle index cards display actual finished battles from API

## Recent Battle Invitation Fixes (October 13-14, 2025)
- **CRITICAL FIX**: Accept endpoint now properly adds participant to battle.participants array before updating invitation status
- **Fixed ownership bypass**: Accept endpoint queries battle directly from DB without trip ownership validation (invited users don't own the trip)
- **Fixed invitation list**: Endpoint defaults to returning only 'pending' status invitations (accepted/rejected no longer reappear)
- **Fixed battle visibility for participants**: `/api/diary/battles/active` returns battles where user is EITHER trip owner OR participant
- **Fixed FREE user participation**: FREE users can now be invited and participate in battles (they see battles where they're participants, even though they can't create their own battles). The endpoint gracefully handles premium check failures when fetching owned battles.
- **Cache invalidation**: Added to mutation error handlers to prevent stale UI state
- **Participant deduplication**: By userId or name to prevent duplicates

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