import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { colors } from '../theme/colors';
import type { TabParamList } from '../types/navigation';

import HomeScreen from '../screens/home/HomeScreen';
import ExploreMapScreen from '../screens/map/ExploreMapScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * TabIcon — wrapper đảm bảo Ionicons font luôn được load trước khi render icon.
 * Dùng useFonts hook thay vì static Font.isLoaded() để tránh race condition.
 */
const TabIcon = ({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) => {
  const [fontsLoaded] = useFonts(Ionicons.font);

  return (
    <View
      style={{
        backgroundColor: focused ? colors.primary : 'transparent',
        width: 60,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {fontsLoaded ? (
        <Ionicons
          name={name}
          size={22}
          color={focused ? '#FFFFFF' : '#795548'}
        />
      ) : (
        // Placeholder giữ chỗ để layout không bị giật
        <View style={{ width: 22, height: 22 }} />
      )}
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#795548',
        tabBarStyle: {
          backgroundColor: '#F9F6F0',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="TabHome"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="TabMap"
        component={ExploreMapScreen}
        options={{
          tabBarLabel: 'Khám phá',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'map' : 'map-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="TabCommunity"
        component={CommunityScreen}
        options={{
          tabBarLabel: 'Cộng đồng',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="TabChat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="TabProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
