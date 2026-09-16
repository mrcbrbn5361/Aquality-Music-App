# Mobil Uygulama Sorunları (MOB)

> **Toplam:** 6 sorun | **Kritik:** 1 | **Yüksek:** 2 | **Orta:** 2 | **Düşük:** 1

---

## MOB-001: autoPlay Store'da Tanımsız (KRİTİK)

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `mobile/app/(tabs)/settings.tsx:24, 95` + `mobile/src/store/player-store.ts` |
| **Kategori** | Build-Time Hata |

### Sorun
`settings.tsx` şu satırlarda `autoPlay` ve `setAutoPlay` kullanıyor:
```typescript
// settings.tsx:24
const { adBlocker, audioQuality, themeAccent, autoPlay } = usePlayer();

// settings.tsx:95
<Switch
  value={autoPlay}
  onValueChange={(val) => playerStore.setAutoPlay(val)}
/>
```

Ancak `player-store.ts`'in `PlayerState` arayüzünde `autoPlay` alanı yok ve `PlayerStore` sınıfında `setAutoPlay` metodu yok.

### Etki
- TypeScript compile hatası
- Mobil uygulama build edilemez
- `npm run build` veya `npx expo start` başarısız olur

### Çözüm
`mobile/src/store/player-store.ts`'e aşağıdaki eklemeleri yap:

```typescript
// 1. STORAGE_KEYS'e ekle
const STORAGE_KEYS = {
  // ... mevcut key'ler
  AUTOPLAY: '@aquality_autoplay',  // EKLENECEK
};

// 2. PlayerState arayüzüne ekle
interface PlayerState {
  // ... mevcut alanlar
  autoPlay: boolean;  // EKLENECEK
}

// 3. Default değerlere ekle
private state: PlayerState = {
  // ... mevcut default'lar
  autoPlay: true,  // EKLENECEK
};

// 4. loadPersistedData'a ekle
private async loadPersistedData() {
  try {
    const [liked, recent, vol, adblock, queue, queueIndex, playlists, accent, quality, autoplay] = 
      await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LIKED),
        AsyncStorage.getItem(STORAGE_KEYS.RECENT),
        AsyncStorage.getItem(STORAGE_KEYS.VOLUME),
        AsyncStorage.getItem(STORAGE_KEYS.ADBLOCK),
        AsyncStorage.getItem(STORAGE_KEYS.QUEUE),
        AsyncStorage.getItem(STORAGE_KEYS.QUEUE_INDEX),
        AsyncStorage.getItem(STORAGE_KEYS.PLAYLISTS),
        AsyncStorage.getItem(STORAGE_KEYS.ACCENT),
        AsyncStorage.getItem(STORAGE_KEYS.QUALITY),
        AsyncStorage.getItem(STORAGE_KEYS.AUTOPLAY),  // EKLENECEK
      ]);

    // ... mevcut parsing'ler
    if (autoplay !== null) this.state.autoPlay = autoplay === 'true';  // EKLENECEK
    
    // ...
  } catch (e) {
    console.warn('[PlayerStore] Load storage error:', e);
  }
}

// 5. PlayerStore sınıfına metot ekle
setAutoPlay(enabled: boolean) {
  this.state.autoPlay = enabled;
  AsyncStorage.setItem(STORAGE_KEYS.AUTOPLAY, String(enabled)).catch(() => {});
  this.notify();
}
```

---

## MOB-002: Eksik Dependency - AsyncStorage

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `mobile/src/store/player-store.ts:1` |
| **Kategori** | Dependency |

### Sorun
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

Bu paket `mobile/package.json`'da dependency olarak listelenmemiş.

### Etki
- Build hatası: `Module not found`
- `npm install` sonrası bile çalışmaz

### Çözüm
```bash
cd mobile
npx expo install @react-native-async-storage/async-storage
```

---

## MOB-003: WebView originWhitelist={'*'}

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `mobile/src/components/AudioBridge.tsx:276` |
| **Kategori** | WebView Güvenliği |

### Sorun
```tsx
<WebView
  originWhitelist={['*']}
  // ...
  mixedContentMode="always"
/>
```

`originWhitelist={['*']}` tüm URL scheme'lerine izin veriyor. YouTube iframe'i HTTPS üzerinden yüklenmeli.

### Etki
- MITM saldırısı riski
- Kötü niyetli kaynaklara yönlendirme

### Çözüm
```tsx
<WebView
  originWhitelist={['https://']}
  mixedContentMode="never"
  // ...
/>
```

