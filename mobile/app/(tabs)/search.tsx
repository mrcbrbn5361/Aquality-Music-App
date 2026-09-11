import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Song, SearchFilter } from '../../src/types';
import { mobileApi } from '../../src/api/innertube';
import { SongRow } from '../../src/components/SongRow';
import { mobilePlayer } from '../../src/services/player';
import { playerStore } from '../../src/store/player-store';

const METRO_GENRES = [
  { name: 'Türkçe Rap & Trap', icon: 'mic', bg: '#4338ca' },
  { name: 'Pop & Dans Hitleri', icon: 'sparkles', bg: '#0284c7' },
  { name: 'Rock & Metal', icon: 'musical-notes', bg: '#b91c1c' },
  { name: 'R&B & Cyber Soul', icon: 'heart', bg: '#9333ea' },
  { name: 'Chill & Akustik', icon: 'cafe', bg: '#0d9488' },
  { name: 'Gece & Focus', icon: 'moon', bg: '#312e81' },
  { name: 'Elektronik & Club', icon: 'flash', bg: '#d97706' },
  { name: 'Klasik & Sinematik', icon: 'film', bg: '#475569' }
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<any>(null);

  // Anlık arama önerileri
  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setSuggestions([]);
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const sugs = await mobileApi.getSuggestions(text);
        setSuggestions(sugs.slice(0, 5));
      } catch {}
    }, 250);
  };

  const executeSearch = async (text: string, currentFilter = filter) => {
    if (!text.trim()) return;
    setSuggestions([]);
    setLoading(true);
    try {
      const res = await mobileApi.search(text, currentFilter);
      if (currentFilter === 'videos') {
        setResults(res.videos);
      } else if (currentFilter === 'songs') {
        setResults(res.songs);
      } else {
        setResults([...res.songs, ...res.videos]);
      }
    } catch (e) {
      console.warn('[Search] error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (f: SearchFilter) => {
    setFilter(f);
    if (query.trim()) {
      executeSearch(query, f);
    }
  };

  const handleSelectSuggestion = (sug: string) => {
    setQuery(sug);
    executeSearch(sug);
  };

  const handlePlayResult = (song: Song) => {
    playerStore.setQueue(results, results.findIndex((s) => s.id === song.id));
    mobilePlayer.play(song);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Metro Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Keşfet & Ara</Text>
          <View style={styles.metroBadge}>
            <Ionicons name="search" size={12} color="#00f0ff" />
            <Text style={styles.metroBadgeText}>CANLI İNDEKS</Text>
          </View>
        </View>

        {/* Metro Arama Çubuğu */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#00f0ff" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şarkı, sanatçı veya tür ara..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => executeSearch(query)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setResults([]);
                setSuggestions([]);
              }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Canlı Öneri Açılır Listesi */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.map((sug, i) => (
              <TouchableOpacity
                key={'sug_' + i}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(sug)}
                activeOpacity={0.7}
              >
                <Ionicons name="search-outline" size={14} color="#00f0ff" style={{ marginRight: 10 }} />
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {sug}
                </Text>
                <Ionicons name="arrow-up-outline" size={14} color="#64748b" style={{ transform: [{ rotate: '-45deg' }] }} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Filtre Çipleri */}
        {query.length > 0 && (
          <View style={styles.filterRow}>
            {(['all', 'songs', 'videos', 'albums', 'artists'] as SearchFilter[]).map((f) => {
              const active = filter === f;
              const label =
                f === 'all'
                  ? 'Tümü'
                  : f === 'songs'
                  ? 'Şarkılar'
                  : f === 'videos'
                  ? 'Klipler'
                  : f === 'albums'
                  ? 'Albümler'
                  : 'Sanatçılar';

              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, active && styles.activeChip]}
                  onPress={() => handleFilterChange(f)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterText, active && styles.activeFilterText]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Sonuçlar veya MetroList Tür Matrisi */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="small" color="#00f0ff" />
              <Text style={styles.loaderText}>Aquality arama motoru taranıyor...</Text>
            </View>
          ) : results.length > 0 ? (
            <View style={styles.resultsWrap}>
              <Text style={styles.resultsCountText}>{results.length} Parça Bulundu</Text>
              {results.map((song, idx) => (
                <SongRow
                  key={song.id + '_' + idx}
                  song={song}
                  index={idx}
                  onPress={() => handlePlayResult(song)}
                />
              ))}
            </View>
          ) : query.trim().length > 0 ? (
            <View style={styles.noResultsBox}>
              <Ionicons name="search-outline" size={42} color="#64748b" />
              <Text style={styles.noResultTitle}>Sonuç Bulunamadı</Text>
              <Text style={styles.noResultSub}>
                "{query}" için farklı bir anahtar kelime veya filtre deneyin.
              </Text>
            </View>
          ) : (
            <View style={styles.genresSection}>
              <View style={styles.genresHeaderRow}>
                <Text style={styles.genresSectionTitle}>Müzik Türleri & Keşif</Text>
                <Text style={styles.genresSubTitle}>MetroList Koleksiyonu</Text>
              </View>
              <View style={styles.genreGrid}>
                {METRO_GENRES.map((g) => (
                  <TouchableOpacity
                    key={g.name}
                    style={[styles.genreCard, { backgroundColor: g.bg }]}
                    onPress={() => {
                      setQuery(g.name);
                      executeSearch(g.name);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.genreIconWrap}>
                      <Ionicons name={g.icon as any} size={20} color="#fff" />
                    </View>
                    <Text style={styles.genreTitle}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
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
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    marginBottom: 12
  },
  screenTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2
  },
  metroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14
  },
  metroBadgeText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 5,
    letterSpacing: 0.5
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0e1628',
    marginHorizontal: 18,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.18)'
  },
  searchIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 15,
    height: '100%',
    fontWeight: '500'
  },
  clearBtn: {
    padding: 6
  },
  suggestionsBox: {
    backgroundColor: '#0e1628',
    marginHorizontal: 18,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    overflow: 'hidden',
    zIndex: 50
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)'
  },
  suggestionText: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 13.5,
    fontWeight: '500'
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 4,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0e1628',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  activeChip: {
    backgroundColor: '#00f0ff',
    borderColor: '#00f0ff'
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  activeFilterText: {
    color: '#06090e',
    fontWeight: '800'
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12
  },
  loaderWrap: {
    alignItems: 'center',
    paddingVertical: 50
  },
  loaderText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 13
  },
  resultsWrap: {
    paddingTop: 4
  },
  resultsCountText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8
  },
  noResultsBox: {
    alignItems: 'center',
    paddingVertical: 70
  },
  noResultTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14
  },
  noResultSub: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 260
  },
  genresSection: {
    marginTop: 8
  },
  genresHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  genresSectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  genresSubTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12
  },
  genreCard: {
    width: '48%',
    height: 94,
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4
  },
  genreIconWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 6,
    borderRadius: 8
  },
  genreTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});
