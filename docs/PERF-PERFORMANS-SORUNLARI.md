# Performans Sorunları (PERF)

> **Toplam:** 7 sorun | **Kritik:** 1 | **Yüksek:** 3 | **Orta:** 2 | **Düşük:** 1

---

## PERF-001: 250ms Interval ile Ad-Skipping (KRİTİK)

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `desktop/src/main/api/stream-resolver.ts:102-131` |
| **Kategori** | CPU Kullanımı |

### Sorun
```typescript
// stream-resolver.ts:102-131
setInterval(() => {
  try {
    const mp = document.getElementById('movie_player');
    if (mp && typeof mp.skipAd === 'function') {
      try { mp.skipAd(); } catch {}
    }
    const sel = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot button',
      'button.ytp-ad-skip-button'
    ];
    for (const s of sel) {
      for (const b of document.querySelectorAll(s)) {
        try { b.click(); } catch {}
      }
    }
    const isAd = (mp && typeof mp.getAdState === 'function' && mp.getAdState() === 1)
      || (mp && mp.classList && (mp.classList.contains('ad-showing') || mp.classList.contains('ad-interrupting')));
    if (isAd) {
      const v = document.querySelector('video');
      if (v && v.duration && !isNaN(v.duration) && v.duration > 0) {
        v.muted = true;
        v.currentTime = v.duration;
      }
    }
  } catch {}
}, 250);  // Her 250ms'de bir!
```

### Etki
- **Her saniyede 4 kez** DOM taranıyor
- **5 selector** ile querySelectorAll çağrılıyor
- YouTube DOM'u büyük (1000+ element) - her tarama ~5-10ms
- **Toplam:** Saniyede ~40ms CPU kullanımı (reklam yokken bile!)

### Çözüm
```typescript
// 1. Interval'i 500ms'e çıkar (hâlâ yeterli hızlı)
setInterval(() => { ... }, 500);

// 2. Veya MutationObserver kullan (daha verimli)
const observer = new MutationObserver((mutations) => {
  const hasAd = mutations.some(m => 
    m.target.classList?.contains('ad-showing') ||
    m.target.classList?.contains('ad-interrupting')
  );
  if (hasAd) this.skipAd();
});

// 3. Veya sadece reklam algılandığında aktif ol
let adCheckInterval: NodeJS.Timeout | null = null;

function startAdCheck() {
  if (adCheckInterval) return;
  adCheckInterval = setInterval(checkAndSkipAd, 500);
}

function stopAdCheck() {
  if (adCheckInterval) {
    clearInterval(adCheckInterval);
    adCheckInterval = null;
  }
}
```

---

## PERF-002: Profil Çekme İçin 30sn Bekleme

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/auth/music-auth.ts:499-641` |
| **Kategori** | Kullanıcı Deneyimi |

### Sorun
```typescript
// music-auth.ts - fetchProfileViaAPI
// 1. Hidden window ile music.youtube.com DOM'undan çek
for(let i=0;i<15;i++){ 
  await new Promise(r=>setTimeout(r,1000)); // 15sn bekle!
  try{ 
    const has=await win.webContents.executeJavaScript(`...`,true); 
    if(has) break; 
  }catch{} 
}

// hesap menüsü kapalıysa avatar'a tıkla
await new Promise(r=>setTimeout(r,2500)); // 2.5sn daha bekle

for(let i=0;i<8;i++){ 
  await new Promise(r=>setTimeout(r,1000)); // 8sn daha bekle!
  // ...
}

// Toplam: 15 + 2.5 + 8 = 25.5sn maximum!
```

### Etki
- Giriş sonrası 25.5sn'ye kadar bekleme
- Kullanıcı uygulamanın donduğunu düşünebilir
- Birden fazla BrowserWindow açılıyor (memory)

### Çözüm
```typescript
// Parallel approach: API ve DOM'u aynı anda dene
async fetchProfileViaAPI(): Promise<Profile | null> {
  const timeout = 10000; // 10sn max
  
  // Promise.all ile paralel dene
  const result = await Promise.race([
    this.fetchViaDOM(),
    this.fetchViaAPI(),
    new Promise<null>((r) => setTimeout(() => r(null), timeout))
  ]);
  
  return result;
}

// DOM approach'u hızlandır
private async fetchViaDOM(): Promise<Profile | null> {
  const win = new BrowserWindow({ show: false, webPreferences: { partition: MUSIC_PARTITION } });
  try {
    await win.loadURL('https://music.youtube.com/');
    // 5sn max bekle (15 yerine)
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const profile = await this.extractProfileFromDOM(win);
      if (profile) return profile;
    }
  } finally {
    win.destroy();
  }
  return null;
}
```

---

## PERF-003: 800ms Polling Interval

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/api/stream-resolver.ts:566-568` |
| **Kategori** | CPU/Bellek |

### Sorun
```typescript
const POLL_MS = 800;

private startPolling() {
  if (this.pollTimer) return;
  this.pollTimer = setInterval(() => this.pollOnce(), POLL_MS);
}
```

