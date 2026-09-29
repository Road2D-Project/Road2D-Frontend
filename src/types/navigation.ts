/**
 * navigation.ts
 * Type-safe navigation parameter definitions cho toàn bộ app.
 * Mọi screen type-check navigation.navigate() dựa trên file này.
 *
 * CÂY NAVIGATION:
 *
 * RootStack (NativeStack)
 * ├── Login              — LoginScreen (không nhận params)
 * ├── Home               — TabNavigator (không nhận params)
 * │   ├── TabHome        — HomeScreen
 * │   ├── TabMap         — ExploreMapScreen
 * │   ├── TabCommunity   — CommunityScreen
 * │   ├── TabChat        — ChatScreen
 * │   └── TabProfile     — ProfileScreen
 * ├── TripDetails        — TripDetailsScreen
 * ├── CreateTrip         — CreateTripScreen
 * ├── TeamRoster         — TeamRosterScreen
 * ├── LiveTracking       — LiveTrackingScreen
 * ├── CreateRoute        — CreateRouteScreen
 * └── AllUpcomingTrips   — AllUpcomingTripsScreen
 */

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';

// ─────────────────────────────────────────────
// Root Stack (NativeStack)
// ─────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;           // chứa TabNavigator bên trong
  TripDetails: undefined;    // TODO Phase 3: thêm { tripId: string }
  CreateTrip: undefined;     // TODO Phase 3: thêm { routeId?: string }
  TeamRoster: undefined;     // TODO Phase 3: thêm { tripId: string }
  LiveTracking: undefined;   // TODO Phase 3: thêm { tripId: string }
  CreateRoute: undefined;
  AllUpcomingTrips: undefined;
  Conversation: { chatId: string; chatName: string };
};

// ─────────────────────────────────────────────
// Bottom Tab Navigator
// ─────────────────────────────────────────────
export type TabParamList = {
  TabHome: undefined;
  TabMap: undefined;
  TabCommunity: undefined;
  TabChat: undefined;
  TabProfile: undefined;
};

// ─────────────────────────────────────────────
// Navigation props cho từng screen
// ─────────────────────────────────────────────

// Stack-only screens
export type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;
export type TripDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TripDetails'>;
export type CreateTripScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateTrip'>;
export type TeamRosterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TeamRoster'>;
export type LiveTrackingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'LiveTracking'>;
export type CreateRouteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateRoute'>;
export type AllUpcomingTripsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AllUpcomingTrips'>;

// Tab screens — có thể navigate cả trong Tab lẫn trong Stack nên dùng CompositeNavigationProp
export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'TabHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type ExploreMapScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'TabMap'>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type CommunityScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'TabCommunity'>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type ChatScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'TabChat'>,
  NativeStackNavigationProp<RootStackParamList>
>;
export type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'TabProfile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// ─────────────────────────────────────────────
// Route props (dùng khi cần đọc params)
// ─────────────────────────────────────────────
export type TripDetailsRouteProp = RouteProp<RootStackParamList, 'TripDetails'>;
export type CreateTripRouteProp = RouteProp<RootStackParamList, 'CreateTrip'>;
export type TeamRosterRouteProp = RouteProp<RootStackParamList, 'TeamRoster'>;
export type LiveTrackingRouteProp = RouteProp<RootStackParamList, 'LiveTracking'>;
