import { Tabs } from 'expo-router';
import { Activity, Home, Trophy, User } from 'lucide-react-native';
import React from 'react';


export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0a7ea4',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: 'Session',
          tabBarIcon: ({ color, focused }) => (
            <Activity color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="Friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, focused }) => (
            <Trophy color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
