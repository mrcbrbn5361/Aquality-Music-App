# 🎨 04. Renderer ve Arayüz Tasarımı

> **Aquality Music Kullanıcı Arayüzü Dokümantasyonu**  
> `app.ts` tek sayfa reaktif durum yönetimi, Spotify standardı karanlık tema, canlı ekolayzır, kuyruk yönetimi ve çoklu dil (i18n) sistemi.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-19 14:54` |
| **Proje Sürümü** | `v1.0.2` (Masaüstü: `v1.0.2`, Web: `v1.0.2`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `39e7d47 - fix(bot): add graceful fallback for privileged gateway intents (0 seconds ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 24 / 24 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 1. Tek Sayfa Uygulaması (SPA) Durum Modeli

Arayüz katmanı harici ağır bir framework (React/Vue) yerine, maksimum hız ve sıfır gecikme sağlayan saf TypeScript + Vanilla DOM reaktif motoru üzerinde koşar.

### 1.1 `state` Nesnesi Şeması
```typescript
const state = {
  page: 'home',                // Aktif sayfa: home, search, library, liked, settings, artist, album, playlist
  currentSong: null,           // Çalmakta olan parça (id, title, artist, thumbnail, duration)
  queue: [],                   // Aktif oynatma kuyruğu
  queueIndex: -1,              // Kuyruk indeksi
  userQueue: [],               // Kullanıcının manuel eklediği 'Sıraya Ekle' parçaları
  contextQueue: [],            // Albüm veya çalma listesinden gelen bağlamsal kuyruk
  playing: false,              // Oynatma durumu
  shuffle: false,              // Karışık çalma
  repeat: 'off',               // Tekrar modu: 'off' | 'all' | 'one'
  volume: 50,                  // Ses seviyesi
  currentTime: 0,              // Geçen süre
  duration: 0,                 // Toplam süre
  liked: new Set<string>(),    // Beğenilen şarkı ID seti
  recentlyPlayed: [],          // Son çalınan geçmiş
  isLoggedIn: false,           // Giriş durumu
  user: null                   // Kullanıcı profili
};
```

---

## 2. Spotify Standardı Etkileşimler ve Görsel Deneyim

### 2.1 3 Barlı Canlı Ekolayzır (`.playing-equalizer`)
Parça çalarken şarkı satırında ve çalan kart üzerinde yeşil, yumuşak hareket eden 3 barlı canlı ekolayzır gösterilir:
```css
.playing-equalizer span {
  width: 3px;
  background: var(--c-primary);
  border-radius: 2px;
  animation: eqBounce 1.2s ease-in-out infinite alternate;
}
.playing-equalizer span:nth-child(2) { animation-delay: 0.2s; }
.playing-equalizer span:nth-child(3) { animation-delay: 0.4s; }
```
Parça duraklatıldığında veya reklam atlama anında ekolayzır animasyonu durur (`paused`), çaldığında senkron olarak yeniden canlanır.

### 2.2 Kart Üzerinde Yüzen Yeşil Oynat Butonu
Albüm, çalma listesi ve sanatçı kartlarına fare ile gelindiğinde (hover), Spotify'daki gibi sağ alt köşeden yukarı doğru süzülen dairesel yeşil oynat butonu belirir ve tek tıkla listeyi baştan başlatır.

---

## 3. Oynatma Kuyruğu Yönetimi (Queue Engine)

Aquality Music iki katmanlı bir kuyruk mimarisine sahiptir:

1. **User Queue (Kullanıcı Öncelikli Kuyruk)**:
   Kullanıcı bir şarkıya sağ tıklayıp veya butondan "Sıraya Ekle" dediğinde `state.userQueue` dizisine alınır. Şarkı bittiğinde ilk olarak bu liste tüketilir.
2. **Context Queue (Bağlam Kuyruğu)**:
   Kullanıcı bir albümden veya çalma listesinden şarkı başlattığında o listenin geri kalanı bağlam kuyruğunu oluşturur. Kullanıcı kuyruğu boşaldığında otomatik olarak bağlam kuyruğundan devam edilir.
3. **Autoplay / Radio Modu**:
   Kuyruktaki son parça bittiğinde YouTube Music Radio motoru devreye girerek parçaya benzer şarkıları otomatik olarak arkaya ekler.

---

## 4. Çoklu Dil Desteği (i18n Sistemi - `UI-03`)

Ayarlar sekmesinden anında Türkçe ve İngilizce dil değişimi yapılabilir:

```typescript
const i18nDict = {
  tr: {
    'nav.home': 'Ana Sayfa',
    'nav.search': 'Ara',
    'nav.library': 'Kütüphane',
    'nav.liked': 'Beğenilenler',
    'nav.playlists': 'Oynatma Listeleri',
    'nav.login': 'Giriş Yap',
    'nav.settings': 'Ayarlar'
  },
  en: {
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.library': 'Library',
    'nav.liked': 'Liked Songs',
    'nav.playlists': 'Playlists',
    'nav.login': 'Sign In',
    'nav.settings': 'Settings'
  }
};
```
Dil seçimi `electron-store` içine kaydedilir ve uygulama her açıldığında kullanıcının tercih ettiği dille başlar.

---

## 5. Klavye Kısayolları

| Tuş Kombinasyonu | Eylem |
|---|---|
| `Space` | Oynat / Duraklat |
| `Ctrl + Right` / `MediaNextTrack` | Sonraki Şarkı |
| `Ctrl + Left` / `MediaPreviousTrack` | Önceki Şarkı |
| `Ctrl + Up` / `Ctrl + Down` | Ses Seviyesini Artır / Azalt (%5) |
| `Ctrl + L` | Şarkıyı Beğen / Beğeniyi Kaldır |
| `Ctrl + F` | Arama Kutusuna Odaklan |
| `Esc` | Açık olan modal/panel pencerelerini kapat |
