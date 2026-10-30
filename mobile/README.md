# Vaidik Dhara Mobile App

A React Native mobile application for connecting customers with spiritual advisors for online consultations and religious ceremonies.

## Features

- **Authentication**: OTP-based mobile verification with biometric support
- **Home Screen**: Browse featured pujas, top gurujis, and quick actions
- **Booking Management**: View and manage puja bookings with status tracking
- **Chat System**: Real-time messaging with gurujis and support
- **Spiritual Journey**: Track spiritual progress with milestone system
- **Profile Management**: User settings, favorites, and account management
- **Video Calls**: Live video consultations with spiritual guides
- **Push Notifications**: Booking updates and reminders

## Getting Started

### Prerequisites

- Node.js 18+ 
- Expo CLI
- iOS device/simulator or Android device/emulator

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on device:**
   - Install Expo Go app on your mobile device
   - Scan the QR code from the terminal
   - Or press 'i' for iOS simulator, 'a' for Android emulator

### Project Structure

```
mobile/
├── src/
│   ├── screens/           # App screens
│   │   ├── AuthScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── BookingScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SpiritualJourneyScreen.tsx
│   │   ├── GurujiDetailScreen.tsx
│   │   └── VideoCallScreen.tsx
│   ├── components/        # Reusable components
│   ├── services/         # API calls and services
│   ├── utils/            # Helper functions
│   └── types/            # TypeScript definitions
├── App.tsx               # Main app component
├── app.json             # Expo configuration
└── package.json         # Dependencies
```

## Key Technologies

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe development
- **React Navigation**: Navigation library
- **React Query**: Data fetching and caching
- **Expo Linear Gradient**: Beautiful gradients
- **React Native Safe Area Context**: Safe area handling

## Features Overview

### Authentication
- Phone number verification
- OTP validation
- Secure session management

### Home Dashboard
- Featured pujas carousel
- Top gurujis listing
- Quick action buttons
- Search functionality

### Booking System
- Filter bookings by status
- Upcoming, completed, cancelled views
- Join video calls for active bookings
- Reschedule and review options

### Chat System
- Real-time messaging
- Online status indicators
- Support chat integration
- Verified guruji badges

### Spiritual Journey
- Progress tracking with milestones
- Animated progress indicators
- Daily inspiration quotes
- Achievement system

### Profile Management
- User stats and metrics
- Settings and preferences
- Payment methods
- Help and support

## Development

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add navigation types to `App.tsx`
3. Register route in navigation stack
4. Update tab navigator if needed

### Styling Guidelines

- Use consistent spacing (multiples of 4px)
- Follow platform-specific design patterns
- Use gradient backgrounds for primary actions
- Maintain color consistency throughout app

## Deployment

### Building for Production

1. **Create production build:**
   ```bash
   expo build:android
   expo build:ios
   ```

2. **Upload to stores:**
   - Follow Expo's deployment guide
   - Configure app store assets
   - Set up push notifications

### Environment Configuration

- Configure API endpoints
- Set up push notification keys
- Add required permissions in app.json

## Next Steps

1. Install dependencies with `npm install`
2. Configure API endpoints
3. Set up push notifications
4. Add real-time video calling
5. Integrate payment processing
6. Add offline mode support
7. Implement deep linking
8. Add analytics tracking

This mobile app provides a complete native experience for the Vaidik Dhara platform, offering all web features optimized for mobile devices.