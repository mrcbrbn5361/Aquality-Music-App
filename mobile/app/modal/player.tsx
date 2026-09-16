import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, usePlayerProgress, playerStore } from '../../src/store/player-store';
import { mobilePlayer } from '../../src/services/player';
import { mobileApi } from '../../src/api/innertube';
import { Equalizer } from '../../src/components/Equalizer';
import { LyricsData, Song } from '../../src/types';

const { width } = Dimensions.get('window');
const ARTWORK_SIZE = Math.min(width - 64, 340);

export interface PlayerModalProps {
  onClose?: () => void;
}

export default function PlayerModal({ onClose }: PlayerModalProps = {}) {
  const router = useRouter();
  const handleClose = () => {
    playerStore.setPlayerModalOpen(false);
    if (onClose) {
      onClose();
      return;
    }
    if (router && typeof router.back === 'function') {
      try {
        router.back();
      } catch (e) {}
    }
  };

  const { currentSong, playing, likedIds, shuffle, repeat, queue, queueIndex } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();

  const [activeTab, setActiveTab] = useState<'track' | 'lyrics' | 'queue'>('track');
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Şarkı değiştiğinde şarkı sözlerini çek
  useEffect(() => {
    if (!currentSong) return;
    setLyrics(null);
    setLyricsLoading(true);

    mobileApi
      .getLyrics(currentSong.id, currentSong.title, currentSong.artist)
      .then((data) => {
        setLyrics(data);
      })
      .catch(() => {
        setLyrics(null);
      })
      .finally(() => {
        setLyricsLoading(false);
      });
  }, [currentSong?.id]);

  if (!currentSong) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
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
        {/* Üst Bar: Kapat Butonu & MetroList Segment Switcher */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={26} color="#f8fafc" />
          </TouchableOpacity>

          {/* MetroList 3-Sekmeli Başlık (Şarkı / Sözler / Sıradakiler) */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'track' && styles.activeSegmentBtn]}
              onPress={() => setActiveTab('track')}
            >
              <Text style={[styles.segmentText, activeTab === 'track' && styles.activeSegmentText]}>
                Şarkı
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'lyrics' && styles.activeSegmentBtn]}
              onPress={() => setActiveTab('lyrics')}
            >
              <Text style={[styles.segmentText, activeTab === 'lyrics' && styles.activeSegmentText]}>
                Sözler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'queue' && styles.activeSegmentBtn]}
              onPress={() => setActiveTab('queue')}
            >
              <Text style={[styles.segmentText, activeTab === 'queue' && styles.activeSegmentText]}>
                Sıradakiler
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hiFiBadge}>
            <Text style={styles.hiFiBadgeText}>HI-FI</Text>
          </View>
        </View>

        {/* 1. GÖRÜNÜM: ŞARKI & OYNATICI */}
        {activeTab === 'track' && (
          <View style={styles.trackView}>
            {/* Büyük Squircle Albüm Kapağı */}
            <View style={styles.artContainer}>
              <Image
                source={{
                  uri:
                    currentSong.thumbnail ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400'
                }}
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
                    <Equalizer playing={playing} size={15} color="#00f0ff" />
                  </View>
                </View>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {currentSong.artist}
                  {currentSong.album ? ` • ${currentSong.album}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => playerStore.toggleLike(currentSong.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.heartBtn}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={26}
                  color={isLiked ? '#00f0ff' : '#64748b'}
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
                  color={shuffle ? '#00f0ff' : '#64748b'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlIcon}
                onPress={() => mobilePlayer.playPrevious()}
              >
                <Ionicons name="play-skip-back" size={28} color="#f8fafc" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mainPlayBtn}
                onPress={() => mobilePlayer.togglePlay()}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={playing ? 'pause' : 'play'}
                  size={30}
                  color="#06090e"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlIcon}
                onPress={() => mobilePlayer.playNext()}
              >
                <Ionicons name="play-skip-forward" size={28} color="#f8fafc" />
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
                    color={repeat !== 'off' ? '#00f0ff' : '#64748b'}
                  />
                  {repeat === 'one' && (
                    <View style={styles.repeatBadge}>
                      <Text style={styles.repeatBadgeText}>1</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* MetroList Footer Bilgi Çubuğu */}
            <View style={styles.footerShield}>
              <Ionicons name="shield-checkmark" size={13} color="#00f0ff" />
              <Text style={styles.footerShieldText}>
                REKLAMSIZ • 256 KBPS • METRO MOTORU
              </Text>
            </View>
          </View>
        )}

        {/* 2. GÖRÜNÜM: ŞARKI SÖZLERİ (LYRICS) */}
        {activeTab === 'lyrics' && (
          <View style={styles.lyricsView}>
            {lyricsLoading ? (
              <View style={styles.lyricsLoadingWrap}>
                <ActivityIndicator size="large" color="#00f0ff" />
                <Text style={styles.lyricsLoadingText}>Şarkı sözleri aranıyor...</Text>
              </View>
            ) : lyrics && lyrics.lines && lyrics.lines.length > 0 ? (
              <ScrollView
                style={styles.lyricsScroll}
                contentContainerStyle={styles.lyricsContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.lyricsHeaderMeta}>
                  <Text style={styles.lyricsSongTitle}>{currentSong.title}</Text>
                  <Text style={styles.lyricsArtistName}>{currentSong.artist}</Text>
                  {lyrics.source && (
                    <Text style={styles.lyricsSourceTag}>Kaynak: {lyrics.source}</Text>
                  )}
                </View>

                {lyrics.lines.map((line, index) => (
                  <Text key={'lyr_' + index} style={styles.lyricLine}>
                    {line}
                  </Text>
                ))}

                <View style={{ height: 60 }} />
              </ScrollView>
            ) : (
              <View style={styles.emptyLyricsWrap}>
                <Ionicons name="document-text-outline" size={48} color="#64748b" />
                <Text style={styles.emptyLyricsTitle}>Söz Bulunamadı</Text>
                <Text style={styles.emptyLyricsSub}>
                  Bu parça için henüz şarkı sözü kaynağı sağlanmamış olabilir.
                </Text>
              </View>
            )}

            {/* Şarkı Sözleri Ekranındayken Mini Kontroller */}
            <View style={styles.compactControls}>
              <TouchableOpacity onPress={() => mobilePlayer.playPrevious()} style={styles.compactBtn}>
                <Ionicons name="play-skip-back" size={20} color="#f8fafc" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mobilePlayer.togglePlay()} style={styles.compactPlayBtn}>
                <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#06090e" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mobilePlayer.playNext()} style={styles.compactBtn}>
                <Ionicons name="play-skip-forward" size={20} color="#f8fafc" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 3. GÖRÜNÜM: SIRADAKİLER / KUYRUK (QUEUE) */}
        {activeTab === 'queue' && (
          <View style={styles.queueView}>
            <View style={styles.queueHeaderRow}>
              <Text style={styles.queueTitle}>Çalma Sırası ({queue.length} Parça)</Text>
              <TouchableOpacity
                onPress={() => {
                  mobileApi.getNext(currentSong.id).then((sim) => {
                    sim.forEach((s) => playerStore.addToQueue(s));
                  });
                }}
              >
                <Text style={styles.queueAutoAddText}>+ Benzer Parça Ekle</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.queueScroll}
              contentContainerStyle={styles.queueContent}
              showsVerticalScrollIndicator={false}
            >
              {queue.map((song, idx) => {
                const isPlayingItem = idx === queueIndex;
                return (
                  <TouchableOpacity
                    key={'q_' + song.id + '_' + idx}
                    style={[styles.queueItem, isPlayingItem && styles.activeQueueItem]}
                    onPress={() => {
                      playerStore.setQueue(queue, idx);
                      mobilePlayer.play(song);
                    }}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{
                        uri:
                          song.thumbnail ||
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120'
                      }}
                      style={styles.queueThumb}
                    />
                    <View style={styles.queueMeta}>
                      <Text
                        style={[styles.queueItemTitle, isPlayingItem && styles.activeQueueText]}
                        numberOfLines={1}
                      >
                        {song.title}
                      </Text>
                      <Text style={styles.queueItemArtist} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </View>

                    {isPlayingItem ? (
                      <Equalizer playing={playing} size={14} color="#00f0ff" />
                    ) : (
                      <Ionicons name="reorder-two" size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 60 }} />
            </ScrollView>

            {/* Kuyruk Ekranındayken Mini Kontroller */}
            <View style={styles.compactControls}>
              <TouchableOpacity onPress={() => mobilePlayer.playPrevious()} style={styles.compactBtn}>
                <Ionicons name="play-skip-back" size={20} color="#f8fafc" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mobilePlayer.togglePlay()} style={styles.compactPlayBtn}>
                <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#06090e" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => mobilePlayer.playNext()} style={styles.compactBtn}>
                <Ionicons name="play-skip-forward" size={20} color="#f8fafc" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06090e'
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 16
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  closeBtn: {
    padding: 10
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0e1628',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  segmentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  activeSegmentBtn: {
    backgroundColor: '#00f0ff'
  },
  segmentText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700'
  },
  activeSegmentText: {
    color: '#06090e',
    fontWeight: '800'
  },
  hiFiBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8
  },
  hiFiBadgeText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '800'
  },
  trackView: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  artContainer: {
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 20,
    backgroundColor: '#121927',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.18)'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6
  },
  songInfo: {
    flex: 1,
    marginRight: 14
  },
  titleWithEq: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  songTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    flexShrink: 1
  },
  eqBox: {
    marginLeft: 8
  },
  songArtist: {
    color: '#94a3b8',
    fontSize: 14.5,
    marginTop: 3,
    fontWeight: '500'
  },
  heartBtn: {
    padding: 10
  },
  progressSection: {
    marginVertical: 8
  },
  progressBarHitBox: {
    paddingVertical: 10
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00f0ff'
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6
  },
  timeText: {
    color: '#64748b',
    fontSize: 12,
    fontVariant: ['tabular-nums']
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 6
  },
  controlIcon: {
    padding: 8
  },
  mainPlayBtn: {
    backgroundColor: '#00f0ff',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8
  },
  repeatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00f0ff',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  repeatBadgeText: {
    color: '#06090e',
    fontSize: 8,
    fontWeight: '800'
  },
  footerShield: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4
  },
  footerShieldText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.8
  },
  lyricsView: {
    flex: 1,
    justifyContent: 'space-between'
  },
  lyricsLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  lyricsLoadingText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 13
  },
  lyricsScroll: {
    flex: 1
  },
  lyricsContent: {
    paddingVertical: 20,
    paddingHorizontal: 8
  },
  lyricsHeaderMeta: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 14
  },
  lyricsSongTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800'
  },
  lyricsArtistName: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 3
  },
  lyricsSourceTag: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6
  },
  lyricLine: {
    color: '#e2e8f0',
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 32,
    marginVertical: 2
  },
  emptyLyricsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32
  },
  emptyLyricsTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12
  },
  emptyLyricsSub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6
  },
  queueView: {
    flex: 1,
    justifyContent: 'space-between'
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  queueTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700'
  },
  queueAutoAddText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '700'
  },
  queueScroll: {
    flex: 1,
    marginTop: 8
  },
  queueContent: {
    paddingBottom: 20
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 2
  },
  activeQueueItem: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)'
  },
  queueThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#121927'
  },
  queueMeta: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center'
  },
  queueItemTitle: {
    color: '#f8fafc',
    fontSize: 13.5,
    fontWeight: '600'
  },
  activeQueueText: {
    color: '#00f0ff',
    fontWeight: '700'
  },
  queueItemArtist: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  compactControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0e1628',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.18)',
    alignSelf: 'center',
    marginTop: 8
  },
  compactBtn: {
    padding: 6
  },
  compactPlayBtn: {
    backgroundColor: '#00f0ff',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
