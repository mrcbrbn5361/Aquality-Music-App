# Mimari ve Kod Kalitesi Sorunları (ARC)

> **Toplam:** 12 sorun | **Kritik:** 2 | **Yüksek:** 5 | **Orta:** 3 | **Düşük:** 2

---

## ARC-001: autoPlay Store'da Tanımsız (KRİTİK)

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `mobile/src/store/player-store.ts` + `mobile/app/(tabs)/settings.tsx:24` |
| **Kategori** | TypeScript Tip Hatası |

### Sorun
`settings.tsx` şu satırda `autoPlay` kullanıyor:
```typescript
const { adBlocker, audioQuality, themeAccent, autoPlay } = usePlayer();
```

Ancak `player-store.ts`'in `PlayerState` arayüzünde `autoPlay` alanı tanımlı değil:
```typescript
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
  playlists: Playlist[];
  themeAccent: ThemeAccent;
  audioQuality: 'high' | 'medium' | 'low';
  playerModalOpen: boolean;
  // autoPlay YOK!
}
```

### Etki
- TypeScript compile hatası (build-time)
- Mobil uygulama build edilemez

### Çözüm
`player-store.ts`'e `autoPlay` alanını ekle:
```typescript
interface PlayerState {
  // ... mevcut alanlar
  autoPlay: boolean;  // EKLENECEK
}

// Constructor'da default değer
private state: PlayerState = {
  // ... mevcut default'lar
  autoPlay: true,  // EKLENECEK
};

// PlayerStore'a metot ekle
setAutoPlay(enabled: boolean) {
  this.state.autoPlay = enabled;
  AsyncStorage.setItem(STORAGE_KEYS.AUTOPLAY, String(enabled)).catch(() => {});
  this.notify();
}

// STORAGE_KEYS'e ekle
AUTOPLAY: '@aquality_autoplay',

// loadPersistedData'a ekle
if (autoplay !== null) this.state.adBlocker = autoplay === 'true';
```

---

## ARC-002: setAutoPlay Fonksiyonu Eksik (KRİTİK)

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `mobile/app/(tabs)/settings.tsx:95` + `mobile/src/store/player-store.ts` |
| **Kategori** | Runtime Hatası |

### Sorun
```typescript
// settings.tsx:95
<Switch
  value={autoPlay}
  onValueChange={(val) => playerStore.setAutoPlay(val)}  // Fonksiyon yok!
/>
```

`PlayerStore` sınıfında `setAutoPlay` metodu tanımlı değil.

### Etki
- Runtime hatası: `playerStore.setAutoPlay is not a function`
- Settings ekranı crash olur

### Çözüm
ARC-001 ile birlikte çözülür. `setAutoPlay` metodu eklenecek.

---

## ARC-003: Hardcoded Versiyon

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/main.ts:239` |
| **Kategori** | Versiyon Yönetimi |

### Sorun
```typescript
// main.ts:239
message: 'Aquality Music v1.0.0',  // Hardcoded!
```

Ama `package.json`'da versiyon `v1.0.1`. Hakkında mesajı her zaman `v1.0.0` gösteriyor.

### Etki
- Kullanıcıya yanlış versiyon bilgisi
- Otomatik güncelleme sonrası tutarsızlık

### Çözüm
```typescript
// main.ts - buildMenu fonksiyonunda
message: `Aquality Music v${app.getVersion()}`,
```

---

## ARC-004: Listener Cleanup Eksik - Memory Leak

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/preload.ts:29-33, 70-74, 125-134, 146-150` |
| **Kategori** | Memory Leak |

### Sorun
Preload API'sindeki event listener'lar cleanup edilmiyor:

```typescript
// preload.ts - Tüm listener'lar cleanup dönüşü yok
onMaximized: (cb) => {
  const handler = (_: unknown, maximized: boolean) => cb(maximized);
  ipcRenderer.on('win:maximized', handler);
  return () => ipcRenderer.removeListener('win:maximized', handler);
  // ↑ Return var ama renderer tarafında kullanılmıyor
},

onDeeplink: (cb) => {
  const handler = (_: unknown, url: string) => cb(url);
  ipcRenderer.on('auth:deeplink', handler);
  return () => ipcRenderer.removeListener('auth:deeplink', handler);
},

onLog: (cb) => {
  const h = (_: unknown, log: string) => cb(log);
  ipcRenderer.on('bot-server:log', h);
  return () => ipcRenderer.removeListener('bot-server:log', h);
},

onUpdate: (cb) => {
  const h = (_: unknown, u: PlayerUpdate) => cb(u);
  ipcRenderer.on('player:update', h);
  return () => ipcRenderer.removeListener('player:update', h);
}
```

### Etki
- Her component mount/unmount döngüsünde listener birikir
- Memory leak - uzun süren oturumlarda bellek kullanımı artar
- Eski listener'lar tetiklenirse beklenmeyen davranış

