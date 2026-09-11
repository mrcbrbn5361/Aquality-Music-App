import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Song } from '../types';

interface PlayerState {
  currentSong: Song | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  queue: Song[];
  queueIndex: number;
  likedIds: string[];
  recentlyPlayed: Song[];
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  adBlocker: boolean;
}

const STORAGE_KEYS = {
  LIKED: '@aquality_liked',
  RECENT: '@aquality_recent',
  VOLUME: '@aquality_volume',
  ADBLOCK: '@aquality_adblock',
  QUEUE: '@aquality_queue',
  QUEUE_INDEX: '@aquality_queue_index'
};

class PlayerStore {
  private state: PlayerState = {
    currentSong: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    queue: [],
    queueIndex: -1,
    likedIds: [],
    recentlyPlayed: [],
    volume: 80,
    shuffle: false,
    repeat: 'off',
    adBlocker: true
  };

  private listeners = new Set<() => void>();
  private progressListeners = new Set<() => void>();

  constructor() {
    this.loadPersistedData();
  }

  private async loadPersistedData() {
    try {
      const [liked, recent, vol, adblock, queue, queueIndex] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LIKED),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT),
        AsyncStorage.getItem(STORAGE_KEYS.VOLUME),
        AsyncStorage.getItem(STORAGE_KEYS.ADBLOCK),
        AsyncStorage.getItem(STORAGE_KEYS.QUEUE),
        AsyncStorage.getItem(STORAGE_KEYS.QUEUE_INDEX)
      ]);

      if (liked) this.state.likedIds = JSON.parse(liked);
      if (recent) this.state.recentlyPlayed = JSON.parse(recent);
      if (vol) this.state.volume = Number(vol);
      if (adblock !== null) this.state.adBlocker = adblock === 'true';
      if (queue) {
        try {
          const parsedQueue = JSON.parse(queue);
          if (Array.isArray(parsedQueue) && parsedQueue.length > 0) {
            this.state.queue = parsedQueue;
            const idx = queueIndex ? Number(queueIndex) : 0;
            this.state.queueIndex = (idx >= 0 && idx < parsedQueue.length) ? idx : 0;
            this.state.currentSong = parsedQueue[this.state.queueIndex] || null;
          }
        } catch {}
      }
      this.notify();
    } catch (e) {
      console.warn('[PlayerStore] Load storage error:', e);
    }
  }

  private persistQueue() {
    AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(this.state.queue)).catch(() => {});
    AsyncStorage.setItem(STORAGE_KEYS.QUEUE_INDEX, String(this.state.queueIndex)).catch(() => {});
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

  setProgress(currentTime: number, duration: number) {
    this.state.currentTime = currentTime;
    if (duration > 0) this.state.duration = duration;
    this.notifyProgress();
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

  addToQueue(song: Song) {
    this.state.queue.push(song);
    this.persistQueue();
    this.notify();
  }

  getNextSong(): Song | null {
    if (this.state.queue.length === 0) return this.state.currentSong;

    // Tekrar: Tek parça (one)
    if (this.state.repeat === 'one') {
      return this.state.currentSong;
    }

    // Karışık çalma (shuffle)
    if (this.state.shuffle && this.state.queue.length > 1) {
      let randIdx = Math.floor(Math.random() * this.state.queue.length);
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

  toggleLike(songId: string): boolean {
    const idx = this.state.likedIds.indexOf(songId);
    let isLiked = false;
    if (idx > -1) {
      this.state.likedIds.splice(idx, 1);
      isLiked = false;
    } else {
      this.state.likedIds.push(songId);
      isLiked = true;
    }
    AsyncStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify(this.state.likedIds)).catch(() => {});
    this.notify();
    return isLiked;
  }

  isLiked(songId: string): boolean {
    return this.state.likedIds.includes(songId);
  }

  addRecentlyPlayed(song: Song) {
    this.state.recentlyPlayed = this.state.recentlyPlayed.filter((s) => s.id !== song.id);
    this.state.recentlyPlayed.unshift(song);
    AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(this.state.recentlyPlayed)).catch(() => {});
    this.notify();
  }

  setAdBlocker(enabled: boolean) {
    this.state.adBlocker = enabled;
    AsyncStorage.setItem(STORAGE_KEYS.ADBLOCK, String(enabled)).catch(() => {});
    this.notify();
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
