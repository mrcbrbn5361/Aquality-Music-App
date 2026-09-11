// ytmdesktop2 volumeRatio uyarlaması — Aquality Music: loudness normalization toggle
import Store from 'electron-store';

interface VolumeRatioSettings {
  volumeRatioEnabled: boolean;
}

const s = new Store<VolumeRatioSettings>({
  name: 'aquality-music-settings',
  defaults: { volumeRatioEnabled: false }
});

export class VolumeRatioProvider {
  isEnabled(): boolean {
    return !!s.get('volumeRatioEnabled');
  }

  setEnabled(v: boolean): void {
    s.set('volumeRatioEnabled', v);
  }

  getRatio(): number {
    return this.isEnabled() ? 1.2 : 1.0;
  }
}

export const volumeRatioProvider = new VolumeRatioProvider();

