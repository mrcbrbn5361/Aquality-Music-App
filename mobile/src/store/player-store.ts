import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Song, Playlist, ThemeAccent } from '../types';

interface PlayerState {
  currentSong: Song | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  queue: Song[];
  queueIndex: number;
  likedIds: string[];
  likedSongs: Song[];
  recentlyPlayed: Song[];
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  adBlocker: boolean;
  autoPlay: boolean;
  playlists: Playlist[];
  themeAccent: ThemeAccent;
  audioQuality: 'high' | 'medium' | 'low';
  playerModalOpen: boolean;
}

const STORAGE_KEYS = {
  LIKED: '@aquality_liked',
  LIKED_SONGS: '@aquality_liked_songs',
  RECENT: '@aquality_recent',
  VOLUME: '@aquality_volume',
  ADBLOCK: '@aquality_adblock',
  AUTOPLAY: '@aquality_autoplay',
  QUEUE: '@aquality_queue',
  QUEUE_INDEX: '@aquality_queue_index',
  PLAYLISTS: '@aquality_playlists',
  ACCENT: '@aquality_accent',
  QUALITY: '@aquality_quality'
};

// AsyncStorage şişmesini önlemek için üst sınırlar (Android ~6MB limiti)
const MAX_PERSISTED_QUEUE = 200;
const MAX_RECENTLY_PLAYED = 100;
const MAX_LIKED_SONGS = 500;
// İlerleme bildirimleri için minimum delta (saniye) — 300ms'lik WebView
// nabzını ~1 güncelleme/sn düzeyine indirir, yeniden çizim fırtınasını önler.
const PROGRESS_NOTIFY_DELTA = 0.5;

class PlayerStore {
  private state: PlayerState = {
    currentSong: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    queue: [],
    queueIndex: -1,
    likedIds: [],
    likedSongs: [],
    recentlyPlayed: [],
    volume: 80,
    shuffle: false,
    repeat: 'off',
    adBlocker: true,
    autoPlay: true,
    playlists: [],
    themeAccent: 'cyan',
    audioQuality: 'high',
    playerModalOpen: false
  };

  private listeners = new Set<() => void>();
  private progressListeners = new Set<() => void>();
  private lastNotifiedTime = -1;
  private lastNotifiedDuration = -1;

  constructor() {
    this.loadPersistedData();
  }

