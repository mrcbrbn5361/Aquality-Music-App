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
}

export const SongRow: React.FC<SongRowProps> = ({ song, onPress, index }) => {
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
      {index !== undefined && (
        <Text style={[styles.indexText, isCurrent && styles.activeGreen]}>{index + 1}</Text>
      )}

      <Image
        source={{ uri: song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100' }}
        style={styles.thumbnail}
      />

      <View style={styles.metaContainer}>
        <Text
          style={[styles.title, isCurrent && styles.activeGreen]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>

      <View style={styles.rightSection}>
        {isCurrent && (
          <View style={styles.eqWrapper}>
            <Equalizer playing={playing} size={14} />
          </View>
        )}

        <TouchableOpacity onPress={handleLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#1ed760' : '#888'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  activeContainer: {
    backgroundColor: 'rgba(30, 215, 96, 0.08)'
  },
  indexText: {
    color: '#888',
    fontSize: 14,
    width: 24,
    fontWeight: '500'
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#1f242d'
  },
  metaContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center'
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3
  },
  artist: {
    color: '#999',
    fontSize: 13
  },
  activeGreen: {
    color: '#1ed760'
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8
  },
  eqWrapper: {
    marginRight: 14
  }
});
