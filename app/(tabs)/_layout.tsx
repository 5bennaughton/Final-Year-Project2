import { Tabs } from 'expo-router';
import { Home, MapPin, Search, User } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#1f6f5f',
        tabBarInactiveTintColor: '#7d8a84',
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="Map"
        options={{
          title: 'Map',
          tabBarIcon: ({ focused }) => (
            <View
              style={[styles.mapIconWrap, focused && styles.mapIconWrapFocused]}
            >
              <MapPin color={focused ? '#ffffff' : '#1f6f5f'} size={21} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="Friends"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#dce5e0',
    backgroundColor: '#f8fbf8',
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  mapIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f6f5f33',
    backgroundColor: '#e6f0ec',
  },
  mapIconWrapFocused: {
    borderColor: '#f27d3d',
    backgroundColor: '#f27d3d',
  },
});
