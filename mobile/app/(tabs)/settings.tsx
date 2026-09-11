import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, playerStore } from '../../src/store/player-store';

export default function SettingsScreen() {
  const { adBlocker } = usePlayer();
  const [autoPlay, setAutoPlay] = useState(true);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [lang, setLang] = useState<'tr' | 'en'>('tr');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Ayarlar</Text>

        {/* Oynatma Ayarları */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Oynatma</Text>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.rowTitle}>Akıllı Reklam Filtresi</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>AKTİF</Text>
                </View>
              </View>
              <Text style={styles.rowDesc}>Video ve müziklerdeki tüm reklamları otomatik engeller ve atlar</Text>
            </View>
            <Switch
              value={adBlocker}
              onValueChange={(val) => playerStore.setAdBlocker(val)}
              trackColor={{ false: '#262f3d', true: '#1ed760' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Otomatik Oynatma</Text>
              <Text style={styles.rowDesc}>Kuyruk bittiğinde benzer müzikleri çalmaya devam et</Text>
            </View>
            <Switch
              value={autoPlay}
              onValueChange={setAutoPlay}
              trackColor={{ false: '#262f3d', true: '#1ed760' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Ses Kalitesi</Text>
              <Text style={styles.rowDesc}>Yüksek kalite daha fazla veri kullanır</Text>
            </View>
            <TouchableOpacity
              style={styles.pillBtn}
              onPress={() => setQuality(quality === 'high' ? 'medium' : quality === 'medium' ? 'low' : 'high')}
            >
              <Text style={styles.pillText}>
                {quality === 'high' ? 'Yüksek (256kbps)' : quality === 'medium' ? 'Orta (160kbps)' : 'Düşük'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dil ve Görünüm */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Dil ve Görünüm</Text>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Uygulama Dili</Text>
              <Text style={styles.rowDesc}>Arayüz dilini değiştirin</Text>
            </View>
            <TouchableOpacity
              style={styles.pillBtn}
              onPress={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            >
              <Text style={styles.pillText}>{lang === 'tr' ? 'Türkçe' : 'English'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Tema</Text>
              <Text style={styles.rowDesc}>Koyu Spotify Teması</Text>
            </View>
            <Text style={styles.dimText}>Koyu</Text>
          </View>
        </View>

        {/* Uygulama Hakkında */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Aquality Music</Text>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Sürüm</Text>
              <Text style={styles.rowDesc}>v1.0.0 (Expo Mobile Client)</Text>
            </View>
            <Ionicons name="information-circle-outline" size={20} color="#8892b0" />
          </View>
        </View>
      </ScrollView>
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
  content: {
    paddingBottom: 110
  },
  screenTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16
  },
  group: {
    marginBottom: 24,
    paddingHorizontal: 16
  },
  groupTitle: {
    color: '#1ed760',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)'
  },
  rowMeta: {
    flex: 1,
    marginRight: 12
  },
  rowTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  rowDesc: {
    color: '#8892b0',
    fontSize: 12,
    marginTop: 2
  },
  pillBtn: {
    backgroundColor: '#181d26',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  pillText: {
    color: '#1ed760',
    fontSize: 13,
    fontWeight: '600'
  },
  dimText: {
    color: '#8892b0',
    fontSize: 14
  },
  proBadge: {
    backgroundColor: 'rgba(30, 215, 96, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#1ed760'
  },
  proBadgeText: {
    color: '#1ed760',
    fontSize: 10,
    fontWeight: '700'
  }
});