---

## MOB-004: clearAllCache Eksik Temizlik

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `mobile/src/store/player-store.ts:340-344` |
| **Kategori** | Fonksiyonellik |

### Sorun
```typescript
async clearAllCache() {
  this.state.recentlyPlayed = [];
  await AsyncStorage.removeItem(STORAGE_KEYS.RECENT).catch(() => {});
  this.notify();
}
```

"Önbelleği Temizle" butonu sadece `recentlyPlayed`'ı temizliyor. Liked songs, playlists, queue, volume, adblocker temizlenmiyor.

### Etki
- Kullanıcı "tüm verileri temizle" bekliyor ama sadece geçmiş siliniyor
- Yanıltıcı UI

### Çözüm
```typescript
async clearAllCache() {
  this.state.recentlyPlayed = [];
  this.state.queue = [];
  this.state.queueIndex = -1;
  this.state.currentSong = null;
  
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.RECENT),
    AsyncStorage.removeItem(STORAGE_KEYS.QUEUE),
    AsyncStorage.removeItem(STORAGE_KEYS.QUEUE_INDEX),
    AsyncStorage.removeItem(STORAGE_KEYS.PLAYLISTS),
  ]).catch(() => {});
  
  this.notify();
}

// Veya daha net isimlendirme
async clearAllData() {
  await AsyncStorage.clear();
  // State'i default değerlere resetle
  this.state = { ...defaultState };
  this.notify();
}
```

---

## MOB-005: Search Params Hardcoded

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `mobile/src/api/innertube.ts:24-29` |
| **Kategori** | API Uyumluluğu |

### Sorun
```typescript
const SEARCH_PARAMS: Record<string, string> = {
  songs: 'EgWKAQIIAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D',
  videos: 'EgWKAQIQAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D',
  albums: 'EgWKAQIBAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D',
  artists: 'EgWKAQIgAWoQEAMQBBAJEAoQBRAREBAQFQ%3D%3D'
};
```

URL-encoded parametreler hardcoded. YouTube bu parametreleri zamanla değiştirebilir.

### Etki
- Gelecekte arama filtreleri bozulabilir
- Yeni filter eklenemez

### Çözüm
Desktop versiyonundaki parametreleri referans al:
```typescript
// Desktop versiyonu ile aynı params'ları kullan
const SEARCH_PARAMS: Record<string, string> = {
  songs: 'EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D',    // Desktop ile aynı
  videos: 'EgWKAQIQAWoKEAMQBBAJEAoQBQ%3D%3D',
  artists: 'EgWKAQJDAYoKEAMQBBAJEAoQBQ%3D%3D',
  playlists: 'EgWKAQJAAWoKEAMQBBAJEAoQBQ%3D%3D'
};
```

---

## MOB-006: Hardcoded Player HTML

| | |
|---|---|
| **Önem** | 🟢 DÜŞÜK |
| **Dosya** | `mobile/src/components/AudioBridge.tsx:7-202` |
| **Kategori** | Bakım |

### Sorun
```typescript
const PLAYER_HTML = `
  <!DOCTYPE html>
  <html>
  <head>
    <!-- ~200 satır HTML + JS -->
  </head>
  <body>
    <!-- ... -->
  </body>
  </html>
`;
```

Tüm player HTML'i ve JavaScript'i bir string constant olarak tanımlı. Bu:
- Güncelleme zorluğu
- Syntax highlighting yok
- Debug zorluğu

### Etki
- Bakım maliyeti yüksek
- Hata ayıklama zor

### Çözüm
```typescript
// player.html dosyası olarak ayır
// public/player.html
<!DOCTYPE html>
<html>
<head>
  <!-- ... -->
</head>
<body>
  <!-- ... -->
</body>
</html>

// AudioBridge.tsx
const PLAYER_HTML = require('../../public/player.html').default;

// Veya fetch ile
const PLAYER_HTML_URL = 'https://raw.githubusercontent.com/.../player.html';
```

---

## Çözüm Özeti

| ID | Çözüm Zorluğu | Süre | Öncelik |
|----|:---:|:---:|:---:|
| MOB-001 | Kolay | 30dk | Yüksek |
| MOB-002 | Kolay | 5dk | Yüksek |
| MOB-003 | Kolay | 5dk | Yüksek |
| MOB-004 | Kolay | 15dk | Orta |
| MOB-005 | Kolay | 15dk | Orta |
| MOB-006 | Orta | 1saat | Düşük |
