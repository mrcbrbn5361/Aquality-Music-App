import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, playerStore } from '../../src/store/player-store';
import { ThemeAccent } from '../../src/types';

const ACCENTS: { id: ThemeAccent; label: string; color: string }[] = [
  { id: 'cyan', label: 'Siber Mavi', color: '#00f0ff' },
  { id: 'indigo', label: 'Neon İndigo', color: '#818cf8' },
  { id: 'amber', label: 'Güneş Sarısı', color: '#f59e0b' },
  { id: 'emerald', label: 'Zümrüt', color: '#10b981' }
];

export default function SettingsScreen() {
  const { adBlocker, audioQuality, themeAccent, autoPlay } = usePlayer();

  const handleClearHistory = () => {
    Alert.alert(
      'Geçmişi Temizle',
      'Dinleme geçmişiniz sıfırlanacak. Onaylıyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            playerStore.clearRecentlyPlayed();
            Alert.alert('Tamamlandı', 'Dinleme geçmişi temizlendi.');
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    playerStore.clearAllCache().then(() => {
      Alert.alert('Önbellek Temizlendi', 'Uygulama geçici verileri sıfırlandı.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Metro Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Ayarlar</Text>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={12} color="#00f0ff" />
            <Text style={styles.badgeText}>METRO PRO</Text>
          </View>
        </View>

        {/* 1. SES VE AKIŞ AYARLARI */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Ses & Oynatma</Text>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.rowTitle}>Akıllı Reklam Katili</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>AKTİF</Text>
                </View>
              </View>
              <Text style={styles.rowDesc}>
                YouTube Music reklamlarını otomatik olarak algılar, sessize alır ve atlar
              </Text>
            </View>
            <Switch
              value={adBlocker}
              onValueChange={(val) => playerStore.setAdBlocker(val)}
              trackColor={{ false: '#162238', true: '#00f0ff' }}
              thumbColor="#f8fafc"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Sonsuz Radyo (Otomatik Çalma)</Text>
              <Text style={styles.rowDesc}>
                Kuyruk bittiğinde parçanın havasına uygun benzer şarkıları çalmaya devam et
              </Text>
            </View>
            <Switch
              value={autoPlay}
              onValueChange={(val) => playerStore.setAutoPlay(val)}
              trackColor={{ false: '#162238', true: '#00f0ff' }}
              thumbColor="#f8fafc"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Akış Kalitesi</Text>
              <Text style={styles.rowDesc}>
                {audioQuality === 'high'
                  ? 'Hi-Fi 256 kbps (Kayıpsıza Yakın Ses)'
                  : audioQuality === 'medium'
                  ? 'Standart 160 kbps (Dengeli)'
                  : 'Tasarruf 96 kbps (Düşük Veri)'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.pillBtn}
              onPress={() => {
                const nextQ = audioQuality === 'high' ? 'medium' : audioQuality === 'medium' ? 'low' : 'high';
                playerStore.setAudioQuality(nextQ);
              }}
            >
              <Text style={styles.pillText}>
                {audioQuality === 'high' ? 'Hi-Fi 256k' : audioQuality === 'medium' ? '160k' : '96k'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. GÖRÜNÜM VE METRO TEMA */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Görünüm & MetroList Teması</Text>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Arayüz Paleti</Text>
              <Text style={styles.rowDesc}>MetroList Vurgu Rengi</Text>
            </View>
            <View style={styles.accentSelector}>
              {ACCENTS.map((acc) => {
                const isSelected = themeAccent === acc.id;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    style={[
                      styles.accentCircle,
                      { backgroundColor: acc.color },
                      isSelected && styles.activeAccentCircle
                    ]}
                    onPress={() => playerStore.setThemeAccent(acc.id)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#06090e" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Tema Stili</Text>
              <Text style={styles.rowDesc}>Obsidiyen & Siber Neon</Text>
            </View>
            <Text style={styles.dimText}>{ACCENTS.find(a => a.id === themeAccent)?.label || 'Siber Mavi'}</Text>
          </View>
        </View>

        {/* 3. VERİ VE DEPOLAMA */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Depolama & Önbellek</Text>

          <TouchableOpacity style={styles.actionRow} onPress={handleClearHistory}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Dinleme Geçmişini Sıfırla</Text>
              <Text style={styles.rowDesc}>Kitaplıktaki tüm çalma geçmişini siler</Text>
            </View>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Önbelleği Temizle</Text>
              <Text style={styles.rowDesc}>Geçici bellek verilerini serbest bırakır</Text>
            </View>
            <Ionicons name="refresh-outline" size={18} color="#00f0ff" />
          </TouchableOpacity>
        </View>

        {/* 4. HAKKINDA */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Uygulama Hakkında</Text>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Aquality Music Mobile</Text>
              <Text style={styles.rowDesc}>v1.0.0 (MetroList Mimarisi / Expo Go)</Text>
            </View>
            <Ionicons name="musical-notes" size={20} color="#00f0ff" />
          </View>

          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.rowTitle}>Desteklenen Platformlar</Text>
              <Text style={styles.rowDesc}>Android & iOS • Expo Go Uyumlu</Text>
            </View>
            <Ionicons name="phone-portrait-outline" size={18} color="#64748b" />
          </View>
        </View>

        <View style={{ height: 110 }} />
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
    paddingHorizontal: 18,
    paddingTop: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 16
  },
  screenTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.5
  },
  group: {
    marginBottom: 26,
    backgroundColor: '#0c1424',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)'
  },
  groupTitle: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)'
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)'
  },
  rowMeta: {
    flex: 1,
    marginRight: 12
  },
  rowTitle: {
    color: '#f8fafc',
    fontSize: 14.5,
    fontWeight: '700'
  },
  rowDesc: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16
  },
  pillBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  pillText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '800'
  },
  dimText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600'
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)'
  },
  statusBadgeText: {
    color: '#00f0ff',
    fontSize: 9,
    fontWeight: '800'
  },
  accentSelector: {
    flexDirection: 'row',
    gap: 8
  },
  accentCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeAccentCircle: {
    borderWidth: 2,
    borderColor: '#fff'
  }
});
