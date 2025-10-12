# Overview

Contestio is a comprehensive live fishing competition platform designed for managing and viewing competitive fishing events. The application provides a multi-role system with distinct interfaces for spectators, organizers, and referees. The platform features real-time competition tracking, team management, catch recording, and live leaderboards with WebSocket integration for instant updates.

## NEW: Fishing Diary Module (In Development)
Expanding platform with comprehensive diary functionality featuring FREE/PREMIUM tiers:
- **Phase 1 ✅ COMPLETED**: Secure database foundation and storage layer with complete IDOR protection, freemium system (FREE: 1 trip/20 catches, PREMIUM: unlimited + battles), pricing strategy 4.90€/month or 49€/year
- **Phase 2 ✅ COMPLETED**: Basic UI implementation with /diary pages, forms, and instant catch save with background photo upload
- **Phase 3 PLANNED**: Stripe integration for premium subscriptions
- **Phase 4 PLANNED**: Advanced statistics, charts, and hero section redesign

### ✅ COMPLETED: Instant Catch Save with Background Photo Upload (September 2024)
Ultra-responsive catch creation with optimized photo handling:
- **Instant Save**: Catch saved to database immediately without waiting for photo upload (< 500ms response)
- **Client-side Optimization**: Images automatically resized to 2048px and compressed (85% quality) before upload
- **Background Processing**: Photos uploaded and processed asynchronously after catch is saved
- **Parallel Upload**: Multiple photos uploaded simultaneously for maximum performance
- **Real-time UI Updates**: Loading spinners show during photo processing, WebSocket updates when complete
- **Progressive Enhancement**: Photo processing happens in background with 6 optimized variants (WebP + JPEG at 400w, 800w, 1200w)
- **User Experience**: Toast notifications guide user through save → upload → processing flow

## ✅ COMPLETED: Dark Theme Rollout (December 2024)
Complete systematic dark theme implementation across entire application:
- **Design System**: Established CSS variable-based theming using #012a36 (sidebar/header) and #0c1f28 (main content) color palette
- **Component Coverage**: All components converted from hard-coded Tailwind colors to theme tokens (NavigationHeader, Sidebar, Competition cards, Auth pages, Landing/Home pages)
- **Accessibility**: WCAG AA compliance maintained with contrast ratios ≥5.0:1 throughout dark theme
- **Architecture**: Zero dark: overrides remaining, full reliance on bg-background, text-foreground, text-primary, etc. design tokens
- **User Experience**: Seamless light/dark mode switching with consistent visual hierarchy and branding

## ✅ COMPLETED: Weather Forecast Module (October 2025)
Comprehensive weather forecasting system for fishing trip planning with intelligent location handling:
- **Smart Location System**: 
  - Auto-loads last used location on return visits via localStorage
  - First-time visitors: automatic GPS location request with graceful fallback
  - Manual search with autocomplete for worldwide locations
  - "My Location" button for quick GPS access
- **7-Day Forecast Display**:
  - Interactive day selection with detailed hourly breakdown
  - Visual weather chart (temperature + precipitation combined view)
  - Horizontal hourly scroll with wind speed, rotating directional arrows, and condition icons
- **PREMIUM Fish Activity Index**: Algorithm-based fishing conditions score (0-100) using pressure, temperature, precipitation, and wind data
- **Detailed Conditions Widget**: 6-metric grid showing pressure, humidity, rain chance, sunrise/sunset, and moon phase
- **Slovak Localization**: Complete translation including moon phases and wind directions (N→S, NE→SV, etc.)
- **UX Enhancements**: 
  - Empty state with friendly message when no location selected
  - Skeleton loaders during data fetch
  - Error handling with user-friendly messages
- **WeatherAPI Integration**: Backend proxy with location search and 7-day forecast endpoints

## ✅ COMPLETED: Battle System Enhancements (October 2025)
Fixed critical battle functionality with automatic catch assignment and minimum weight filtering:
- **Automatic Battle Creator as Participant**: Creator automatically added to battle participants with deduplication logic (filters by userId or name)
- **Automatic Catch Assignment**: New catches automatically assigned to active battles via battleId column (backward compatible - old catches without battleId won't appear in battles)
- **Battle Live Feed**: Direct battleId-based lookup replaces complex participant/time filtering for reliable catch retrieval
- **Minimum Weight Filtering**: 
  - Leaderboard scoring respects battle.rules.minWeightKg - only valid catches count toward scores
  - Live feed displays all catches but visually marks invalid ones (opacity, muted colors, "Nezapočítava sa" badge)
  - All scoring modes (most_fish, total_weight, biggest_fish, best_3_fish, best_5_fish) use filtered validCatches
- **Database Schema**: Added battleId column to diary_catches for direct battle-catch relationships
- **Edge Case Handling**: Safe deduplication (handles missing userId/name), empty participants, malformed entries

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with role-based navigation
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Real-time Updates**: Custom WebSocket hook for live data synchronization
- **Authentication**: Session-based authentication integrated with Replit Auth

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **API Design**: RESTful API with structured error handling and logging middleware
- **Real-time Communication**: WebSocket server for live competition updates
- **Authentication**: Replit Auth integration with OpenID Connect and session management
- **File Handling**: Multer middleware for image uploads with type validation
- **Database Access**: Drizzle ORM for type-safe database operations

## Database Design
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: PostgreSQL-based session store using connect-pg-simple
- **Data Models**: Comprehensive schema for users, competitions, teams, catches, and referees
- **Relationships**: Well-defined foreign key relationships between entities

## Authentication & Authorization
- **Primary Method**: Replit Auth with OpenID Connect protocol
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Role-based Access**: Three-tier role system (public, organizer, referee)
- **Route Protection**: Client-side and server-side route guards based on user roles

## Real-time Features
- **WebSocket Integration**: Automatic cache invalidation and live updates
- **Event Broadcasting**: Real-time catch submissions and leaderboard updates
- **Connection Management**: Automatic reconnection with exponential backoff
- **Data Synchronization**: TanStack Query integration for seamless state updates

## File Management
- **Upload Handling**: Multer-based file upload with size and type restrictions
- **Image Processing**: Support for JPEG, PNG, and GIF formats with 5MB limit
- **Storage Strategy**: Local file system storage with organized directory structure

## Development Environment
- **Build System**: Vite with React plugin and development error overlay
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Development Tools**: Hot module replacement and runtime error handling
- **Code Organization**: Monorepo structure with shared schema between client and server

# External Dependencies

## Database & Hosting
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Infrastructure**: Integrated hosting and authentication services

## UI & Styling
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Comprehensive icon library for consistent iconography

## Form & Validation
- **React Hook Form**: Performant form library with validation
- **Zod**: TypeScript-first schema validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod

## Development & Build Tools
- **Vite**: Fast build tool with development server
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds

## Real-time & Networking
- **WebSocket (ws)**: Native WebSocket implementation for real-time features
- **TanStack Query**: Powerful data fetching and caching library

## Authentication
- **OpenID Client**: Standard-compliant authentication integration
- **Passport**: Authentication middleware for Express
- **Express Session**: Session management with PostgreSQL storage