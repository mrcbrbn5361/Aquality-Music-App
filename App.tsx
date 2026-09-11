import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync } from 'expo-audio';

import { usePlayer, playerStore } from './mobile/src/store/player-store';
import { AudioBridge } from './mobile/src/components/AudioBridge';
import { MiniPlayer } from './mobile/src/components/MiniPlayer';
import HomeScreen from './mobile/app/(tabs)/index';
import SearchScreen from './mobile/app/(tabs)/search';
import LibraryScreen from './mobile/app/(tabs)/library';
import SettingsScreen from './mobile/app/(tabs)/settings';
import PlayerModal from './mobile/app/modal/player';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'settings'>('home');
  const [modalVisible, setModalVisible] = useState(false);
  const { playerModalOpen } = usePlayer();

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true
    }).catch((err) => {
      console.warn('[App] Audio mode warning:', err);
    });
  }, []);

  const isPlayerOpen = modalVisible || playerModalOpen;

  const handleClosePlayer = () => {
    setModalVisible(false);
    playerStore.setPlayerModalOpen(false);
  };

  const handleOpenPlayer = () => {
    setModalVisible(true);
    playerStore.setPlayerModalOpen(true);
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Ana Ekran Görüntüsü */}
        <View style={styles.screenContainer}>
          {activeTab === 'home' && <HomeScreen />}
          {activeTab === 'search' && <SearchScreen />}
          {activeTab === 'library' && <LibraryScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </View>

        {/* Yüzen Mini Oynatıcı */}
        <View style={styles.miniPlayerAnchor}>
          <MiniPlayer onOpenPlayer={handleOpenPlayer} />
        </View>

        {/* MetroList Koyu Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={22}
              color={activeTab === 'home' ? '#00f0ff' : '#64748b'}
            />
            <Text style={[styles.tabLabel, activeTab === 'home' && styles.activeTabLabel]}>
              Ana Sayfa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('search')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'search' ? 'search' : 'search-outline'}
              size={22}
              color={activeTab === 'search' ? '#00f0ff' : '#64748b'}
            />
            <Text style={[styles.tabLabel, activeTab === 'search' && styles.activeTabLabel]}>
              Keşfet & Ara
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('library')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'library' ? 'library' : 'library-outline'}
              size={22}
              color={activeTab === 'library' ? '#00f0ff' : '#64748b'}
            />
            <Text style={[styles.tabLabel, activeTab === 'library' && styles.activeTabLabel]}>
              Kitaplık
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeTab === 'settings' ? 'options' : 'options-outline'}
              size={22}
              color={activeTab === 'settings' ? '#00f0ff' : '#64748b'}
            />
            <Text style={[styles.tabLabel, activeTab === 'settings' && styles.activeTabLabel]}>
              Ayarlar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tam Ekran MetroList Müzik Çalar Modal */}
        <Modal
          visible={isPlayerOpen}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleClosePlayer}
        >
          <PlayerModal onClose={handleClosePlayer} />
        </Modal>

        {/* Arka Plan Ses Köprüsü */}
        <AudioBridge />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06090e'
  },
  screenContainer: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 84 : 64
  },
  tabBar: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0f1d',
    borderTopColor: 'rgba(56, 189, 248, 0.12)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    elevation: 10
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 3,
    letterSpacing: 0.3
  },
  activeTabLabel: {
    color: '#00f0ff'
  },
  miniPlayerAnchor: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 84 : 64,
    left: 0,
    right: 0,
    zIndex: 10
  }
});
