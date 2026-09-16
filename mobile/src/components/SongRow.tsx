import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types';
import { usePlayer, playerStore } from '../store/player-store';
import { mobilePlayer } from '../services/player';
import { Equalizer } from './Equalizer';

interface SongRowProps {
  song: Song;
  onPress?: () => void;
  index?: number;
  showIndex?: boolean;
}

export const SongRow: React.FC<SongRowProps> = React.memo(({ song, onPress, index, showIndex = true }) => {
  const { currentSong, playing, likedIds } = usePlayer();
  const isCurrent = currentSong?.id === song.id;
  const isLiked = likedIds.includes(song.id);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      mobilePlayer.play(song);
    }
  };

  const handleLike = (e: any) => {
    e.stopPropagation();
    playerStore.toggleLike(song.id);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isCurrent && styles.activeContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {isCurrent && <View style={styles.activePillIndicator} />}

      {showIndex && index !== undefined && (
        <Text style={[styles.indexText, isCurrent && styles.activeCyanText]}>
          {(index + 1).toString().padStart(2, '0')}
        </Text>
      )}

      <View style={styles.thumbWrapper}>
        <Image
          source={{
            uri:
              song.thumbnail ||
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120'
          }}
          style={styles.thumbnail}
        />
        {song.isVideo && (
          <View style={styles.videoBadge}>
            <Ionicons name="videocam" size={8} color="#00f0ff" />
          </View>
        )}
      </View>

      <View style={styles.metaContainer}>
        <Text
          style={[styles.title, isCurrent && styles.activeCyanText]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist}
          {song.album ? ` • ${song.album}` : ''}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {isCurrent && (
          <View style={styles.eqWrapper}>
            <Equalizer playing={playing} size={13} color="#00f0ff" />
          </View>
        )}

        {song.durationText && (
          <Text style={styles.durationText}>{song.durationText}</Text>
        )}

        <TouchableOpacity
          onPress={handleLike}
          style={styles.likeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={19}
            color={isLiked ? '#00f0ff' : '#62718d'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: 'transparent'
  },
  activeContainer: {
    backgroundColor: 'rgba(0, 240, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)'
  },
  activePillIndicator: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#00f0ff'
  },
  indexText: {
    color: '#62718d',
    fontSize: 12,
    width: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums']
  },
  thumbWrapper: {
    position: 'relative',
    marginRight: 12
  },
  thumbnail: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  videoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(6, 9, 14, 0.85)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 0.5,
    borderColor: '#00f0ff'
  },
  metaContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  title: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  artist: {
    color: '#8b9bb4',
    fontSize: 12,
    fontWeight: '500'
  },
  activeCyanText: {
    color: '#00f0ff',
    fontWeight: '700'
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  eqWrapper: {
    marginRight: 10
  },
  durationText: {
    color: '#62718d',
    fontSize: 11,
    marginRight: 10,
    fontVariant: ['tabular-nums']
  },
  likeBtn: {
    padding: 10
  }
});
