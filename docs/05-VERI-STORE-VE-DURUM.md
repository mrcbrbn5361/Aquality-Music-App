# 💾 05. Veri Yönetimi ve Store

> **Aquality Music Durum ve Kalıcılık Dokümantasyonu**  
> `electron-store` kalıcılık mimarisi, veri şeması, oturum kurtarma, pencere koordinatları ve çalma listesi motoru.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-17 16:44` |
| **Proje Sürümü** | `v1.0.2` (Masaüstü: `v1.0.2`, Web: `v1.0.2`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `c9e4046 - chore(release): sync version to 1.0.2 across workspaces (0 seconds ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 24 / 24 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 1. Veri Şeması (`StoreData` Arayüzü)

Tüm kullanıcı tercihleri ve durumu aşağıdaki TypeScript arayüzü ile sıkı bir şekilde tip denetiminden geçer:

```typescript
interface StoreData {
  theme: 'dark' | 'light' | 'system';
  language?: 'tr' | 'en';
  volume: number;
  quality: 'low' | 'medium' | 'high';
  autoPlay: boolean;
  recentlyPlayed: Array<{
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    timestamp: number;
    duration?: number;
    artistId?: string;
  }>;
  likedSongs: string[];
  queue: Array<{
    id: string;
    title: string;
    artist: string;
    thumbnail: string;
    duration?: number;
    artistId?: string;
  }>;
  queueIndex: number;
  playlists: Array<{
    id: string;
    name: string;
    songs: string[];
    createdAt: number;
  }>;
  windowBounds?: { x: number; y: number; width: number; height: number };
  oauthClientId?: string;
  oauthClientSecret?: string;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  discordEnabled?: boolean;
}
```

---

## 2. Çarpışmasız ID Üretimi (`DAT-02`)

Önceki sürümlerde hızlı ardışık çalma listesi oluşturulduğunda `Date.now()` çakışması yaşanabilmekteydi. Bu risk şu yöntemle tamamen ortadan kaldırılmıştır:

```typescript
createPlaylist(name: string): string {
  const playlists = this.get('playlists');
  const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  playlists.push({ id, name, songs: [], createdAt: Date.now() });
  this.set('playlists', playlists);
  return id;
}
```

---

## 3. Oturum Kurtarma ve Kuyruk Geri Yükleme

Uygulama kapatıldığında:
- O anki ses seviyesi (`volume`)
- Dinlenen kuyruk (`queue`) ve sırası (`queueIndex`)
- Pencerenin ekrandaki koordinatları ve boyutları (`windowBounds`)

otomatik olarak diske kaydedilir. Bir sonraki açılışta kullanıcı tam kaldığı yerden, aynı ses seviyesi ve pencere boyutlarıyla devam eder.

---

## 4. Taşınabilir (Portable) Modda Veri İzolasyonu (`PKG-01`)

Portable sürüm çalıştırıldığında kullanıcının verileri yerel işletim sisteminin `%APPDATA%` klasörüne sızmaz. `PORTABLE_EXECUTABLE_DIR` ortam değişkeni tespit edilerek `aquality-music-data.json` dosyası doğrudan taşınabilir `.exe` dosyasının yanındaki `data/` klasörüne izole edilir.