### Çözüm
Renderer tarafında `useEffect` cleanup'ları kullanılmalı:
```typescript
// app.ts veya ilgili component
useEffect(() => {
  const cleanup = window.api.player.onUpdate((u) => {
    // handle update
  });
  return cleanup;  // Component unmount'ta listener temizlenir
}, []);
```

---

## ARC-005: backgroundMaterial: 'mica' as any

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/main.ts:130` |
| **Kategori** | TypeScript Tip Güvenliği |

### Sorun
```typescript
backgroundMaterial: 'mica' as any,
```

`as any` ile TypeScript tip kontrolü bypass ediliyor. `mica` Electron'un yeni bir feature'ı ve API'si stabil değil.

### Etki
- TypeScript koruması devre dışı
- Electron güncellemelerinde kırılabilir

### Çözüm
```typescript
// Electron'un supported özellikleri kontrol et
import { app } from 'electron';

// Sadece desteklenen platformlarda mica kullan
const isWin11 = process.platform === 'win32' && parseInt(process.getSystemVersion().split('.')[0]) >= 10;

mainWindow = new BrowserWindow({
  // ...
  ...(isWin11 ? { backgroundMaterial: 'mica' as any } : {}),
});
```

---

## ARC-006: Menu Her Çağrıda Yeniden Oluşturuluyor

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/main.ts:201-250` |
| **Kategori** | Performans |

### Sorun
```typescript
function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    // ... 50+ satır template
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// buildMenu() her createMenu çağrısında yeniden oluşturuluyor
```

### Etki
- Her menü oluşturma döngüsünde bellek tahsisi
- Gereksiz GC yükü

### Çözüm
```typescript
let menuBuilt = false;

function buildMenu(): void {
  if (menuBuilt) return;
  menuBuilt = true;
  // ... mevcut kod
}

// veya window sayısına göre rebuild et
function buildMenu(force = false): void {
  if (!force && Menu.getApplicationMenu()) return;
  // ...
}
```

---

## ARC-007: Debounce Timer Dispose Edilmiyor

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/utils/store.ts:101-109` |
| **Kategori** | Memory Leak |

### Sorun
```typescript
private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

setDebounced<K extends keyof StoreData>(key: K, value: StoreData[K], delayMs = 300): void {
  const existing = this.debounceTimers.get(key as string);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    this.debounceTimers.delete(key as string);
    this.set(key, value);
  }, delayMs);
  this.debounceTimers.set(key as string, timer);
}

// dispose() metodu yok!
```

### Etki
- Uygulama kapatıldığında timer'lar temizlenmiyor
- Potansiyel process exit gecikmesi

### Çözüm
```typescript
dispose(): void {
  for (const timer of this.debounceTimers.values()) {
    clearTimeout(timer);
  }
  this.debounceTimers.clear();
}

// main.ts - before-quit handler'ında
app.on('before-quit', () => {
  storeManager?.dispose();
  // ...
});
```

---

## ARC-008: Connect Timeout Promise Race

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/utils/discord.ts:50-65` |
| **Kategori** | Promise Yönetimi |

### Sorun
```typescript
const connectPromise = new Promise<void>((resolve) => {
  this.client!.on('ready', () => {
    this.isConnected = true;
    resolve();
  });
});

const loginPromise = this.client.login({ clientId: appId });

const timeoutPromise = new Promise<void>((_, reject) =>
  setTimeout(() => reject(new Error('timeout')), 3000)
);

await Promise.race([Promise.all([connectPromise, loginPromise]), timeoutPromise]);
```

Timeout gerçekleştiğinde `connectPromise` ve `loginPromise` devam ediyor. Memory leak ve beklenmeyen state değişiklikleri riski.

### Etki
- Timeout sonrası eski promise'lar hâlâ dinleniyor
- `isConnected` tutarsız olabilir

### Çözüm
```typescript
private async doConnect(appId: string): Promise<void> {
  if (this.client) {
    this.disconnect();
  }

  this.currentAppId = appId;
  store.set('discordAppId', appId);

  try {
    this.client = new Client({ transport: 'ipc' });

    const connectPromise = new Promise<void>((resolve) => {
      this.client!.on('ready', () => {
        this.isConnected = true;
        console.log('[Discord] Rich Presence bağlandı');
        resolve();
      });
    });

    const loginPromise = this.client.login({ clientId: appId });

    // 3sn timeout
    const result = await Promise.race([
      Promise.all([connectPromise, loginPromise]),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);

  } catch (err) {
    console.log('[Discord] Rich Presence bağlanamadı');
    this.isConnected = false;
    try { this.client?.destroy(); } catch {}
    this.client = null;
    // Timeout durumunda client zaten temizlendi
  }
}
```

---

