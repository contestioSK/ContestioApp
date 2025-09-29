# Overview

Contestio is a comprehensive live fishing competition platform designed for managing and viewing competitive fishing events. The application provides a multi-role system with distinct interfaces for spectators, organizers, and referees. The platform features real-time competition tracking, team management, catch recording, and live leaderboards with WebSocket integration for instant updates.

## NEW: Fishing Diary Module (In Development)
Expanding platform with comprehensive diary functionality featuring FREE/PREMIUM tiers:
- **Phase 1 ✅ COMPLETED**: Secure database foundation and storage layer with complete IDOR protection, freemium system (FREE: 1 trip/20 catches, PREMIUM: unlimited + battles), pricing strategy 4.90€/month or 49€/year
- **Phase 2 PLANNED**: Basic UI implementation with /diary pages and forms  
- **Phase 3 PLANNED**: Stripe integration for premium subscriptions
- **Phase 4 PLANNED**: Advanced statistics, charts, and hero section redesign

## ✅ COMPLETED: Dark Theme Rollout (December 2024)
Complete systematic dark theme implementation across entire application:
- **Design System**: Established CSS variable-based theming using #012a36 (sidebar/header) and #0c1f28 (main content) color palette
- **Component Coverage**: All components converted from hard-coded Tailwind colors to theme tokens (NavigationHeader, Sidebar, Competition cards, Auth pages, Landing/Home pages)
- **Accessibility**: WCAG AA compliance maintained with contrast ratios ≥5.0:1 throughout dark theme
- **Architecture**: Zero dark: overrides remaining, full reliance on bg-background, text-foreground, text-primary, etc. design tokens
- **User Experience**: Seamless light/dark mode switching with consistent visual hierarchy and branding

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