// ytmdesktop2 volumeRatio uyarlaması — Aquality Music: loudness normalization toggle
import Store from 'electron-store';
const s = new Store<{volumeRatioEnabled:boolean}>({ name:'aquality-music-settings', defaults:{ volumeRatioEnabled:false }});
export class VolumeRatioProvider {
  isEnabled(){ return !!s.get('volumeRatioEnabled'); }
  setEnabled(v:boolean){ s.set('volumeRatioEnabled', v); }
  // YTM webview'de gain node ile normalize — stream-resolver üzerinden komut
  apply(win: Electron.BrowserWindow, enabled:boolean){
    const script = enabled ? `try{window.__aqualityGain=1.2}catch{}` : `try{window.__aqualityGain=1}catch{}`;
    win.webContents.executeJavaScript(script).catch(()=>{});
  }
}
export const volumeRatioProvider = new VolumeRatioProvider();