## ARC-009: execCmd Her Seferinde JS String Oluşturuyor

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/api/stream-resolver.ts:809-907` |
| **Kategori** | Performans |

### Sorun
Her `execCmd` çağrısında ~100 satırlık bir JavaScript string'i oluşturulup `executeJavaScript` ile inject ediliyor:
```typescript
private async execCmd(cmd: string, val: string = ''): Promise<boolean> {
  const code = `(async () => {
    // ~100 satır JS kodu
  })()`;
  const r: any = await win.webContents.executeJavaScript(code, true);
  // ...
}
```

Bu, volume/seek/play/pause gibi sık çağrılan fonksiyonlarda GC pressure yaratıyor.

### Etki
- Yüksek GC yükü
- Input lag (özellikle seek ve volume slider'da)

### Çözüm
Script'i bir kez inject edip sadece komut adı göndermek:
```typescript
// İlk yüklemede enjekte edilecek script
const PLAYER_CONTROL_JS = `
  window.__aqControl = {
    play: () => { const mp = document.getElementById('movie_player'); if (mp) mp.playVideo(); },
    pause: () => { const mp = document.getElementById('movie_player'); if (mp) mp.pauseVideo(); },
    seek: (v) => { const mp = document.getElementById('movie_player'); if (mp) mp.seekTo(Number(v), true); },
    volume: (v) => { /* volume logic */ },
  };
  true;
`;

// Her komut için basit bir çağrı
private async execCmd(cmd: string, val: string = ''): Promise<boolean> {
  const code = `window.__aqControl?.${cmd}?.(${JSON.stringify(val)}); true;`;
  // ...
}
```

---

## ARC-010: require() Kullanımı ESM'de

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/main.ts:727` |
| **Kategori** | Modül Sistemi |

### Sorun
```typescript
// main.ts:727
if (process.env.GH_TOKEN || require('fs').existsSync(require('path').join(__dirname,'../release'))) {
  autoUpdater.checkForUpdatesAndNotify().catch(()=>{});
}
```

`require()` CommonJS'de çalışır ama proje ESNext target'lı. Gelecekte ESM'e geçişte sorun olabilir.

### Çözüm
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Dosyanın başında import edilmiş zaten
// Sadece kullan:
if (process.env.GH_TOKEN || fs.existsSync(path.join(__dirname, '../release'))) {
  autoUpdater.checkForUpdatesAndNotify().catch(() => {});
}
```

---

## ARC-011: PowerShell Komutu Injection Riski

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/auth/music-auth.ts:219` |
| **Kategori** | Güvenlik |

### Sorun
```typescript
execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System; (Get-Process chrome | Where-Object { $_.MainWindowTitle -like '*YouTube*Music*' } | Select-Object -First 1).MainWindowHandle | ForEach-Object { ... } 2>nul"`, { timeout:1500 });
```

PowerShell komutu string olarak çalışıyor. Chrome Process adı manipüle edilirse injection mümkün.

### Çözüm
Electron'un `shell` API'sini kullanmak daha güvenli:
```typescript
// Chrome penceresini ön plana getirmek için Electron API kullan
import { BrowserWindow } from 'electron';

// Veya child_process ile güvenli args array
const args = [
  '-NoProfile', '-Command',
  'Add-Type ...'
];
child_process.execFileSync('powershell', args, { timeout: 1500 });
```

---

## ARC-012: Store Instance'ı Modül Seviyesinde

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/utils/discord.ts:16` |
| **Kategori** | Modül Tasarımı |

### Sorun
```typescript
const store = new Store<StoreType>({ name: 'aquality-music-settings', defaults: { discordAppId: '' } });
```

Store instance'ı modül seviyesinde oluşturuluyor. Bu, import edildiğinde otomatik olarak oluşturulduğu anlamına gelir.

### Etki
- Import sırası bağımlılığı
- Test süreçlerinde zorluk

### Çözüm
```typescript
class DiscordRPC {
  private store: Store<StoreType>;
  
  constructor() {
    this.store = new Store<StoreType>({ 
      name: 'aquality-music-settings', 
      defaults: { discordAppId: '' } 
    });
  }
  // ...
}
```

---

## Çözüm Özeti

| ID | Çözüm Zorluğu | Süre | Öncelik |
|----|:---:|:---:|:---:|
| ARC-001 | Kolay | 30dk | Yüksek |
| ARC-002 | Kolay | 5dk (ARC-001 ile) | Yüksek |
| ARC-003 | Kolay | 10dk | Yüksek |
| ARC-004 | Orta | 2saat | Yüksek |
| ARC-005 | Kolay | 15dk | Yüksek |
| ARC-006 | Kolay | 15dk | Yüksek |
| ARC-007 | Kolay | 20dk | Yüksek |
| ARC-008 | Orta | 45dk | Orta |
| ARC-009 | Zor | 2saat | Orta |
| ARC-010 | Kolay | 10dk | Orta |
| ARC-011 | Orta | 1saat | Düşük |
| ARC-012 | Kolay | 15dk | Düşük |
