import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerSelector, usePlayerProgress, playerStore } from '../store/player-store';
import { mobilePlayer } from '../services/player';
import { Equalizer } from './Equalizer';
import { Song } from '../types';

export interface MiniPlayerProps {
  onOpenPlayer?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onOpenPlayer }) => {
  const router = useRouter();
  // Yalnızca gerekli dilimlere abone ol — kuyruk/zaman değişimleri
  // bu bileşeni gereksiz yere yeniden çizmesin.
  const currentSong = usePlayerSelector((s) => s.currentSong);
  const playing = usePlayerSelector((s) => s.playing);
  const likedIds = usePlayerSelector((s) => s.likedIds);
  const { currentTime, duration } = usePlayerProgress();

  const openFullPlayer = useCallback(() => {
    playerStore.setPlayerModalOpen(true);
    if (onOpenPlayer) {
      onOpenPlayer();
      return;
    }
    try {
      router.push('/modal/player');
    } catch (e) {
      console.warn('[MiniPlayer] Oyuncu ekranı açılamadı:', e);
    }
  }, [onOpenPlayer, router]);

  const handleToggleLike = useCallback(() => {
    if (currentSong) playerStore.toggleLike(currentSong);
  }, [currentSong]);

  const handleTogglePlay = useCallback(() => {
    mobilePlayer.togglePlay().catch((e) => {
      console.warn('[MiniPlayer] Oynat/duraklat hatası:', e);
    });
  }, []);

  const handleNext = useCallback(() => {
    try {
      mobilePlayer.playNext();
    } catch (e) {
      console.warn('[MiniPlayer] Sonraki parça hatası:', e);
    }
  }, []);

  if (!currentSong) return null;

  const song: Song = currentSong;
  const isLiked = likedIds.includes(song.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    // NOT: İç içe Touchable kullanılmıyor — aksi halde iç butona
    // dokunmak dış kapsayıcıyı da tetikler (olay kabarcıklanması).
    <View style={styles.container}>
      {/* Üst Kısım: Neon İlerleme Çizgisi */}
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.mainRow}>
        <TouchableOpacity
          style={styles.openArea}
          activeOpacity={0.92}
          onPress={openFullPlayer}
          accessibilityRole="button"
          accessibilityLabel="Tam ekran oynatıcıyı aç"
        >
          <Image
            source={{
              uri:
                song.thumbnail ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120'
            }}
            style={styles.thumbnail}
          />

          <View style={styles.textWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {song.title}
            </Text>
            <View style={styles.artistRow}>
              <Text style={styles.artist} numberOfLines={1}>
                {song.artist}
              </Text>
              {song.isVideo && (
                <View style={styles.clipBadge}>
                  <Text style={styles.clipText}>KLİP</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.controls}>
          <View style={styles.eqBox}>
            <Equalizer playing={playing} size={14} color="#00f0ff" />
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleToggleLike}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Beğenmekten vazgeç' : 'Beğen'}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#00f0ff' : '#64748b'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, styles.playBtn]}
            onPress={handleTogglePlay}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Duraklat' : 'Oynat'}
          >
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={18}
              color="#06090e"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleNext}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Sonraki parça"
          >
            <Ionicons name="play-skip-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d1524',
    borderRadius: 14,
    marginHorizontal: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.22)',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden'
  },
  progressBackground: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00f0ff'
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  openArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: '#161f30',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  textWrap: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center'
  },
  title: {
    color: '#f8fafc',
    fontSize: 13.5,
    fontWeight: '700'
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  artist: {
    color: '#8b9bb4',
    fontSize: 11.5,
    fontWeight: '500',
    flexShrink: 1
  },
  clipBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 5
  },
  clipText: {
    color: '#00f0ff',
    fontSize: 8,
    fontWeight: '800'
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  eqBox: {
    marginRight: 6
  },
  iconBtn: {
    padding: 6
  },
  playBtn: {
    backgroundColor: '#00f0ff',
    borderRadius: 18,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5
  }
});
