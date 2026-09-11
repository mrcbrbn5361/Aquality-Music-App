import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../../src/store/player-store';
import { SongRow } from '../../src/components/SongRow';

export default function LibraryScreen() {
  const { likedIds, recentlyPlayed } = usePlayer();
  const [activeTab, setActiveTab] = useState<'liked' | 'recent'>('liked');

  // Beğenilen şarkıları bul
  const likedSongs = recentlyPlayed.filter((s) => likedIds.includes(s.id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Kitaplığım</Text>
        </View>

        {/* Sekme Seçici */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'liked' && styles.activeTabBtn]}
            onPress={() => setActiveTab('liked')}
          >
            <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>
              Beğenilenler ({likedIds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'recent' && styles.activeTabBtn]}
            onPress={() => setActiveTab('recent')}
          >
            <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
              Son Çalınanlar ({recentlyPlayed.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {activeTab === 'liked' ? (
            likedSongs.length > 0 ? (
              likedSongs.map((song, idx) => (
                <SongRow key={song.id + idx} song={song} index={idx} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.heartCircle}>
                  <Ionicons name="heart" size={36} color="#1ed760" />
                </View>
                <Text style={styles.emptyTitle}>Henüz beğendiğiniz şarkı yok</Text>
                <Text style={styles.emptySubtitle}>
                  Sevdiğiniz şarkıların yanındaki kalp ikonuna tıklayarak buraya ekleyebilirsiniz.
                </Text>
              </View>
            )
          ) : (
            recentlyPlayed.length > 0 ? (
              recentlyPlayed.map((song, idx) => (
                <SongRow key={song.id + idx} song={song} index={idx} />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={48} color="#8892b0" />
                <Text style={styles.emptyTitle}>Dinleme geçmişi boş</Text>
                <Text style={styles.emptySubtitle}>
                  Çaldığınız müzikler burada sıralanacaktır.
                </Text>
              </View>
            )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0e14'
  },
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 12
  },
  screenTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700'
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#181d26',
    marginRight: 10
  },
  activeTabBtn: {
    backgroundColor: '#1ed760'
  },
  tabText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600'
  },
  activeTabText: {
    color: '#0b0e14'
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 6
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32
  },
  heartCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(30, 215, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center'
  },
  emptySubtitle: {
    color: '#8892b0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  }
});
