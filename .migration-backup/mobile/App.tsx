import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import BookingScreen from './src/screens/BookingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import GurujiDetailScreen from './src/screens/GurujiDetailScreen';
import VideoCallScreen from './src/screens/VideoCallScreen';
import SpiritualJourneyScreen from './src/screens/SpiritualJourneyScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PujasListScreen from './src/screens/PujasListScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import HowItWorksScreen from './src/screens/HowItWorksScreen';
import BecomeGurujiScreen from './src/screens/BecomeGurujiScreen';
import CreateBookingScreen from './src/screens/CreateBookingScreen';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  GurujiDetail: { gurujiId: string };
  VideoCall: { roomId: string };
  BookingDetail: { bookingId: string };
  PujaDetail: { pujaId: string };
  Dashboard: undefined;
  Notifications: undefined;
  PujasList: undefined;
  Services: undefined;
  HowItWorks: undefined;
  BecomeGuruji: undefined;
  CreateBooking: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Booking: undefined;
  Journey: undefined;
  Chat: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Tab Navigator Component
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Booking') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Journey') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Booking" 
        component={BookingScreen} 
        options={{ title: 'Bookings' }}
      />
      <Tab.Screen 
        name="Journey" 
        component={SpiritualJourneyScreen} 
        options={{ title: 'Journey' }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ title: 'Chat' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Main App Component
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Auth"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Auth" component={AuthScreen} />
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen 
                name="GurujiDetail" 
                component={GurujiDetailScreen}
                options={{
                  headerShown: true,
                  title: 'Guruji Profile',
                  headerBackTitleVisible: false,
                }}
              />
              <Stack.Screen 
                name="VideoCall" 
                component={VideoCallScreen}
                options={{
                  headerShown: true,
                  title: 'Video Call',
                  headerBackTitleVisible: false,
                }}
              />
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{
                  headerShown: true,
                  title: 'Dashboard',
                  headerBackTitleVisible: false,
                }}
              />
              <Stack.Screen 
                name="Notifications" 
                component={NotificationsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="PujasList" 
                component={PujasListScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="Services" 
                component={ServicesScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="HowItWorks" 
                component={HowItWorksScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="BecomeGuruji" 
                component={BecomeGurujiScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="CreateBooking" 
                component={CreateBookingScreen}
                options={{
                  headerShown: false,
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
