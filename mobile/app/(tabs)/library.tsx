import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, playerStore } from '../../src/store/player-store';
import { SongRow } from '../../src/components/SongRow';
import { mobilePlayer } from '../../src/services/player';
import { Playlist, Song } from '../../src/types';

export default function LibraryScreen() {
  const { likedIds, recentlyPlayed, playlists } = usePlayer();
  const [activeTab, setActiveTab] = useState<'liked' | 'playlists' | 'recent'>('liked');
  const [newPlaylistModal, setNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  // Beğenilen şarkıları bul
  const likedSongs = recentlyPlayed.filter((s) => likedIds.includes(s.id));

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    playerStore.createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    setNewPlaylistModal(false);
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    Alert.alert('Çalma Listesini Sil', `"${name}" listesini silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          playerStore.deletePlaylist(id);
          if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
        }
      }
    ]);
  };

  const handlePlayAll = (songs: Song[]) => {
    if (songs.length === 0) return;
    playerStore.setQueue(songs, 0);
    mobilePlayer.play(songs[0]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Metro Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Kitaplığım</Text>
            <Text style={styles.screenSub}>Kişisel Müzik Arşivi</Text>
          </View>
          {activeTab === 'playlists' && (
            <TouchableOpacity
              style={styles.addPlaylistBtn}
              onPress={() => setNewPlaylistModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#06090e" />
              <Text style={styles.addPlaylistBtnText}>Yeni Liste</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'liked' && likedSongs.length > 0 && (
            <TouchableOpacity
              style={styles.playAllBtn}
              onPress={() => handlePlayAll(likedSongs)}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={14} color="#06090e" />
              <Text style={styles.playAllBtnText}>Tümünü Çal</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sekme Seçici (Metro Segmented Pills) */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'liked' && styles.activeTabBtn]}
            onPress={() => {
              setActiveTab('liked');
              setSelectedPlaylist(null);
            }}
            activeOpacity={0.75}
          >
            <Ionicons
              name={activeTab === 'liked' ? 'heart' : 'heart-outline'}
              size={14}
              color={activeTab === 'liked' ? '#06090e' : '#94a3b8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'liked' && styles.activeTabText]}>
              Beğenilenler ({likedIds.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'playlists' && styles.activeTabBtn]}
            onPress={() => setActiveTab('playlists')}
            activeOpacity={0.75}
          >
            <Ionicons
              name={activeTab === 'playlists' ? 'albums' : 'albums-outline'}
              size={14}
              color={activeTab === 'playlists' ? '#06090e' : '#94a3b8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'playlists' && styles.activeTabText]}>
              Listeler ({playlists.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'recent' && styles.activeTabBtn]}
            onPress={() => {
              setActiveTab('recent');
              setSelectedPlaylist(null);
            }}
            activeOpacity={0.75}
          >
            <Ionicons
              name={activeTab === 'recent' ? 'time' : 'time-outline'}
              size={14}
              color={activeTab === 'recent' ? '#06090e' : '#94a3b8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
              Geçmiş ({recentlyPlayed.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. BEĞENİLENLER */}
          {activeTab === 'liked' && (
            likedSongs.length > 0 ? (
              likedSongs.map((song, idx) => (
                <SongRow
                  key={song.id + '_' + idx}
                  song={song}
                  index={idx}
                  onPress={() => {
                    playerStore.setQueue(likedSongs, idx);
                    mobilePlayer.play(song);
                  }}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.heartCircle}>
                  <Ionicons name="heart" size={32} color="#00f0ff" />
                </View>
                <Text style={styles.emptyTitle}>Henüz beğendiğiniz şarkı yok</Text>
                <Text style={styles.emptySubtitle}>
                  Dinlediğiniz şarkıların yanındaki kalp ikonuna dokunarak favorilerinize ekleyebilirsiniz.
                </Text>
              </View>
            )
          )}

          {/* 2. ÇALMA LİSTELERİ */}
          {activeTab === 'playlists' && (
            selectedPlaylist ? (
              <View>
                <TouchableOpacity
                  style={styles.backToPlaylistsBtn}
                  onPress={() => setSelectedPlaylist(null)}
                >
                  <Ionicons name="chevron-back" size={18} color="#00f0ff" />
                  <Text style={styles.backToPlaylistsText}>Tüm Listelere Dön</Text>
                </TouchableOpacity>

                <View style={styles.playlistDetailHeader}>
                  <Text style={styles.playlistDetailTitle}>{selectedPlaylist.name}</Text>
                  <Text style={styles.playlistDetailMeta}>
                    {selectedPlaylist.songs.length} Parça
                  </Text>
                  {selectedPlaylist.songs.length > 0 && (
                    <TouchableOpacity
                      style={styles.playPlaylistBtn}
                      onPress={() => handlePlayAll(selectedPlaylist.songs)}
                    >
                      <Ionicons name="play" size={16} color="#06090e" />
                      <Text style={styles.playPlaylistBtnText}>Listeyi Başlat</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedPlaylist.songs.length > 0 ? (
                  selectedPlaylist.songs.map((song, idx) => (
                    <SongRow
                      key={song.id + '_' + idx}
                      song={song}
                      index={idx}
                      onPress={() => {
                        playerStore.setQueue(selectedPlaylist.songs, idx);
                        mobilePlayer.play(song);
                      }}
                    />
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="musical-notes-outline" size={36} color="#64748b" />
                    <Text style={styles.emptyTitle}>Bu liste henüz boş</Text>
                    <Text style={styles.emptySubtitle}>
                      Şarkıları arayıp bu listeye ekleyebilirsiniz.
                    </Text>
                  </View>
                )}
              </View>
            ) : playlists.length > 0 ? (
              <View style={styles.playlistGrid}>
                {playlists.map((pl) => (
                  <TouchableOpacity
                    key={pl.id}
                    style={styles.playlistCard}
                    onPress={() => setSelectedPlaylist(pl)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.playlistThumbWrap}>
                      {pl.thumbnail ? (
                        <Image source={{ uri: pl.thumbnail }} style={styles.playlistThumb} />
                      ) : (
                        <View style={styles.playlistPlaceholder}>
                          <Ionicons name="musical-notes" size={28} color="#00f0ff" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.deletePlaylistIcon}
                        onPress={() => handleDeletePlaylist(pl.id, pl.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.playlistCardTitle} numberOfLines={1}>
                      {pl.name}
                    </Text>
                    <Text style={styles.playlistCardMeta}>
                      {pl.songs.length} Parça
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.heartCircle}>
                  <Ionicons name="albums-outline" size={32} color="#00f0ff" />
                </View>
                <Text style={styles.emptyTitle}>Özel Çalma Listeniz Yok</Text>
                <Text style={styles.emptySubtitle}>
                  Yukarıdaki "Yeni Liste" butonuna dokunarak ilk çalma listenizi oluşturun.
                </Text>
              </View>
            )
          )}

          {/* 3. DİNLEME GEÇMİŞİ */}
          {activeTab === 'recent' && (
            recentlyPlayed.length > 0 ? (
              <View>
                <View style={styles.historyActionsRow}>
                  <Text style={styles.historyCountText}>{recentlyPlayed.length} Parça Kayıtlı</Text>
                  <TouchableOpacity onPress={() => playerStore.clearRecentlyPlayed()}>
                    <Text style={styles.clearHistoryText}>Geçmişi Temizle</Text>
                  </TouchableOpacity>
                </View>
                {recentlyPlayed.map((song, idx) => (
                  <SongRow
                    key={'rec_' + song.id + '_' + idx}
                    song={song}
                    index={idx}
                    onPress={() => {
                      playerStore.setQueue(recentlyPlayed, idx);
                      mobilePlayer.play(song);
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.heartCircle}>
                  <Ionicons name="time-outline" size={32} color="#00f0ff" />
                </View>
                <Text style={styles.emptyTitle}>Dinleme geçmişi boş</Text>
                <Text style={styles.emptySubtitle}>
                  Çaldığınız müzikler otomatik olarak bu listede sıralanır.
                </Text>
              </View>
            )
          )}

          <View style={{ height: 110 }} />
        </ScrollView>

        {/* Yeni Liste Oluşturma Modalı */}
        <Modal
          visible={newPlaylistModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setNewPlaylistModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Yeni Çalma Listesi</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Liste Adı (Örn: Gece Yolculuğu)"
                placeholderTextColor="#64748b"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus={true}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setNewPlaylistName('');
                    setNewPlaylistModal(false);
                  }}
                >
                  <Text style={styles.modalCancelText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleCreatePlaylist}
                >
                  <Text style={styles.modalSaveText}>Oluştur</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    marginBottom: 14
  },
  screenTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '800'
  },
  screenSub: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1
  },
  addPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f0ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18
  },
  addPlaylistBtnText: {
    color: '#06090e',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00f0ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18
  },
  playAllBtnText: {
    color: '#06090e',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    marginBottom: 10,
    gap: 8
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#0e1628',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  activeTabBtn: {
    backgroundColor: '#00f0ff',
    borderColor: '#00f0ff'
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  activeTabText: {
    color: '#06090e',
    fontWeight: '800'
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 70,
    paddingHorizontal: 30
  },
  heartCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center'
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8
  },
  playlistCard: {
    width: '48%',
    backgroundColor: '#0e1628',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  playlistThumbWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#141d30',
    marginBottom: 8
  },
  playlistThumb: {
    width: '100%',
    height: '100%'
  },
  playlistPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deletePlaylistIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(6, 9, 14, 0.85)',
    padding: 6,
    borderRadius: 8
  },
  playlistCardTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700'
  },
  playlistCardMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2
  },
  backToPlaylistsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  backToPlaylistsText: {
    color: '#00f0ff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4
  },
  playlistDetailHeader: {
    marginBottom: 16
  },
  playlistDetailTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800'
  },
  playlistDetailMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10
  },
  playPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#00f0ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18
  },
  playPlaylistBtnText: {
    color: '#06090e',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6
  },
  historyActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2
  },
  historyCountText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600'
  },
  clearHistoryText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0e1628',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)'
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14
  },
  modalInput: {
    backgroundColor: '#06090e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  },
  modalSaveBtn: {
    backgroundColor: '#00f0ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10
  },
  modalSaveText: {
    color: '#06090e',
    fontSize: 13,
    fontWeight: '800'
  }
});