Her 800ms'de bir `pollOnce()` çağrılıyor. Bu fonksiyon:
1. `executeJavaScript` ile ~300 satırlık JS inject ediyor
2. DOM'dan metadata çekiyor
3. State comparison yapıyor
4. Update event emit ediyor

### Etki
- Saniyede ~1.25 kez tam JS execution
- Her execution ~10-20ms
- Toplam: Saniyede ~25ms CPU

### Çözüm
```typescript
const POLL_MS = 1200; // 1.2sn'ye çıkar (hâlâ yeterli)

// Veya adaptive polling: oynuyorsa sık, duraklatılmışsa seyrek
private startPolling() {
  if (this.pollTimer) return;
  
  const poll = () => {
    this.pollOnce();
    // Oynuyorsa sık, duraklatılmışsa seyrek
    const interval = this.lastEmittedState?.paused ? 2000 : POLL_MS;
    this.pollTimer = setTimeout(poll, interval);
  };
  
  poll();
}
```

---

## PERF-004: addRecentlyPlayed High-Frequency Write

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `mobile/src/store/player-store.ts:260-264` |
| **Kategori** | I/O |

### Sorun
```typescript
addRecentlyPlayed(song: Song) {
  this.state.recentlyPlayed = this.state.recentlyPlayed.filter((s) => s.id !== song.id);
  this.state.recentlyPlayed.unshift(song);
  AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(this.state.recentlyPlayed)).catch(() => {});
  this.notify();
}
```

Her şarkı değişiminde `AsyncStorage.setItem` çağrılıyor. Bu disk I/O operation.

### Etki
- Hızlı şarkı geçişlerinde çok fazla disk write
- AsyncStorage'ın batch write kapasitesini aşabilir

### Çözüm
```typescript
// Debounced write
private recentWriteTimer: NodeJS.Timeout | null = null;

addRecentlyPlayed(song: Song) {
  this.state.recentlyPlayed = this.state.recentlyPlayed.filter((s) => s.id !== song.id);
  this.state.recentlyPlayed.unshift(song);
  
  // Debounced write - 1sn bekle, sonra yaz
  if (this.recentWriteTimer) clearTimeout(this.recentWriteTimer);
  this.recentWriteTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(this.state.recentlyPlayed)).catch(() => {});
  }, 1000);
  
  this.notify();
}
```

---

## PERF-005: 5sn Boyunca Her Saniye Autoplay Deneme

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/api/stream-resolver.ts:710-767` |
| **Kategori** | CPU |

### Sorun
```typescript
for (let i = 0; i < 5; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  // ... her seferinde executeJavaScript ile playback kontrolü
}
```

Her 1sn'de bir ~50 satırlık JS inject ediliyor.

### Etki
- 5sn boyunca her saniye JS execution
- Gereksiz CPU kullanımı

### Çözüm
```typescript
// Sadece 1 kez dene, sonra polling'e bırak
await new Promise((r) => setTimeout(r, 2000)); // 2sn bekle
await this.execCmd('play'); // 1 kez oynat
// Polling zaten devam edecek
```

---

## PERF-006: Console.log'lar Production'da

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/api/innertube.ts:200-258` |
| **Kategori** | I/O |

### Sorun
```typescript
// innertube.ts:203
console.log(`[parseSong] "${title}" | artist="${artist}" | album="${album}" | fixedCols=${fixedLen} | flexCols=${flexLen} | dur=${duration}`);

// innertube.ts:248
console.log(`[parseSong] FINAL: "${title}" dur=${duration}`);
```

Her arama sonucunda onlarca `console.log` basılıyor. Her log string'i oluşturma ve I/O işlemi.

### Etki
- Console I/O blocking
- Production'da gereksiz çıktı
- Debug bilgisi sızıntısı

### Çözüm
```typescript
// Debug modu ile kontrol
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log(`[parseSong] "${title}" | artist="${artist}" | ...`);
}
```

---

## PERF-007: User-Agent Hardcoded

| | |
|---|---|
| **Önem** | 🟢 DÜŞÜK |
| **Dosya** | `desktop/src/main/api/innertube.ts:127` |
| **Kategori** | Uyumluluk |

### Sorun
```typescript
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
```

Chrome 120.0.0.0 sabit kodlanmış. YouTube zamanla eski User-Agent'ları engelleyebilir.

### Etki
- Gelecekte API istekleri reddedilebilir
- YouTube anti-bot tespitini güçlendirebilir

### Çözüm
```typescript
// Dinamik User-Agent
function getCurrentUserAgent(): string {
  const chromeVersion = app.getVersion().replace(/\./g, '.');
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
}
```

---

## Çözüm Özeti

| ID | Çözüm Zorluğu | Süre | Öncelik |
|----|:---:|:---:|:---:|
| PERF-001 | Kolay | 30dk | Yüksek |
| PERF-002 | Zor | 3saat | Yüksek |
| PERF-003 | Kolay | 15dk | Yüksek |
| PERF-004 | Kolay | 20dk | Orta |
| PERF-005 | Kolay | 15dk | Orta |
| PERF-006 | Kolay | 30dk | Orta |
| PERF-007 | Kolay | 15dk | Düşük |