  private parseStoredArray(raw: string | null): Song[] {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is Song =>
          !!item && typeof item === 'object' &&
          typeof (item as Song).id === 'string' &&
          typeof (item as Song).title === 'string'
      );
    } catch (e) {
      console.warn('[PlayerStore] Kayıtlı liste çözümlenemedi:', e);
      return [];
    }
  }

  private async loadPersistedData() {
    try {
      const [liked, likedSongsRaw, recent, vol, adblock, autoplay, queue, queueIndex, playlists, accent, quality] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LIKED),
        AsyncStorage.getItem(STORAGE_KEYS.LIKED_SONGS),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT),
        AsyncStorage.getItem(STORAGE_KEYS.VOLUME),
        AsyncStorage.getItem(STORAGE_KEYS.ADBLOCK),
        AsyncStorage.getItem(STORAGE_KEYS.AUTOPLAY),
        AsyncStorage.getItem(STORAGE_KEYS.QUEUE),
        AsyncStorage.getItem(STORAGE_KEYS.QUEUE_INDEX),
        AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS),
        AsyncStorage.getItem(STORAGE_KEYS.ACCENT),
        AsyncStorage.getItem(STORAGE_KEYS.QUALITY)
      ]);

      if (liked) {
        try {
          const ids: unknown = JSON.parse(liked);
          if (Array.isArray(ids)) {
            this.state.likedIds = ids.filter((id): id is string => typeof id === 'string');
          }
        } catch (e) {
          console.warn('[PlayerStore] Beğenilen kimlikleri çözümlenemedi:', e);
        }
      }
      const storedLikedSongs = this.parseStoredArray(likedSongsRaw);
      if (storedLikedSongs.length > 0) {
        this.state.likedSongs = storedLikedSongs.slice(0, MAX_LIKED_SONGS);
        // Metadata'sı olan şarkıların kimliklerini geri yükle
        const restoredIds = new Set(this.state.likedSongs.map((s) => s.id));
        for (const id of this.state.likedIds) restoredIds.add(id);
        this.state.likedIds = Array.from(restoredIds);
      }
      const storedRecent = this.parseStoredArray(recent);
      if (storedRecent.length > 0) {
        this.state.recentlyPlayed = storedRecent.slice(0, MAX_RECENTLY_PLAYED);
      }
      if (vol !== null && vol !== '') {
        const volNum = Number(vol);
        if (Number.isFinite(volNum)) this.state.volume = Math.min(100, Math.max(0, volNum));
      }
      if (adblock !== null) this.state.adBlocker = adblock === 'true';
      if (autoplay !== null) this.state.autoPlay = autoplay === 'true';
      if (playlists) {
        try {
          const parsed: unknown = JSON.parse(playlists);
          if (Array.isArray(parsed)) this.state.playlists = parsed as Playlist[];
        } catch (e) {
          console.warn('[PlayerStore] Çalma listeleri çözümlenemedi:', e);
        }
      }
      if (accent === 'cyan' || accent === 'indigo' || accent === 'amber' || accent === 'emerald') {
        this.state.themeAccent = accent;
      }
      if (quality === 'high' || quality === 'medium' || quality === 'low') {
        this.state.audioQuality = quality;
      }

      if (queue) {
        const parsedQueue = this.parseStoredArray(queue);
        if (parsedQueue.length > 0) {
          this.state.queue = parsedQueue;
          const idx = queueIndex ? Number(queueIndex) : 0;
          this.state.queueIndex = (Number.isFinite(idx) && idx >= 0 && idx < parsedQueue.length) ? idx : 0;
          this.state.currentSong = parsedQueue[this.state.queueIndex] || null;
        }
      }
      this.notify();
    } catch (e) {
      console.warn('[PlayerStore] Load storage error:', e);
    }
  }

  private persistQueue() {
    // Yalnızca kuyruğun son bölümünü sakla — AsyncStorage limitini korur.
    const tail = this.state.queue.slice(-MAX_PERSISTED_QUEUE);
    const indexInTail = Math.max(0, this.state.queueIndex - (this.state.queue.length - tail.length));
    AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(tail)).catch((e) => {
      console.warn('[PlayerStore] Kuyruk kaydedilemedi:', e);
    });
    AsyncStorage.setItem(STORAGE_KEYS.QUEUE_INDEX, String(indexInTail)).catch((e) => {
      console.warn('[PlayerStore] Kuyruk konumu kaydedilemedi:', e);
    });
  }

  getState(): PlayerState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeProgress(listener: () => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private notifyProgress() {
    this.progressListeners.forEach((l) => l());
  }

  setCurrentSong(song: Song) {
    this.state.currentSong = song;
    this.notify();
  }

  setPlaying(playing: boolean) {
    this.state.playing = playing;
    this.notify();
  }

  setPlayerModalOpen(open: boolean) {
    this.state.playerModalOpen = open;
    this.notify();
  }

  setProgress(currentTime: number, duration: number) {
    const safeTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : this.state.duration;
    const durationChanged = safeDuration !== this.state.duration;
    this.state.currentTime = safeTime;
    if (durationChanged) this.state.duration = safeDuration;
    // 300ms'lik nabzı kıs: yalnızca anlamlı ilerleme varsa bildir.
    // Bu, saniyede ~3 tam yeniden çizim yerine ~1-2 çizim demektir.
    if (durationChanged || Math.abs(safeTime - this.lastNotifiedTime) >= PROGRESS_NOTIFY_DELTA) {
      this.lastNotifiedTime = safeTime;
      this.lastNotifiedDuration = safeDuration;
      this.notifyProgress();
    }
  }

  setQueue(queue: Song[], startIndex = 0) {
    this.state.queue = queue;
    this.state.queueIndex = startIndex;
    if (queue[startIndex]) {
      this.state.currentSong = queue[startIndex];
    }
    this.persistQueue();
    this.notify();
  }

  addToQueue(song: Song): boolean {
    if (!song || typeof song.id !== 'string' || song.id.length === 0) return false;
    // Yinelenenleri engelle: aynı parça kuyrukta iki kez çalmasın.
    if (this.state.queue.some((s) => s.id === song.id)) return false;
    this.state.queue.push(song);
    this.persistQueue();
    this.notify();
    return true;
  }

  getNextSong(): Song | null {
    if (this.state.queue.length === 0) return this.state.currentSong;

    // Tekrar: Tek parça (one)
    if (this.state.repeat === 'one') {
      return this.state.currentSong;
    }

    // Karışık çalma (shuffle) — reddetme örneklemesi ile yansız seçim
    if (this.state.shuffle && this.state.queue.length > 1) {
      let randIdx = this.state.queueIndex;
      for (let attempt = 0; attempt < 10 && randIdx === this.state.queueIndex; attempt++) {
        randIdx = Math.floor(Math.random() * this.state.queue.length);
      }
      if (randIdx === this.state.queueIndex) {
        randIdx = (randIdx + 1) % this.state.queue.length;
      }
      this.state.queueIndex = randIdx;
      this.state.currentSong = this.state.queue[randIdx];
      this.persistQueue();
      this.notify();
      return this.state.currentSong;
    }

    let nextIdx = this.state.queueIndex + 1;
    if (nextIdx >= this.state.queue.length) {
      if (this.state.repeat === 'all') {
        nextIdx = 0;
      } else {
        return null;
      }
    }
    this.state.queueIndex = nextIdx;
    this.state.currentSong = this.state.queue[nextIdx];
    this.persistQueue();
    this.notify();
    return this.state.currentSong;
  }

  getPreviousSong(): Song | null {
    if (this.state.queue.length === 0) return this.state.currentSong;

    if (this.state.repeat === 'one') {
      return this.state.currentSong;
    }

    let prevIdx = this.state.queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = this.state.repeat === 'all' ? this.state.queue.length - 1 : 0;
    }
    this.state.queueIndex = prevIdx;
    this.state.currentSong = this.state.queue[prevIdx];
    this.persistQueue();
    this.notify();
    return this.state.currentSong;
  }

  toggleShuffle(): boolean {
    this.state.shuffle = !this.state.shuffle;
    this.notify();
    return this.state.shuffle;
  }

  toggleRepeat(): 'off' | 'all' | 'one' {
    const cycle: Record<'off' | 'all' | 'one', 'off' | 'all' | 'one'> = {
      off: 'all',
      all: 'one',
      one: 'off'
    };
    this.state.repeat = cycle[this.state.repeat] || 'off';
    this.notify();
    return this.state.repeat;
  }

  /**
   * Beğeni durumunu değiştirir. Şarkı nesnesi verildiğinde metadata da
   * saklanır — böylece "Beğenilenler" listesi dinleme geçmişinden
   * bağımsız olarak doğru çalışır.
   */
  toggleLike(song: Song | string): boolean {
    const songId = typeof song === 'string' ? song : song.id;
    const songObj: Song | null = typeof song === 'string' ? null : song;
    if (!songId) return false;
    const idx = this.state.likedIds.indexOf(songId);
    let isLiked = false;
    if (idx > -1) {
      this.state.likedIds.splice(idx, 1);
      this.state.likedSongs = this.state.likedSongs.filter((s) => s.id !== songId);
      isLiked = false;
    } else {
      this.state.likedIds.push(songId);
      if (songObj) {
        this.state.likedSongs = this.state.likedSongs.filter((s) => s.id !== songId);
        this.state.likedSongs.unshift(songObj);
        if (this.state.likedSongs.length > MAX_LIKED_SONGS) {
          const removed = this.state.likedSongs.splice(MAX_LIKED_SONGS);
          const removedIds = new Set(removed.map((s) => s.id));
          this.state.likedIds = this.state.likedIds.filter((id) => !removedIds.has(id));
        }
      }
      isLiked = true;
    }
    AsyncStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(this.state.likedIds)).catch((e) => {
      console.warn('[PlayerStore] Beğeniler kaydedilemedi:', e);
    });
    AsyncStorage.setItem(STORAGE_KEYS.LIKED_SONGS, JSON.stringify(this.state.likedSongs)).catch((e) => {
      console.warn('[PlayerStore] Beğenilen şarkılar kaydedilemedi:', e);
    });
    this.notify();
    return isLiked;
  }

  isLiked(songId: string): boolean {
    return this.state.likedIds.includes(songId);
  }

  addRecentlyPlayed(song: Song) {
    this.state.recentlyPlayed = this.state.recentlyPlayed.filter((s) => s.id !== song.id);
    this.state.recentlyPlayed.unshift(song);
    if (this.state.recentlyPlayed.length > MAX_RECENTLY_PLAYED) {
      this.state.recentlyPlayed.length = MAX_RECENTLY_PLAYED;
    }
    AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(this.state.recentlyPlayed)).catch((e) => {
      console.warn('[PlayerStore] Geçmiş kaydedilemedi:', e);
    });
    this.notify();
  }

  setAdBlocker(enabled: boolean) {
    this.state.adBlocker = enabled;
    AsyncStorage.setItem(STORAGE_KEYS.ADBLOCK, String(enabled)).catch((e) => {
      console.warn('[PlayerStore] Reklam engelleyici ayarı kaydedilemedi:', e);
    });
    this.notify();
  }

  setAutoPlay(enabled: boolean) {
    this.state.autoPlay = enabled;
    AsyncStorage.setItem(STORAGE_KEYS.AUTOPLAY, String(enabled)).catch((e) => {
      console.warn('[PlayerStore] Otomatik çalma ayarı kaydedilemedi:', e);
    });
    this.notify();
  }

  setVolume(vol: number) {
    const safeVol = Number.isFinite(vol) ? Math.min(100, Math.max(0, vol)) : this.state.volume;
    this.state.volume = safeVol;
    AsyncStorage.setItem(STORAGE_KEYS.VOLUME, String(safeVol)).catch((e) => {
      console.warn('[PlayerStore] Ses düzeyi kaydedilemedi:', e);
    });
    this.notify();
  }

  createPlaylist(name: string): Playlist {
    const newPlaylist: Playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim() || 'Yeni Çalma Listesi',
      songs: [],
      createdAt: Date.now()
    };
    this.state.playlists.unshift(newPlaylist);
    this.persistPlaylists();
    this.notify();
    return newPlaylist;
  }

  deletePlaylist(playlistId: string) {
    this.state.playlists = this.state.playlists.filter((p) => p.id !== playlistId);
    this.persistPlaylists();
    this.notify();
  }

  addSongToPlaylist(playlistId: string, song: Song): boolean {
    const pl = this.state.playlists.find((p) => p.id === playlistId);
    if (!pl) return false;
    if (!pl.songs.some((s) => s.id === song.id)) {
      pl.songs.unshift(song);
      if (!pl.thumbnail) pl.thumbnail = song.thumbnail;
      this.persistPlaylists();
      this.notify();
      return true;
    }
    return false;
  }

  removeSongFromPlaylist(playlistId: string, songId: string) {
    const pl = this.state.playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    pl.songs = pl.songs.filter((s) => s.id !== songId);
    if (pl.songs.length === 0) {
      pl.thumbnail = undefined;
    } else {
      pl.thumbnail = pl.songs[0].thumbnail;
    }
    this.persistPlaylists();
    this.notify();
  }

  private persistPlaylists() {
    AsyncStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(this.state.playlists)).catch(() => {});
  }

  setThemeAccent(accent: ThemeAccent) {
    this.state.themeAccent = accent;
    AsyncStorage.setItem(STORAGE_KEYS.ACCENT, accent).catch(() => {});
    this.notify();
  }

  setAudioQuality(quality: 'high' | 'medium' | 'low') {
    this.state.audioQuality = quality;
    AsyncStorage.setItem(STORAGE_KEYS.QUALITY, quality).catch(() => {});
    this.notify();
  }

  clearRecentlyPlayed() {
    this.state.recentlyPlayed = [];
    AsyncStorage.removeItem(STORAGE_KEYS.RECENT).catch((e) => {
      console.warn('[PlayerStore] Geçmiş silinemedi:', e);
    });
    this.notify();
  }

  /**
   * Tüm geçici önbellek verilerini temizler: dinleme geçmişi, ilerleme
   * sayaçları. Kullanıcı verileri (beğeniler, çalma listeleri, kuyruk,
   * ayarlar) korunur.
   */
  async clearAllCache() {
    this.state.recentlyPlayed = [];
    this.state.currentTime = 0;
    this.lastNotifiedTime = -1;
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.RECENT);
    } catch (e) {
      console.warn('[PlayerStore] Önbellek temizlenemedi:', e);
    }
    this.notify();
    this.notifyProgress();
  }
}

export const playerStore = new PlayerStore();

export function usePlayer() {
  const [state, setState] = useState(playerStore.getState());

  useEffect(() => {
    return playerStore.subscribe(() => {
      setState({ ...playerStore.getState() });
    });
  }, []);

  return state;
}

/**
 * Yalnızca ihtiyaç duyulan alanlara abone olur — tüm durum nesnesini
 * kopyalamak yerine seçilen dilimi döndürür. Sık güncellenen alanlar
 * (örn. kuyruk) değiştiğinde ilgisiz bileşenlerin yeniden çizilmesini önler.
 */
export function usePlayerSelector<T>(selector: (state: PlayerState) => T): T {
  return useSyncExternalStore(
    (onChange) => playerStore.subscribe(onChange),
    () => selector(playerStore.getState()),
    () => selector(playerStore.getState())
  );
}

export function usePlayerProgress() {
  const [progress, setProgress] = useState({
    currentTime: playerStore.getState().currentTime,
    duration: playerStore.getState().duration
  });

  useEffect(() => {
    return playerStore.subscribeProgress(() => {
      const s = playerStore.getState();
      setProgress({ currentTime: s.currentTime, duration: s.duration });
    });
  }, []);

  return progress;
}
