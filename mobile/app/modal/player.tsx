import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, usePlayerProgress, playerStore } from '../../src/store/player-store';
import { mobilePlayer } from '../../src/services/player';
import { Equalizer } from '../../src/components/Equalizer';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = width - 64;

export default function PlayerModal() {
  const router = useRouter();
  const { currentSong, playing, likedIds, shuffle, repeat } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();

  if (!currentSong) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.emptyText}>Çalan şarkı bulunmuyor.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLiked = likedIds.includes(currentSong.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Üst Bar: Kapat Butonu & Başlık */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerSubtitle}>
              {currentSong.isVideo ? 'MÜZİK VİDEOSU' : 'ŞİMDİ ÇALIYOR'}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentSong.title}
            </Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Büyük Albüm Kapağı */}
        <View style={styles.artContainer}>
          <Image
            source={{ uri: currentSong.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400' }}
            style={styles.artwork}
          />
        </View>

        {/* Parça Metadata ve Kalp Butonu */}
        <View style={styles.metaRow}>
          <View style={styles.songInfo}>
            <View style={styles.titleWithEq}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <View style={styles.eqBox}>
                <Equalizer playing={playing} size={16} />
              </View>
            </View>
            <Text style={styles.songArtist} numberOfLines={1}>
              {currentSong.artist}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => playerStore.toggleLike(currentSong.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? '#1ed760' : '#fff'}
            />
          </TouchableOpacity>
        </View>

        {/* İlerleme Çubuğu */}
        <View style={styles.progressSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.progressBarHitBox}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              const barWidth = width - 48;
              const ratio = Math.max(0, Math.min(1, locationX / barWidth));
              if (duration > 0) {
                mobilePlayer.seek(ratio * duration);
              }
            }}
          >
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </TouchableOpacity>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>

        {/* Ana Kontrol Butonları */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlIcon}
            onPress={() => playerStore.toggleShuffle()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="shuffle"
              size={22}
              color={shuffle ? '#1ed760' : '#8892b0'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlIcon}
            onPress={() => mobilePlayer.playPrevious()}
          >
            <Ionicons name="play-skip-back" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mainPlayBtn}
            onPress={() => mobilePlayer.togglePlay()}
          >
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={32}
              color="#0b0e14"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlIcon}
            onPress={() => mobilePlayer.playNext()}
          >
            <Ionicons name="play-skip-forward" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlIcon}
            onPress={() => playerStore.toggleRepeat()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View>
              <Ionicons
                name="repeat"
                size={22}
                color={repeat !== 'off' ? '#1ed760' : '#8892b0'}
              />
              {repeat === 'one' && (
                <View style={styles.repeatBadge}>
                  <Text style={styles.repeatBadgeText}>1</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f141d'
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: 20
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: '#888',
    fontSize: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12
  },
  closeBtn: {
    padding: 4
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12
  },
  headerSubtitle: {
    color: '#8892b0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1
  },
  headerTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  artContainer: {
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 12,
    backgroundColor: '#1b222d'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8
  },
  songInfo: {
    flex: 1,
    marginRight: 16
  },
  titleWithEq: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  songTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1
  },
  eqBox: {
    marginLeft: 10
  },
  songArtist: {
    color: '#9aa2b1',
    fontSize: 15,
    marginTop: 4
  },
  progressSection: {
    marginVertical: 12
  },
  progressBarHitBox: {
    paddingVertical: 10
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1ed760'
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  timeText: {
    color: '#8892b0',
    fontSize: 12
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8
  },
  controlIcon: {
    padding: 8
  },
  mainPlayBtn: {
    backgroundColor: '#1ed760',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1ed760',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  repeatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#1ed760',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  repeatBadgeText: {
    color: '#0b0e14',
    fontSize: 8,
    fontWeight: '800'
  }
});
