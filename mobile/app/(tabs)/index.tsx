import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Song, HomeSection } from '../../src/types';
import { mobileApi } from '../../src/api/innertube';
import { mobilePlayer } from '../../src/services/player';
import { playerStore } from '../../src/store/player-store';
import { SongRow } from '../../src/components/SongRow';

const { width } = Dimensions.get('window');

const MOODS = [
  { id: 'all', label: 'Keşfet', icon: 'planet' },
  { id: 'charts', label: 'Trendler', icon: 'flame' },
  { id: 'rap', label: 'Türkçe Rap & HipHop', icon: 'mic' },
  { id: 'enerji', label: 'Yüksek Enerji', icon: 'flash' },
  { id: 'rahatla', label: 'Chill & Rahatla', icon: 'headset' },
  { id: 'odaklan', label: 'Focus & Gece', icon: 'moon' }
];

export default function HomeScreen() {
  const [quickPicks, setQuickPicks] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [charts, setCharts] = useState<Song[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [selectedMood, setSelectedMood] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Günaydın';
    if (hours < 18) return 'Tünaydın';
    return 'İyi Akşamlar';
  };

  const loadData = async (mood = 'all') => {
    try {
      if (mood === 'all' || mood === 'charts') {
        const res = await mobileApi.getHome();
        setQuickPicks(res.quickPicks.slice(0, 10));
        setTrending(res.trending);
        setCharts(res.charts);
        setSections(res.sections);
      } else {
        const res = await mobileApi.search(`${mood} müzik`, 'songs');
        setTrending(res.songs);
      }
    } catch (e) {
      console.warn('Load home error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(selectedMood);
  }, [selectedMood]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(selectedMood);
  };

  const handlePlaySong = async (song: Song, contextList: Song[] = []) => {
    if (contextList.length > 0) {
      const idx = contextList.findIndex((s) => s.id === song.id);
      playerStore.setQueue(contextList, idx >= 0 ? idx : 0);
    }
    await mobilePlayer.play(song);

    try {
      const similar = await mobileApi.getNext(song.id);
      if (similar.length > 0) {
        similar.forEach((s) => playerStore.addToQueue(s));
      }
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f0ff" />
        }
      >
        {/* Aquality Futuristic Branding Bar */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
              />
            </View>
            <View style={styles.titleWrap}>
              <View style={styles.titleRow}>
                <Text style={styles.appName}>AQUALITY</Text>
                <Text style={styles.appSub}>SOUND</Text>
              </View>
              <Text style={styles.greetingText}>{getGreeting()} • Kesintisiz Müzik</Text>
            </View>
          </View>
          <View style={styles.adShieldBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#00f0ff" />
            <Text style={styles.adShieldText}>REKLAMSIZ</Text>
          </View>
        </View>

        {/* Neon Mood Çipleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodsScroll}
        >
          {MOODS.map((m) => {
            const active = selectedMood === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.moodChip, active && styles.activeMoodChip]}
                onPress={() => setSelectedMood(m.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={m.icon as any}
                  size={14}
                  color={active ? '#06090e' : '#00f0ff'}
                  style={styles.moodIcon}
                />
                <Text style={[styles.moodText, active && styles.activeMoodText]}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color="#00f0ff" />
            <Text style={styles.loadingText}>Aquality Ses Motoru Başlatılıyor...</Text>
          </View>
        ) : (
          <>
            {/* Aquality Hızlı Akış (Özgün Orbital Kartlar) */}
            {selectedMood === 'all' && quickPicks.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Hızlı Akış</Text>
                  <View style={styles.flowBadge}>
                    <View style={styles.flowDot} />
                    <Text style={styles.flowBadgeText}>CANLI</Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.flowScroll}
                >
                  {quickPicks.map((song) => (
                    <TouchableOpacity
                      key={'flow_' + song.id}
                      style={styles.flowCard}
                      onPress={() => handlePlaySong(song, quickPicks)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{
                          uri:
                            song.thumbnail ||
                            'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=240'
                        }}
                        style={styles.flowThumb}
                      />
                      <View style={styles.flowOverlay}>
                        <View style={styles.flowPlayBtn}>
                          <Ionicons name="play" size={16} color="#06090e" />
                        </View>
                        <Text style={styles.flowTitle} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text style={styles.flowArtist} numberOfLines={1}>
                          {song.artist}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Türkiye Top 50 & Hit Listesi (Neon Cyber Kartlar) */}
            {charts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Zirvedeki Hit Parçalar</Text>
                  <Text style={styles.neonRankTag}>TOP 50</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {charts.slice(0, 20).map((song, idx) => (
                    <TouchableOpacity
                      key={'chart_' + song.id + idx}
                      style={styles.chartCard}
                      onPress={() => handlePlaySong(song, charts)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{
                          uri:
                            song.thumbnail ||
                            'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200'
                        }}
                        style={styles.chartThumb}
                      />
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>#{idx + 1}</Text>
                      </View>
                      <Text style={styles.chartTitle} numberOfLines={1}>
                        {song.title}
                      </Text>
                      <Text style={styles.chartArtist} numberOfLines={1}>
                        {song.artist}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Dinamik Keşif Rafları */}
            {sections
              .filter((sec) => sec.items && sec.items.length >= 3)
              .slice(0, 5)
              .map((sec, secIdx) => (
                <View key={sec.id + secIdx} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{sec.title}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#00f0ff" />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                  >
                    {sec.items.slice(0, 15).map((song, idx) => (
                      <TouchableOpacity
                        key={sec.id + '_' + song.id + idx}
                        style={styles.shelfCard}
                        onPress={() => handlePlaySong(song, sec.items)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{
                            uri:
                              song.thumbnail ||
                              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'
                          }}
                          style={styles.shelfThumb}
                        />
                        {song.isVideo && (
                          <View style={styles.videoIndicator}>
                            <Ionicons name="videocam" size={10} color="#00f0ff" />
                            <Text style={styles.videoIndicatorText}>KLİP</Text>
                          </View>
                        )}
                        <Text style={styles.shelfTitle} numberOfLines={1}>
                          {song.title}
                        </Text>
                        <Text style={styles.shelfArtist} numberOfLines={1}>
                          {song.artist}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ))}

            {/* Özel Seçilmiş Parçalar (Dikey Liste) */}
            {trending.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Günün Öne Çıkanları</Text>
                  <Text style={styles.countTag}>{trending.length} Parça</Text>
                </View>
                {trending.slice(0, 25).map((song) => (
                  <SongRow
                    key={'trend_' + song.id}
                    song={song}
                    onPress={() => handlePlaySong(song, trending)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#06090e'
  },
  container: {
    flex: 1
  },
  content: {
    paddingBottom: 24
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0c1320',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden'
  },
  logoImg: {
    width: 38,
    height: 38,
    borderRadius: 10
  },
  titleWrap: {
    marginLeft: 12
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  appName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2
  },
  appSub: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 1.5
  },
  greetingText: {
    color: '#6b7a99',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500'
  },
  adShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20
  },
  adShieldText: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
    letterSpacing: 0.5
  },
  moodsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1522',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  activeMoodChip: {
    backgroundColor: '#00f0ff',
    borderColor: '#00f0ff',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4
  },
  moodIcon: {
    marginRight: 6
  },
  moodText: {
    color: '#b0bdd6',
    fontSize: 13,
    fontWeight: '600'
  },
  activeMoodText: {
    color: '#06090e',
    fontWeight: '800'
  },
  loaderBox: {
    paddingVertical: 60,
    alignItems: 'center'
  },
  loadingText: {
    color: '#6b7a99',
    marginTop: 12,
    fontSize: 14
  },
  section: {
    marginTop: 26,
    paddingHorizontal: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  flowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)'
  },
  flowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f0ff',
    marginRight: 5
  },
  flowBadgeText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '800'
  },
  flowScroll: {
    gap: 14
  },
  flowCard: {
    width: 170,
    height: 170,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0d1522',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    elevation: 5
  },
  flowThumb: {
    width: '100%',
    height: '100%'
  },
  flowOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(6, 9, 14, 0.85)'
  },
  flowPlayBtn: {
    position: 'absolute',
    top: -18,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#00f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5
  },
  flowTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  flowArtist: {
    color: '#8898b8',
    fontSize: 11,
    marginTop: 2
  },
  horizontalScroll: {
    gap: 14
  },
  chartCard: {
    width: 135
  },
  chartThumb: {
    width: 135,
    height: 135,
    borderRadius: 14,
    backgroundColor: '#0d1522',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(6, 9, 14, 0.85)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8
  },
  rankText: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '800'
  },
  neonRankTag: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1
  },
  chartTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8
  },
  chartArtist: {
    color: '#6b7a99',
    fontSize: 11,
    marginTop: 2
  },
  shelfCard: {
    width: 135
  },
  shelfThumb: {
    width: 135,
    height: 135,
    borderRadius: 14,
    backgroundColor: '#0d1522',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  videoIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 9, 14, 0.85)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6
  },
  videoIndicatorText: {
    color: '#00f0ff',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 3
  },
  shelfTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8
  },
  shelfArtist: {
    color: '#6b7a99',
    fontSize: 11,
    marginTop: 2
  },
  countTag: {
    color: '#6b7a99',
    fontSize: 12,
    fontWeight: '600'
  }
});
