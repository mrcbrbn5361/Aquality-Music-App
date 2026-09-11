# 📄 Dosya Denetimi: `desktop/src/main/api/stream-resolver.ts`

> **Dosya Yolu**: `desktop/src/main/api/stream-resolver.ts`  
> **Kod Hacmi**: 1,014 Satır  
> **Rolü**: Gizli YouTube Music Tarayıcı Penceresi, Ses Oynatma Motoru ve Reklam Engelleyici

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`stream-resolver.ts`, uygulamanın asıl müzik çalma motorudur. Aquality Music, masaüstü arayüzünde doğrudan `<audio>` etiketi veya ses çözücü kullanmaz; bunun yerine `persist:aquality-music` session'ına bağlı gizli (`show: false`) bir `BrowserWindow` açar.

Bu gizli pencerede `https://music.youtube.com/watch?v=...` sayfası yüklenir. Şarkı kontrolü (`play`, `pause`, `seek`, `next`, `volume`) ve anlık oynatma durumları (`currentTime`, `duration`, `title`, `artist`), pencere içine enjekte edilen JavaScript kodları ve IPC polling döngüsü ile yönetilir.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): Oynatıcı Penceresinde Donanım İvmelendirmesinin (GPU) Kapatılması
- **Konum**: `desktop/src/main/api/stream-resolver.ts:437`
- **Kod**:
  ```ts
  this.win = new BrowserWindow({
    // ...
    webPreferences: {
      partition: MUSIC_PARTITION,
      additionalArguments: ['--disable-gpu', '--disable-gpu-compositing']
    }
  });
  ```
- **Kök Neden**: Oynatıcı penceresine `--disable-gpu` ve `--disable-gpu-compositing` argümanları verilmiştir.
- **Etki**: YouTube Music'in HTML5 video/audio motoru donanım hızlandırmasından mahrum kalır. WebM/Opus ve H.264 ses/video akışlarının çözümlenmesi tamamen ana işlemci çekirdeklerine (CPU) yüklenir. Dizüstü bilgisayarlarda yüksek işlemci kullanımı (%20-40), ısınma, fan sesi ve pilin hızla tükenmesine sebep olur.
- **Düzeltme**: `additionalArguments` içindeki GPU disable bayrakları tamamen kaldırılmalı, Chromium'un yerel donanım ivmelendirmesinden faydalanılmalıdır.

---

### Sorun 2 (🔴 KRİTİK): Her 800ms'de Bir Rekürsif Shadow DOM Taraması (Aşırı CPU Yükü)
- **Konum**: `desktop/src/main/api/stream-resolver.ts:10, 153-171, 565`
- **Kod**:
  ```ts
  const POLL_MS = 800;
  // RESOLVE_MEDIA_JS:
  const walk = (root) => {
    try { const m = root.getElementById('movie_player'); if (m) return m; } catch {}
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) { const r = walk(el.shadowRoot); if (r) return r; }
    }
    return null;
  };
  mp = walk(document);
  ```
- **Kök Neden**: Durum senkronizasyonu için her 800 milisaniyede bir `executeJavaScript` çağrılmakta ve YouTube Music DOM'undaki tüm öğeler (`querySelectorAll('*')`) üzerinde özyinelemeli (rekürsif) bir derinlik araması çalıştırılmaktadır.
- **Etki**: Her saniyede birden fazla kez binlerce DOM düğümü taranmakta, V8 motorunda yoğun çöp toplayıcı (Garbage Collection) baskısı ve CPU yükü üretilmektedir.
- **Düzeltme**:
  - `movie_player` referansı pencere nesnesine bir defa bağlandıktan sonra tekrar arama yapılmamalıdır (`window.__cached_player`).
  - Polling sıklığı aktif oynatma yokken durdurulmalı, oynatma sırasında olay odaklı (Event-driven / `onStateChange`) yapıya geçilmelidir.

---

### Sorun 3 (🟠 YÜKSEK): Konuk Sayfada 250ms'lik Agresif `setInterval` Döngüsü
- **Konum**: `desktop/src/main/api/stream-resolver.ts:102-130`
- **Kod**:
  ```js
  setInterval(() => {
    const sel = ['.ytp-ad-skip-button', '.ytp-skip-ad-button', ...];
    for (const s of sel) {
      for (const b of document.querySelectorAll(s)) {
        try { b.click(); } catch {}
      }
    }
  }, 250);
  ```
- **Kök Neden**: Reklam geçme butonlarını yakalamak için sayfa içine 250ms'lik bir aralık kurulmuştur.
- **Etki**: Sayfada sürekli DOM sorgusu yapılmakta, bu da performans kaybına yol açmaktadır.
- **Düzeltme**: `setInterval` yerine modern ve hafif `MutationObserver` API'si kullanılmalı, yalnızca `#movie_player` veya ad container içine yeni bir DOM düğümü eklendiğinde tetiklenmelidir.

---

### Sorun 4 (🟠 YÜKSEK): `destroy()` Esnasında Bellek Sızıntısı (Event Listeners Leak)
- **Konum**: `desktop/src/main/api/stream-resolver.ts:1004-1012`
- **Kod**:
  ```ts
  destroy(): void {
    this._destroyed = true;
    this.stopPolling();
    if (this._pauseEnforceInterval) { clearInterval(this._pauseEnforceInterval); this._pauseEnforceInterval = null; }
    try { this.win?.destroy(); } catch {}
    try { this.win?.close(); } catch {}
    this.win = null;
  }
  ```
- **Kök Neden**: `destroy()` çağrıldığında `this.listeners.clear()` yapılmamaktadır. `this.listeners` kümesinde biriken geri çağırım (callback) fonksiyonları ana pencerenin ve kapatılan pencerelerin closure nesnelerini bellekte tutmaya devam eder (Memory Leak). Ayrıca `this.win?.destroy()` sonrası `this.win?.close()` çağrısı lüzumsuzdur.
- **Düzeltme**: `this.listeners.clear()` eklenmeli ve pencere temizliği sadeleştirilmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `--disable-gpu` bayrakları derhal kaldırılarak donanım ivmelendirmesi aktif edilmelidir.
2. 800ms rekürsif `querySelectorAll('*')` DOM taraması sonlandırılmalı, önbellekleme ve `onStateChange` olaylarına geçilmelidir.
3. 250ms'lik sayfa içi polling `MutationObserver` ile değiştirilmelidir.
4. `destroy()` fonksiyonuna `this.listeners.clear()` eklenmelidir.
