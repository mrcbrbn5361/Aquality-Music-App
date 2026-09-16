import { setAudioModeAsync } from 'expo-audio';
import { Song } from '../types';
import { mobileApi } from '../api/innertube';
import { playerStore } from '../store/player-store';

export interface BridgeInterface {
  play: (id: string) => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
}

class MobilePlayerService {
  private bridge: BridgeInterface | null = null;
  private pendingSongId: string | null = null;
  private isConfigured = false;

  registerBridge(bridge: BridgeInterface) {
    this.bridge = bridge;
    if (this.pendingSongId) {
      this.bridge.play(this.pendingSongId);
      this.pendingSongId = null;
    }
  }

  unregisterBridge() {
    this.bridge = null;
  }

  async configureAudio() {
    if (this.isConfigured) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true
      });
      this.isConfigured = true;
      console.log('[MobilePlayer] Arka plan ses modu aktif edildi');
    } catch (e) {
      console.warn('[MobilePlayer] Audio mode config error:', e);
    }
  }

  /**
   * Yeni bir şarkı başlat
   */
  async play(song: Song): Promise<boolean> {
    try {
      await this.configureAudio();

      playerStore.setCurrentSong(song);
      playerStore.setPlaying(true);
      playerStore.setProgress(0, song.duration || 0);
      playerStore.addRecentlyPlayed(song);

      if (this.bridge) {
        this.bridge.play(song.id);
      } else {
        this.pendingSongId = song.id;
      }
      return true;
    } catch (err) {
      console.error('[MobilePlayer] Play error:', err);
      playerStore.setPlaying(false);
      return false;
    }
  }

  async pause(): Promise<void> {
    if (this.bridge) {
      this.bridge.pause();
    }
    playerStore.setPlaying(false);
  }

  async resume(): Promise<void> {
    if (this.bridge) {
      this.bridge.resume();
    }
    playerStore.setPlaying(true);
  }

  async togglePlay(): Promise<void> {
    if (playerStore.getState().playing) {
      await this.pause();
    } else {
      await this.resume();
    }
  }

  async seek(seconds: number): Promise<void> {
    const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? seconds : 0;
    if (this.bridge) {
      this.bridge.seek(safeSeconds);
    }
    playerStore.setProgress(safeSeconds, playerStore.getState().duration);
  }

  async setVolume(vol: number): Promise<void> {
    const safeVol = Number.isFinite(vol) ? Math.min(100, Math.max(0, vol)) : 80;
    if (this.bridge) {
      this.bridge.setVolume(safeVol);
    }
    playerStore.setVolume(safeVol);
  }

  playNext(): void {
    const state = playerStore.getState();
    // Tekrar (bir): aynı parçayı baştan çal
    if (state.repeat === 'one' && state.currentSong) {
      this.play(state.currentSong);
      return;
    }
    const currentId = state.currentSong?.id;
    const nextSong = playerStore.getNextSong();
    if (nextSong && nextSong.id !== currentId) {
      this.play(nextSong);
      return;
    }
    // Kuyruk bitti: otomatik çalma açıksa benzer parçalarla devam et
    const current = playerStore.getState().currentSong;
    if (!current) {
      playerStore.setPlaying(false);
      return;
    }
    if (!playerStore.getState().autoPlay) {
      playerStore.setPlaying(false);
      return;
    }
    mobileApi.getNext(current.id).then((similar) => {
      if (similar && similar.length > 0) {
        similar.forEach((s) => playerStore.addToQueue(s));
        const next = playerStore.getNextSong();
        if (next) {
          this.play(next);
        } else {
          playerStore.setPlaying(false);
        }
      } else {
        playerStore.setPlaying(false);
      }
    }).catch((e) => {
      console.warn('[MobilePlayer] Benzer parça alınamadı:', e);
      playerStore.setPlaying(false);
    });
  }

  playPrevious(): void {
    const prevSong = playerStore.getPreviousSong();
    if (prevSong) {
      this.play(prevSong);
    }
  }
}

export const mobilePlayer = new MobilePlayerService();

