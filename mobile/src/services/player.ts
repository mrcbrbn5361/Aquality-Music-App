import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';
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
  private player: AudioPlayer | null = null;
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
    } else if (this.player) {
      this.player.pause();
    }
    playerStore.setPlaying(false);
  }

  async resume(): Promise<void> {
    if (this.bridge) {
      this.bridge.resume();
    } else if (this.player) {
      this.player.play();
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
    if (this.bridge) {
      this.bridge.seek(seconds);
    } else if (this.player) {
      await this.player.seekTo(seconds);
    }
    playerStore.setProgress(seconds, playerStore.getState().duration);
  }

  async setVolume(vol: number): Promise<void> {
    if (this.bridge) {
      this.bridge.setVolume(vol);
    } else if (this.player) {
      this.player.volume = Math.max(0, Math.min(1, vol / 100));
    }
  }

  private onPlaybackStatusUpdate = (status: AudioStatus) => {
    if (!status.isLoaded) return;

    playerStore.setProgress(status.currentTime || 0, status.duration || 0);
    playerStore.setPlaying(status.playing);

    // Parça bittiğinde otomatik sonraki parçaya geç
    if (status.didJustFinish) {
      this.playNext();
    }
  };

  playNext(): void {
    const nextSong = playerStore.getNextSong();
    if (nextSong && nextSong.id !== playerStore.getState().currentSong?.id) {
      this.play(nextSong);
    } else {
      // Kuyruk bittiğinde veya tek şarkı çalıyorsa benzer parçaları çek ve devam et
      const current = playerStore.getState().currentSong;
      if (current) {
        mobileApi.getNext(current.id).then((similar) => {
          if (similar && similar.length > 0) {
            similar.forEach((s) => playerStore.addToQueue(s));
            const next = playerStore.getNextSong();
            if (next) this.play(next);
          }
        }).catch(() => {});
      }
    }
  }

  playPrevious(): void {
    const prevSong = playerStore.getPreviousSong();
    if (prevSong) {
      this.play(prevSong);
    }
  }
}

export const mobilePlayer = new MobilePlayerService();

