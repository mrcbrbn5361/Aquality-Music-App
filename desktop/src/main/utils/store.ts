import Store from 'electron-store';

export interface PlaylistSong {
  id: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
  artistId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Array<string | PlaylistSong>;
  createdAt: number;
}

interface StoreData {
  theme: 'dark' | 'light' | 'system';
  language?: 'tr' | 'en';
  volume: number;
  quality: 'low' | 'medium' | 'high';
  autoPlay: boolean;
  recentlyPlayed: Array<{ id: string; title: string; artist: string; thumbnail: string; timestamp: number; duration?: number; artistId?: string }>;
  likedSongs: string[];
  queue: Array<{ id: string; title: string; artist: string; thumbnail: string; duration?: number; artistId?: string }>;
  queueIndex: number;
  playlists: Playlist[];
  windowBounds?: { x: number; y: number; width: number; height: number };
  oauthClientId?: string;
  oauthClientSecret?: string;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  discordEnabled?: boolean;
}

const defaults: StoreData = {
  theme: 'dark',
  language: 'tr',
  volume: 50,
  quality: 'high',
  autoPlay: true,
  recentlyPlayed: [],
  likedSongs: [],
  queue: [],
  queueIndex: -1,
  playlists: [],
  shuffle: false,
  repeat: 'off'
};

export class StoreManager {
  private store: Store<StoreData>;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.store = new Store<StoreData>({ name: 'aquality-music-data', defaults });
  }

  get<K extends keyof StoreData>(key: K): StoreData[K] {
    try {
      return this.store.get(key);
    } catch {
      return defaults[key];
    }
  }

  set<K extends keyof StoreData>(key: K, value: StoreData[K]): void {
    try {
      this.store.set(key, value);
    } catch (e) {
      console.error('[Store] Set error:', key, e);
    }
  }

  addRecentlyPlayed(song: { id: string; title: string; artist: string; thumbnail: string; duration?: number; artistId?: string }): void {
    const list = this.get('recentlyPlayed').filter(s => s.id !== song.id);
    list.unshift({ ...song, timestamp: Date.now() });
    this.set('recentlyPlayed', list.slice(0, 100));
  }

  toggleLike(songId: string): boolean {
    const likes = this.get('likedSongs');
    const idx = likes.indexOf(songId);
    if (idx > -1) {
      likes.splice(idx, 1);
      this.set('likedSongs', likes);
      return false;
    }
    likes.push(songId);
    this.set('likedSongs', likes);
    return true;
  }

  isLiked(songId: string): boolean {
    return this.get('likedSongs').includes(songId);
  }

  setDebounced<K extends keyof StoreData>(key: K, value: StoreData[K], delayMs = 300): void {
    const existing = this.debounceTimers.get(key as string);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.debounceTimers.delete(key as string);
      this.set(key, value);
    }, delayMs);
    this.debounceTimers.set(key as string, timer);
  }

  createPlaylist(name: string): string {
    const playlists = this.get('playlists');
    const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    playlists.push({ id, name, songs: [], createdAt: Date.now() });
    this.set('playlists', playlists);
    return id;
  }

  deletePlaylist(id: string): void {
    this.set('playlists', this.get('playlists').filter(p => p.id !== id));
  }

  addToPlaylist(playlistId: string, song: string | PlaylistSong): void {
    const playlists = this.get('playlists');
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      const songId = typeof song === 'string' ? song : song.id;
      const exists = pl.songs.some(s => (typeof s === 'string' ? s === songId : s.id === songId));
      if (!exists) {
        pl.songs.push(song);
        this.set('playlists', playlists);
      }
    }
  }

  removeFromPlaylist(playlistId: string, songId: string): void {
    const playlists = this.get('playlists');
    const pl = playlists.find(p => p.id === playlistId);
    if (pl) {
      pl.songs = pl.songs.filter(s => (typeof s === 'string' ? s !== songId : s.id !== songId));
      this.set('playlists', playlists);
    }
  }

  saveWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.set('windowBounds', bounds);
  }

  getWindowBounds(): { x: number; y: number; width: number; height: number } | undefined {
    return this.get('windowBounds');
  }
}
