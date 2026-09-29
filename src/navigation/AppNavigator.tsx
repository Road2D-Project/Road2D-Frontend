import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import TripDetailsScreen from '../screens/trip/TripDetailsScreen';
import CreateTripScreen from '../screens/trip/CreateTripScreen';
import TeamRosterScreen from '../screens/trip/TeamRosterScreen';
import LiveTrackingScreen from '../screens/map/LiveTrackingScreen';
import CreateRouteScreen from '../screens/trip/CreateRouteScreen';
import AllUpcomingTripsScreen from '../screens/home/AllUpcomingTripsScreen';
import ConversationScreen from '../screens/chat/ConversationScreen';
import TabNavigator from './TabNavigator';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * AppNavigator — Root Stack Navigator
 *
 * Cây navigation (xem chi tiết tại src/types/navigation.ts):
 *
 *   Login  →  Home (Tabs)
 *                ├── TabHome       (HomeScreen)
 *                ├── TabMap        (ExploreMapScreen)
 *                ├── TabCommunity  (CommunityScreen)
 *                ├── TabChat       (ChatScreen)
 *                └── TabProfile    (ProfileScreen)
 *          →  TripDetails
 *          →  CreateTrip  →  TeamRoster  →  LiveTracking
 *          →  CreateRoute
 *          →  AllUpcomingTrips
 *
 * Quy tắc:
 * - initialRouteName='Login': mọi session bắt đầu từ Login (sẽ thay bằng auth check ở Phase 2)
 * - headerShown: false toàn bộ — mỗi screen tự quản lý header của mình
 * - Thêm screen mới → khai báo kiểu trong RootStackParamList trước
 */
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        {/* Auth */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Main (Tabs) */}
        <Stack.Screen name="Home" component={TabNavigator} />

        {/* Trip flow */}
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
        <Stack.Screen name="TeamRoster" component={TeamRosterScreen} />
        <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />

        {/* Route flow */}
        <Stack.Screen name="CreateRoute" component={CreateRouteScreen} />

        {/* List screens */}
        <Stack.Screen name="AllUpcomingTrips" component={AllUpcomingTripsScreen} />

        {/* Chat */}
        <Stack.Screen name="Conversation" component={ConversationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
