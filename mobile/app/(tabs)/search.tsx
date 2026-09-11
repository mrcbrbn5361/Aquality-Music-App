import React, { useState } from 'react';
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

const GENRES = [
  { name: 'Pop', color: '#8c1932' },
  { name: 'Hip-Hop', color: '#ba5d07' },
  { name: 'Rock', color: '#1e3264' },
  { name: 'Dans & Elektronik', color: '#477d95' },
  { name: 'R&B', color: '#dc148c' },
  { name: 'Akustik & Chill', color: '#8d67ab' },
  { name: 'Jazz & Blues', color: '#503750' },
  { name: 'Klasik', color: '#7d4b32' }
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string, currentFilter = filter) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

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
      console.warn('Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (f: SearchFilter) => {
    setFilter(f);
    if (query.trim()) {
      handleSearch(query, f);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Ara</Text>

        {/* Arama Inputu */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#8892b0" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Şarkı, sanatçı veya albüm ara..."
            placeholderTextColor="#8892b0"
            value={query}
            onChangeText={(t) => handleSearch(t)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#8892b0" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtre Çipleri */}
        {query.length > 0 && (
          <View style={styles.filterRow}>
            {(['all', 'songs', 'albums', 'artists'] as SearchFilter[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.activeChip]}
                onPress={() => handleFilterChange(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                  {f === 'all' ? 'Tümü' : f === 'songs' ? 'Şarkılar' : f === 'albums' ? 'Albümler' : 'Sanatçılar'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sonuçlar veya Tür Kartları */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator size="small" color="#1ed760" style={styles.loader} />
          ) : query.length > 0 ? (
            results.length > 0 ? (
              results.map((song, idx) => (
                <SongRow key={song.id + idx} song={song} index={idx} />
              ))
            ) : (
              <Text style={styles.noResultText}>"{query}" için sonuç bulunamadı.</Text>
            )
          ) : (
            <View style={styles.genreSection}>
              <Text style={styles.sectionHeader}>Hepsine Göz At</Text>
              <View style={styles.genreGrid}>
                {GENRES.map((g) => (
                  <TouchableOpacity
                    key={g.name}
                    style={[styles.genreCard, { backgroundColor: g.color }]}
                    onPress={() => handleSearch(g.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.genreTitle}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
  screenTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 12
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181d26',
    marginHorizontal: 16,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 44
  },
  searchIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: '100%'
  },
  clearBtn: {
    padding: 4
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#181d26',
    marginRight: 8
  },
  activeChip: {
    backgroundColor: '#1ed760'
  },
  filterText: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '600'
  },
  activeFilterText: {
    color: '#0b0e14'
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 8
  },
  loader: {
    marginTop: 30
  },
  noResultText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14
  },
  genreSection: {
    paddingHorizontal: 16,
    marginTop: 10
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  genreCard: {
    width: '48%',
    height: 90,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'flex-start'
  },
  genreTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});
