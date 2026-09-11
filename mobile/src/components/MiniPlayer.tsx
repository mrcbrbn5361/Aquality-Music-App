import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, usePlayerProgress, playerStore } from '../store/player-store';
import { mobilePlayer } from '../services/player';
import { Equalizer } from './Equalizer';

export const MiniPlayer: React.FC = () => {
  const router = useRouter();
  const { currentSong, playing, likedIds } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();

  if (!currentSong) return null;

  const isLiked = likedIds.includes(currentSong.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const openFullPlayer = () => {
    router.push('/modal/player');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={openFullPlayer}
    >
      <View style={styles.mainRow}>
        <Image
          source={{ uri: currentSong.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100' }}
          style={styles.thumbnail}
        />

        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <View style={styles.eqBox}>
            <Equalizer playing={playing} size={15} />
          </View>

          <TouchableOpacity
            style={styles.btn}
            onPress={(e) => {
              e.stopPropagation();
              playerStore.toggleLike(currentSong.id);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 2 }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={22}
              color={isLiked ? '#1ed760' : '#bbb'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.playBtn]}
            onPress={(e) => {
              e.stopPropagation();
              mobilePlayer.togglePlay();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 2, right: 6 }}
          >
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={22}
              color="#0b0e14"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* İlerleme Çizgisi */}
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#181d26',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginHorizontal: 8,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    overflow: 'hidden'
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#232a36'
  },
  textWrap: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center'
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  artist: {
    color: '#9aa2b1',
    fontSize: 12,
    marginTop: 2
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  eqBox: {
    marginRight: 10
  },
  btn: {
    padding: 6
  },
  playBtn: {
    backgroundColor: '#1ed760',
    borderRadius: 20,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4
  },
  progressBackground: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1ed760'
  }
});
