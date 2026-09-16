import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MiniPlayer } from '../../src/components/MiniPlayer';

export default function TabsLayout() {
  return (
    <View style={styles.wrapper}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#00f0ff',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: styles.tabLabel
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Ana Sayfa',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Keşfet & Ara',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Kitaplık',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'library' : 'library-outline'} size={22} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ayarlar',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'options' : 'options-outline'} size={22} color={color} />
            )
          }}
        />
      </Tabs>

      {/* Ekranın altında alt menünün hemen üzerinde yüzen mini oynatıcı */}
      <View style={styles.miniPlayerAnchor}>
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#06090e'
  },
  tabBar: {
    backgroundColor: '#0a0f1d',
    borderTopColor: 'rgba(56, 189, 248, 0.12)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 10
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  miniPlayerAnchor: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 84 : 64,
    left: 0,
    right: 0
  }
});
