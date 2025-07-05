# GurujiConnect - Spiritual Services Platform

## Overview

GurujiConnect is a comprehensive spiritual services platform built with a modern tech stack. It serves as a marketplace connecting customers with verified spiritual guides (Gurujis) for online and offline puja services, consultations, and religious ceremonies. The platform features both a web application (React frontend with TypeScript, Express.js backend) and native mobile applications (React Native with Expo) designed to use PostgreSQL with Drizzle ORM for data management.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom spiritual themes and shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Management**: React Hook Form with Zod validation
- **Responsive Design**: Mobile-first approach with dedicated mobile components

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with bcrypt for password hashing
- **Real-time Communication**: Socket.io for live features
- **API Design**: RESTful API endpoints with proper error handling
- **File Structure**: Modular architecture with separate routes, services, and storage layers

### Key Components

1. **Authentication System**
   - OTP-based mobile verification
   - Role-based access control (Customer, Guruji, Admin)
   - Session management with secure cookies

2. **Booking System**
   - Multi-stage booking process
   - Booking request notifications to Gurujis
   - Status tracking and management

3. **Payment Integration**
   - Stripe integration for secure payments
   - Multiple payment status handling
   - Revenue tracking for analytics

4. **Admin Dashboard**
   - Comprehensive analytics with charts and metrics
   - User management and verification
   - Puja configuration and management

5. **Spiritual Journey Tracker**
   - Personalized spiritual progress tracking
   - Animated milestones and achievements
   - User journey analytics

6. **Real-time Features**
   - Video conferencing capabilities
   - Live chat system
   - WebRTC peer-to-peer connections

## Data Flow

1. **User Registration/Login Flow**
   - Mobile OTP verification → User creation → Session establishment → Role-based dashboard redirect

2. **Booking Flow**
   - Puja selection → Booking form → Payment → Guruji notification → Booking confirmation

3. **Admin Analytics Flow**
   - Data aggregation → Real-time metrics calculation → Dashboard visualization

4. **Notification System**
   - Event triggers → Notification creation → Multi-channel delivery (SMS, Email, Push)

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Authentication**: bcrypt for secure password hashing
- **Payment Processing**: Stripe for secure payment handling
- **Real-time Communication**: Socket.io for live features
- **Video Conferencing**: WebRTC with SimplePeer for peer-to-peer video calls

### Development Dependencies
- **Build Tools**: Vite, ESBuild for fast compilation
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESLint, Prettier for consistent code style
- **Testing**: React Testing Library, Vitest for unit testing

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds optimized static assets to `dist/public`
2. **Backend**: ESBuild compiles TypeScript server code to `dist/index.js`
3. **Database**: Drizzle migrations handle schema changes

### Environment Configuration
- **Development**: Uses tsx for hot reloading and development server
- **Production**: Compiled JavaScript with NODE_ENV=production
- **Database**: Neon PostgreSQL with connection pooling

### Deployment Steps
1. Install dependencies with `npm install`
2. Build frontend and backend with `npm run build`
3. Run database migrations with `npm run db:push`
4. Start production server with `npm start`

## Mobile Application

### React Native Implementation
The platform now includes a complete React Native mobile application built with Expo:

**Core Features:**
- Native iOS and Android applications
- Bottom tab navigation with 5 main screens
- OTP-based authentication with biometric support
- Home dashboard with featured pujas and gurujis
- Booking management with status tracking
- Real-time chat system with online indicators
- Spiritual journey tracking with progress milestones
- Profile management with settings and statistics
- Video calling capabilities
- Push notification support

**Technical Stack:**
- React Native with Expo SDK 50
- TypeScript for type safety
- React Navigation for routing
- React Query for data management
- Linear gradients and animations
- Native device features (camera, location, notifications)

**Project Structure:**
```
mobile/
├── src/screens/           # All app screens
├── App.tsx               # Main navigation
├── app.json             # Expo configuration
└── package.json         # Dependencies
```

**Getting Started:**
1. `cd mobile && npm install`
2. `npm start`
3. Use Expo Go app to test on device

## Changelog

```
Changelog:
- July 05, 2025. Initial setup
- July 05, 2025. Added comprehensive React Native mobile application with all web features
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```