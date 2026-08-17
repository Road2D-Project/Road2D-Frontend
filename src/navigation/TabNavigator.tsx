import React from 'react';
import { View, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

import HomeScreen from '../screens/home/HomeScreen';
import ExploreMapScreen from '../screens/map/ExploreMapScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: '#795548',
        tabBarStyle: {
          backgroundColor: '#F9F6F0',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 0,
        },
        tabBarIcon: ({ focused }) => {
          let iconUrl = '';

          // Đổi sang bộ Material (viền dày hơn, cứng cáp hơn bộ iOS)
          const c = focused ? 'FFFFFF' : '795548';
          const style = focused ? 'material' : 'material-outlined';

          if (route.name === 'TabHome') {
            iconUrl = `https://img.icons8.com/${style}/100/${c}/home.png`;
          } else if (route.name === 'TabMap') {
            iconUrl = `https://img.icons8.com/${style}/100/${c}/map.png`;
          } else if (route.name === 'TabCommunity') {
            iconUrl = `https://img.icons8.com/${style}/100/${c}/conference.png`;
          } else if (route.name === 'TabChat') {
            iconUrl = `https://img.icons8.com/${style}/100/${c}/speech-bubble.png`;
          } else if (route.name === 'TabProfile') {
            iconUrl = `https://img.icons8.com/${style}/100/${c}/user.png`;
          }

          return (
            <View
              style={{
                backgroundColor: focused ? colors.primary : 'transparent',
                paddingHorizontal: 22,
                paddingVertical: 3,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Image 
                source={{ uri: iconUrl }} 
                style={{ width: 24, height: 24 }} 
                resizeMode="contain" 
              />
            </View>
          );
        },
      })}
    >
      <Tab.Screen 
        name="TabHome" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Trang chủ' }} 
      />
      <Tab.Screen 
        name="TabMap" 
        component={ExploreMapScreen} 
        options={{ tabBarLabel: 'Khám phá' }} 
      />
      <Tab.Screen name="TabCommunity" component={CommunityScreen}    options={{ tabBarLabel: 'Community' }} />
      <Tab.Screen name="TabChat"      component={ChatScreen}         options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="TabProfile"   component={ProfileScreen}      options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
