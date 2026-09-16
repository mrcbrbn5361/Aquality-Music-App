// ytmdesktop2 lyrics provider uyarlaması — enable/disable + fetch
import Store from 'electron-store';

interface LyricsApi {
  getLyrics(videoId: string): Promise<unknown>;
}

const s = new Store<{lyricsEnabled:boolean}>({ name:'aquality-music-settings', defaults:{ lyricsEnabled:true }});
export class LyricsProvider {
  isEnabled(): boolean { return s.get('lyricsEnabled') !== false; }
  setEnabled(v: boolean): void { s.set('lyricsEnabled', v); }
  async fetch(videoId: string, ytApi: LyricsApi): Promise<unknown> {
    if (!videoId || !this.isEnabled()) return null;
    try {
      return await ytApi.getLyrics(videoId);
    } catch (e) {
      console.warn('[Lyrics] Sözler alınamadı:', e);
      return null;
    }
  }
}
export const lyricsProvider = new LyricsProvider();
