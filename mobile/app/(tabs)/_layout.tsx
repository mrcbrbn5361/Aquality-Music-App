import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MiniPlayer } from '../../src/components/MiniPlayer';

export default function TabsLayout() {
  return (
    <View style={styles.wrapper}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#1ed760',
          tabBarInactiveTintColor: '#8892b0',
          tabBarLabelStyle: styles.tabLabel
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Ana Sayfa',
            tabBarIcon: ({ color, size }: { color: any; size: number }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Ara',
            tabBarIcon: ({ color, size }: { color: any; size: number }) => (
              <Ionicons name="search-outline" size={size} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Kitaplık',
            tabBarIcon: ({ color, size }: { color: any; size: number }) => (
              <Ionicons name="library-outline" size={size} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ayarlar',
            tabBarIcon: ({ color, size }: { color: any; size: number }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
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
    backgroundColor: '#0b0e14'
  },
  tabBar: {
    backgroundColor: '#12161f',
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopWidth: 1,
    height: 58,
    paddingBottom: 6,
    paddingTop: 4
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600'
  },
  miniPlayerAnchor: {
    position: 'absolute',
    bottom: 58,
    left: 0,
    right: 0
  }
});
