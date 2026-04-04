import { appTheme } from '@/constants/theme';
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
        tabBarActiveTintColor: appTheme.colors.primary,
        tabBarInactiveTintColor: appTheme.colors.textSubtle,
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
              <MapPin
                color={
                  focused ? appTheme.colors.white : appTheme.colors.primary
                }
                size={21}
              />
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
      <Tabs.Screen
        name="user"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="add-spot" options={{ href: null }} />
      <Tabs.Screen name="create-session" options={{ href: null }} />
      <Tabs.Screen name="nearby" options={{ href: null }} />
      <Tabs.Screen name="session" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="spot-details" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: appTheme.colors.borderSubtle,
    backgroundColor: appTheme.colors.surface,
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
    borderColor: `${appTheme.colors.primary}33`,
    backgroundColor: appTheme.colors.primarySoft,
  },
  mapIconWrapFocused: {
    borderColor: appTheme.colors.accent,
    backgroundColor: appTheme.colors.accent,
  },
});
