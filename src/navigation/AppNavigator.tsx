import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import TripDetailsScreen from '../screens/trip/TripDetailsScreen';
import CreateTripScreen from '../screens/trip/CreateTripScreen';
import TeamRosterScreen from '../screens/trip/TeamRosterScreen';
import LiveTrackingScreen from '../screens/map/LiveTrackingScreen';
import CreateRouteScreen from '../screens/trip/CreateRouteScreen'; // Sẽ tạo sau
import AllUpcomingTripsScreen from '../screens/home/AllUpcomingTripsScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={TabNavigator} />
        <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
        <Stack.Screen name="CreateTrip" component={CreateTripScreen} />
        <Stack.Screen name="TeamRoster" component={TeamRosterScreen} />
        <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
        <Stack.Screen name="CreateRoute" component={CreateRouteScreen as any} />
        <Stack.Screen name="AllUpcomingTrips" component={AllUpcomingTripsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
