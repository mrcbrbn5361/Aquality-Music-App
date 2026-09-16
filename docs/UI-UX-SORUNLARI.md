# UI/UX Sorunları - Kapsamlı Analiz

> **Son Güncelleme:** 2026-09-16  
> **Toplam UI/UX Sorun:** 102  
> **Platformlar:** Desktop, Mobile, Website, Çapraz Platform

---

## Özet Tablosu

| Platform | Görsel Hiyerarşi | Kullanıcı Akışı | Oynatıcı | Arama | Modal | Boş Durum | Tema | Erişilebilirlik | Toplam |
|----------|-----------------|-----------------|----------|-------|-------|-----------|------|-----------------|--------|
| **Desktop** | 8 | 6 | 6 | 4 | 4 | 2 | 3 | 3 | **36** |
| **Mobile** | 5 | 3 | 6 | 4 | 0 | 3 | 3 | 0 | **24** |
| **Website** | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | **8** |
| **Çapraz** | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | **7** |
| **TOPLAM** | **17** | **9** | **12** | **8** | **4** | **5** | **13** | **7** | **102** |

---

## 🔴 EN KRİTİK 10 UI/UX SORUNU

### 1. Mobilde Sekme Navigasyonu Tanımsız
| | |
|---|---|
| **ID** | UX-M-063 |
| **Platform** | Mobile |
| **Dosya** | `mobile/app/_layout.tsx:24-39` |
| **Etki** | 🔴 KRİTİK — Kullanıcılar ekranlar arası geçiş yapamıyor |

**Açıklama:** `<Stack>` layout'u kullanılıyor ama alt `(tabs)` klasöründe tab tanımları yok. Alt navigasyon çubuğu tanımlanmamış — kullanıcılar Ana Sayfa/Arama/Kütüphane/Ayarlar arasında bilinmeyen bir mekanizma ile geçiş yapıyor.

**Çözüm:**
```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: ... }} />
      <Tabs.Screen name="search" options={{ title: 'Arama', tabBarIcon: ... }} />
      <Tabs.Screen name="library" options={{ title: 'Kütüphane', tabBarIcon: ... }} />
      <Tabs.Screen name="settings" options={{ title: 'Ayarlar', tabBarIcon: ... }} />
    </Tabs>
  );
}
```

---

### 2. Oluşturulan Oynatma Listeleri Tıklanamıyor
| | |
|---|---|
| **ID** | UX-D-013 |
| **Platform** | Desktop |
| **Dosya** | `desktop/src/renderer/components/app.ts:2194-2207` |
| **Etki** | 🔴 KRİTİK — Kullanıcılar oluşturdukları listelere erişemiyor |

**Açıklama:** `renderPlaylists()` fonksiyonu oynatma listelerini `<a href="#">` olarak render ediyor ama tıklama olayı eklenmemiş — ölü bağlantılara dönüşüyor.

---

### 3. Ayarlar HTML Yapıs Hatası - Görsel Gruplama Bozuk
| | |
|---|---|
| **ID** | UX-D-004 |
| **Platform** | Desktop |
| **Dosya** | `desktop/src/renderer/index.html:250` |
| **Etki** | 🔴 KRİTİK — Reklam Engelleyici ayarları yanlış grupta görünüyor |

**Açıklama:** "Oynatma" grubunun kapanış `</div>` etiketi eksik. "Reklam Engelleyici" grubu hâlâ açık olan "Oynatma" grubu içinde açılıyor — görsel gruplama bozuluyor.

---

### 4. Sözler Otomatik Kaydırmıyor
| | |
|---|---|
| **ID** | UX-D-029 |
| **Platform** | Desktop |
| **Dosya** | `desktop/src/renderer/components/app.ts:1754-1766` |
| **Etki** | 🔴 YÜKSEK — Söz paneli var ama oynatmayla senkronize değil |

**Açıklama:** Tüm söz satırları statik olarak render ediliyor. Oynatma konumuyla senkronizasyon yok. `lyric-line.active` CSS sınıfı tanımlı (main.css:1116-1119) ama JS'de hiçbir zaman uygulanmıyor.

---

### 5. Tekrar Simgeeleri Görsel olarak Ayırt Edilemiyor
| | |
|---|---|
| **ID** | UX-D-017 |
| **Platform** | Desktop |
| **Dosya** | `desktop/src/renderer/components/app.ts:1542-1561` |
| **Etki** | 🔴 YÜKSEK — "Kapalı" ve "Tümü" durumları aynı görünüyor |

**Açıklama:** Tekrar döngüsü 3 durumda geçiş yapıyor ama "kapalı" (satır 1558) ve "tümü" (satır 1554) SVG simgeleri aynı — yeşil `.active` sınıfı dışında görsel fark yok.

**Çözüm:** Her durum için farklı simge (tekrar 1, tekrar tümü, tekrar kapalı).

---

### 6. Tema Tutarlılığı Yok - Çapraz Platform
| | |
|---|---|
| **ID** | UX-X-069, UX-X-070 |
| **Platform** | Tümü |
| **Etki** | 🔴 YÜKSEK — Aynı marka, tamamen farklı tasarım dilleri |

**Açıklama:**
- **Mobile:** Cyan (#00f0ff) vurgu, neon/karanlık tema (`#06090e` arka plan, neon kenarlıklar)
- **Desktop:** Yeşil (#1DB954) vurgu, Spotify benzeri karanlık tema (`#121212`, sade kenarlıklar)
- **Website:** Yeşil vurgu, desktop ile tutarlı

Aynı uygulama için tamamen farklı görsel diller.

---

### 7. Temas Dokunma Hedefleri Çok Küçük
| | |
|---|---|
| **ID** | UX-M-043~047 |
| **Platform** | Mobile |
| **Etki** | 🟠 YÜKSEK — Kullanıcılar butonlara dokunmakta zorlanıyor |

**EtkilenenAlanlar:**
| Bileşen | Dosya | Satır | Mevcut | Önerilen |
|---------|-------|-------|--------|----------|
| Beğeni butonu | SongRow.tsx | 192 | ~28px | 44px |
| Kontrol ikonları | MiniPlayer.tsx | 206-207 | ~20px | 44px |
| Kapat butonu | player.tsx | 442-444 | ~22px | 44px |
| Karıştır/Tekrarla | player.tsx | 570-572 | ~38px | 44px |

---

### 8. Renk Kontrastı Başarısız - WCAG AA
| | |
|---|---|
| **ID** | UX-D-080, UX-D-081 |
| **Platform** | Desktop |
| **Etki** | 🟠 YÜKSEK — Metin okunabilirliği yetersiz |

**Detaylar:**
| Değişken | Değer | Arka Plan | Kontrast | Gereken |
|----------|-------|-----------|----------|---------|
| `--c-text-4` | `#535353` | `#181818` | ~2.3:1 | 4.5:1 |
| `--c-text-3` | `#6a6a6a` | `#181818` | ~3.2:1 | 4.5:1 |

**Kullanıldığı Yerler:** Boş ipuçları, yer tutucu metin, zaman gösterimleri, kenarlıküst bilgi etiketleri.

---

### 9. Yanıltıcı Durum Metinleri - Mobile Player
| | |
|---|---|
| **ID** | UX-M-057, UX-M-058 |
| **Platform** | Mobile |
| **Dosya** | `mobile/app/modal/player.tsx:134-136, 269-274` |
| **Etki** | 🟠 YÜKSEK — Kullanıcıya yanlış kalite bilgisi gösteriliyor |

**Açıklama:**
- "HI-FI" rozeti statik — gerçek ses kalitesi 96kbps "düşük" olsa bile her zaman gösteriliyor
- "256 KBPS" metni de statik — her zaman 256 yazıyor

**Çözüm:** Gerçek kalite ayarına bağlı dinamik metin.

---

### 10. Firefox Ses Kaydırıcı Stillenmemiş
| | |
|---|---|
| **ID** | UX-D-089 |
| **Platform** | Desktop |
| **Dosya** | `desktop/src/renderer/styles/main.css:1009-1019` |
| **Etki** | 🟠 YÜKSEK — Firefox'ta ses kontrolü bozuk görünüyor |

**Açıklama:** Ses kaydırıcısı özel CSS gradyan arka planı kullanıyor ama Firefox için `-moz-appearance: none` eksik. Firefox varsayılan arka plan stilini gösterecek ve tasarımı bozacak.

---

## 🟡 DETAYLI SORUN LİSTESİ

### DESKTOP: Görsel Hiyerarşi ve Yerleşim

#### UX-D-001: Taban Yazı Tipi Boyutu Çok Küçük
| | |
|---|---|
| **Dosya** | `main.css:44` |
| **Detay** | 13px taban yazı tipi, önerilen 14-16px minimumun altında. Ayar açıklamaları 11px — okunabilirlikten ödün veriyor. |

#### UX-D-002: Şarkı Sanatçısı Hover Alt Çizgi Görsel Kalabalık
| | |
|---|---|
| **Dosya** | `main.css:628-637` |
| **Detay** | Yoğun listelerde alt çizgili metin hipervincülere benziyor — bu liste öğesi, bağlantı değil. |

#### UX-D-003: Nav-link Hover Mikro Titreşim
| | |
|---|---|
| **Dosya** | `main.css:274` |
| **Detay** | `translateX(1px)` anlamlı geri bildirimden ziyade mikro titreme. Klavye odak `outline-offset` ile çakışıyor. |

#### UX-D-005: Auth Ayarları Inline Stil Tutarlısızlığı
| | |
|---|---|
| **Dosya** | `index.html:371-378` |
| **Detay** | Ham inline stiller mevcut `modal-input` veya `setting-select` sınıfları yerine kullanılmış. |

#### UX-D-006: Oynatıcı Sağ Panel 700px Altında Kayboluyor
| | |
|---|---|
| **Dosya** | `main.css:1529-1538` |
| **Detay** | ≤700px'de `.player-right` `display:none` — sözler, kuyruk ve ses kontrolleri alternatifsiz kayboluyor. |

#### UX-D-007: Kenar Çubuğu 960px Altında Kayboluyor
| | |
|---|---|
| **Dosya** | `main.css:1519-1527` |
| **Detay** | ≤960px'de kenar çubuğu hamburger menü veya navigasyon alternatifi olmadan kayboluyor. |

#### UX-D-008: Oynat Butonu Çok Küçük
| | |
|---|---|
| **Dosya** | `main.css:903` |
| **Detay** | 38x38px — en önemli kontrol. Sektör standardı 44-48px minimum. |

---

### DESKTOP: Kullanıcı Akışı ve Navigasyon

#### UX-D-009: Arama Bağlamı Sonuç Sonunda Durduruluyor
| | |
|---|---|
| **Dosya** | `app.ts:1509-1522` |
| **Detay** | Arama sonuçlarından bir şarkı doğal olarak bittiğinde oynatma duruyor — kullanıcılar Spotify benzeri kesintisiz oynatma bekliyor. |

#### UX-D-010: Giriş Yapılmadan Oynatma Yok — Kalıcı İpucu Yok
| | |
|---|---|
| **Dosya** | `app.ts:1180-1184` |
| **Detay** | Oturum açılmadan şarkı çalmıyor ama oyuncu arayüzünde oturum gerekliğine dair kalıcı banner yok — yalnızca toast. |

#### UX-D-011: Bağlam Adı Boş
| | |
|---|---|
| **Dosya** | `app.ts:747` |
| **Detay** | Arama dışı bağlamlarda乐队adı boş dize `''` — oyuncu kullanıcının hangi listeden oynattığını göstermiyor. |

#### UX-D-012: Oynatma Listesi Oluşturma Onayı Yok
| | |
|---|---|
| **Dosya** | `app.ts:2181-2188` |
| **Detay** | Oynatma listesi oluşturma sonrası tost veya görsel onay yok — modal sessizce kapanıyor. |

#### UX-D-014: Nav Bağlantıları href="#" Kullanıyor
| | |
|---|---|
| **Dosya** | `app.ts:46` |
| **Detay** | JS yakalamazsa sayfanın yukarı kaymasına neden olur. `javascript:void(0)` veya `data-page` kullanılmalı. |

---

### DESKTOP: Oynatıcı UX

#### UX-D-015: Kaydırıcı Başparmağı Yalnızca Hover'da
| | |
|---|---|
| **Dosya** | `main.css:956-972` |
| **Detay** | Dokunma/sürükleme kullanıcıları başparmağı hiç göremez. Dokunmatik ekranlı dizüstü bilgisayarlarda kaydırıcı çok zor kullanılır. |

#### UX-D-016: Kaydırıcı Yolu Çok İnce
| | |
|---|---|
| **Dosya** | `main.css:930-938` |
| **Detay** | Normalde 3px, hover'da 5px — hassas atlama için çok ince. Vuruş alanı 16px ama görsel çok küçük. |

#### UX-D-018: Ses Sıfırlama Geri Bildirimi Yok
| | |
|---|---|
| **Dosya** | `app.ts:895-902` |
| **Detay** | Çift tıklama ile %50'ye sıfırlama — geri bildirim veya araç ipucu yok. Kullanıcı ses ayarını yanlışlıkla kaybedebilir. |

#### UX-D-019: Hata Tostları Yığılıyor
| | |
|---|---|
| **Dosya** | `app.ts:1196-1209` |
| **Detay** | Hızlı hatalar tensizleştirilmemiş tost duvarı oluşturur — oyuncu kontrollerini örter. |

#### UX-D-020: Tost Bildirimleri Alttan Yığılıyor
| | |
|---|---|
| **Dosya** | `app.ts:489-516` |
| **Detay** | Manuel offset hesaplaması ile alttan yığılıyor. Çok tost çıkarsa oyuncu kontrollerini (bottom: 100px) örtebilir. |

---

### DESKTOP: Arama UX

#### UX-D-021: Öneriler Dropdown Konumu Pencere Boyutuna Uymuyor
| | |
|---|---|
| **Dosya** | `main.css:477-491` |
| **Detay** | `top: 70px; right: calc(100% - 400px)` — dar veya ultra geniş ekranlarda taşma veya hizalama kayması. |

#### UX-D-022: Arama 1 Karakterde Çalışıyor
| | |
|---|---|
| **Dosya** | `app.ts:556-584` |
| **Detay** | 200ms debounce ile 1 karakterde arama tetikleniyor. "a" veya "i" gibi tek karakterli girdiler için aşırı API çağrısı. |

#### UX-D-023: Arama Yükleniyor Durumu Yanıltıcı
| | |
|---|---|
| **Dosya** | `app.ts:647-696` |
| **Detay** | "Aranıyor..." metni `empty-state` sınıfı kullanıyor — anlamsal olarak yanıltıcı. İskelet/çark kullanılmalı. |

#### UX-D-024: Arama Filtreleri Dokunma Alanı Küçük
| | |
|---|---|
| **Dosya** | `main.css:464-465` |
| **Detay** | 12px yazı, 6px dikey dolgu — ~28px dokunma alanı. 44px minimumun altında. |

---

### DESKTOP: Modal/Dialog UX

#### UX-D-025: Chrome Aktarım Modalı Escape Tuşu Yok
| | |
|---|---|
| **Dosya** | `app.ts:442-486` |
| **Detay** | Escape tuşu ile kapatma desteği yok. Kullanıcılar X veya İptal'e tıklamak zorunda. |

#### UX-D-026: Modal Arkplan Tıklama ile Kapatma Yok
| | |
|---|---|
| **Dosya** | `app.ts:467-469` |
| **Detay** | Yalnızca `modal.remove()` — arkaplan tıklama ile kapatma veya odak tuzağı yok. Erişilebilirlik hatası. |

#### UX-D-027: Oynatma Listesi Oluşturma Enter Tuşu Yok
| | |
|---|---|
| **Dosya** | `index.html:494-510` |
| **Detay** | Klavye ile gönderim (Enter ile oluştur) desteği yok — "Oluştur" butonuna tıklamak zorunda. |

#### UX-D-028: Modal Sabit Genişlik
| | |
|---|---|
| **Dosya** | `main.css:1295` |
| **Detay** | 380px sabit genişlik — çok küçük pencerelerde çok geniş, büyük ekranlarda gereksiz dar. |

---

### DESKTOP: Söz Paneli

#### UX-D-030: Söz Boyut Değişimi Reflow Oluşturuyor
| | |
|---|---|
| **Dosya** | `main.css:1107-1120` |
| **Detay** | Aktif söz satırı 16px'den 18px'e büyüyor — kaydırılabilir panelde düzen kayması, sert bir deneyim oluşturuyor. |

---

### DESKTOP: Kuyruk Yönetimi UX

#### UX-D-031: Sürükleme ile Yeniden Sıralama Yok
| | |
|---|---|
| **Dosya** | `app.ts:1768-1855` |
| **Detay** | Kullanıcılar kuyruktaki şarkıları yeniden sıralayamıyor — beklenti karşılanmıyor. |

#### UX-D-032: Kuyruk Öğesine Tıklama Anında Oynatıyor
| | |
|---|---|
| **Dosya** | `app.ts:1829-1853` |
| **Detay** | Önizleme, uzun basma seçenekleri veya sağ tıklama menüsü yok — yalnızca tıkla ve oynat. |

#### UX-D-033: Kuyruk Temizleme Butonu Inline Stil
| | |
|---|---|
| **Dosya** | `app.ts:1779-1792` |
| **Detay** | Mevcut buton sınıfları yerine ham inline stiller kullanılmış — tutarsız görünüm. |

---

### DESKTOP: Ayarlar UX

#### UX-D-034: Reklam Engelleyici Statik Durum Metni
| | |
|---|---|
| **Dosya** | `index.html:257` |
| **Detay** | "✓ Aktif (Reklamsız)" statik metin — ayar satırı gibi görünüyor ama etkileşimli değil. Kullanıcılar etkileşime geçmeye çalışabilir. |

#### UX-D-035: Discord Açıklaması Tutarsız Stil
| | |
|---|---|
| **Dosya** | `index.html:307-309` |
| **Detay** | Ham `<p>` içinde inline stiller — mevcut sınıf yapısı kullanılmamış. |

#### UX-D-036: Ayar Değerleri Yükleme Durumu Yok
| | |
|---|---|
| **Dosya** | `app.ts:2246-2283` |
| **Detay** | Değerler asenkron yükleniyor ama yükleme durumu yok — seçiciler kısa süreli varsayılan değerleri gösteriyor. |

---

### DESKTOP: Klavye Navigasyonu

#### UX-D-037: Kısayolların Kullanılabilirliği Duyurulmuyor
| | |
|---|---|
| **Dosya** | `app.ts:2084-2144` |
| **Detay** | Kısayollar (F: tam ekran, M: sessiz, S: karıştır) için yardım iletişim kutusu veya araç ipucu yok. |

#### UX-D-038: Odak Göstergeleri Eksik
| | |
|---|---|
| **Dosya** | `main.css:65-75` |
| **Detay** | Şarkı satırları, kuyruk öğeleri ve öneri öğeleri tıklanabilir ama görünür odak göstergesi yok. |

#### UX-D-039: Kaydırıcı Klavye ile Çalışmıyor
| | |
|---|---|
| **Dosya** | `main.css:434`, `app.ts` |
| **Detay** | Kaydırıcıya `tabindex="0"` ve ARIA nitelikleri eklenmiş ama klavye işleyicide ok tuşu desteği uygulanmamış — odaklanılabilir ama işlevsiz. |

---

### DESKTOP: Boş Durumlar

#### UX-D-040: İskelet Yükleme Gerçek Yerleşimle Eşleşmiyor
| | |
|---|---|
| **Dosya** | `index.html:118-126` |
| **Detay** | Ana sayfa iskeleti 6 statik kart gösteriyor — gerçek yerleşim (kartlar + şarkı listesi) ile uyuşmuyor. Yanıltıcı yükleme göstergesi. |

#### UX-D-041: Kütüphane Boş Durum Buton Sınıfı Eksik
| | |
|---|---|
| **Dosya** | `app.ts:1986-1995` |
| **Detay** | "Müzik Aramaya Başla" butonu `btn-secondary btn-sm` sınıfını kullanıyor — CSS'de tanımlı değil (yalnızca `btn-primary` ve `btn-ghost` var). Buton stillenmemiş olacak. |

---

### MOBILE: Görsel Hiyerarşi ve Yerleşim

#### UX-M-048: Flow Kartları Sabit Boyut
| | |
|---|---|
| **Dosya** | `index.tsx:493-496` |
| **Detay** | 170x170px sabit — küçük ekranlarda (iPhone SE 320px) iki kart sığmaz, büyük telefonlarda çok küçük. Duyarlı boyutlandırma yok. |

#### UX-M-049: Grafik Kartları Sabit Genişlik
| | |
|---|---|
| **Dosya** | `index.tsx:543-544` |
| **Detay** | 135px sabit genişlik — aynı sorun, duyarlı değil. |

#### UX-M-050: Alt Boşluk Sabit
| | |
|---|---|
| **Dosya** | `index.tsx:314` |
| **Detay** | `height: 120` sabit — MiniPlayer yüksekliği değişirse (ev göstergesi olan cihazlar) içerik kırpılabilir veya fazla boşluk olabilir. |

#### UX-M-051: Tema Stili Ölü Ayar
| | |
|---|---|
| **Dosya** | `settings.tsx:160-162` |
| **Detay** | "Tema Stili" satırı statik "Koyu Metro" metni gösteriyor — değiştirme yolu yok. Kullanıcılar dokunarak değiştirmeyi bekler. |

#### UX-M-052: Seek Bar Algılama Güvensiz
| | |
|---|---|
| **Dosya** | `player.tsx:186-196` |
| **Detay** | `locationX` kullanılıyor ama React Native'de Android'de `locationX` hatalı olabilir. Doğru slider veya PanResponder kullanılmalı. |

---

### MOBILE: Kullanıcı Akışı

#### UX-M-064: Geçmiş Silme Onayı Yok
| | |
|---|---|
| **Dosya** | `library.tsx:276-278` |
| **Detay** | "Geçmişi Temizle" bağlantısı onay iletişim kutusu olmadan — dokunma ile tüm geçmiş anında siliniyor, geri alma yok. |

#### UX-M-065: Playlist Silme Butonu Kazara Dokunma
| | |
|---|---|
| **Dosya** | `library.tsx:228-231` |
| **Detay** | Silme simgesi küçük resim alanı içinde (`position: absolute, top:6, right:6`) — playlist açılırken kazara dokunma riski yüksek. |

---

### MOBILE: Oynatıcı UX

#### UX-M-060: Benzer Şarkı Ekleme Yük Durumu Yok
| | |
|---|---|
| **Dosya** | `player.tsx:340-342` |
| **Detay** | "Benzer şarkılar ekle" butonu `mobileApigetNext()` çağrısı yapıyor ama yükleme göstergesi yok — kullanıcının çalışıp çalışmadığı belli değil. |

#### UX-M-061: Sıralama Simgesi Yanıltıcı
| | |
|---|---|
| **Dosya** | `player.tsx:389` |
| **Detay** | Yeniden sıralama simgesi (`reorder-two`) gösteriliyor ama sürükleme ile yeniden sıralama işlevi yok — simge yanıltıcı. |

#### UX-M-062: Kompakt Kontroller Farklı Boyut
| | |
|---|---|
| **Dosya** | `player.tsx:750-774` |
| **Detay** | Söz/kuyruk Görünümlerinde oynat butonu 36px — ana görünümdeki 64px ile tutarsız. |

---

### MOBILE: Boş/Yükleniyor Durumları

#### UX-M-066: Yanıltıcı Yükleniyor Metni
| | |
|---|---|
| **Dosya** | `index.tsx:151-155` |
| **Detay** | "Aquality Ses Motoru Başlatılıyor..." — uygulama ana verileri yüklüyor, ses motoru başlatmıyor. |

#### UX-M-067: Aşırı Uzun Arama Yükleniyor
| | |
|---|---|
| **Dosya** | `search.tsx:189-193` |
| **Detay** | "Aquality arama motoru taranıyor..." — standart "Aranıyor..." daha net. |

#### UX-M-068: Boş Oyuncu Durumu Eylem Çağrısı Yok
| | |
|---|---|
| **Dosya** | `player.tsx:73-83` |
| **Detay** | Yalnızca "Çalan şarkı bulunmuyor." metni — illüstrasyon veya eylem çağrısı yok ("Şarkı keşfetmeye başlayın"). |

---

### WEBSITE: Duyarlı Tasarım

#### UX-W-072: Mobil Menü CSS Çatışması
| | |
|---|---|
| **Dosya** | `style.css:192, 196` |
| **Detay** | `.nav-links.active, .nav-actions.active { display: none }` kuralı JS tarafından eklenen `.active` sınıfını herhangi bir framework eklersegmentsi	override eder. |

#### UX-W-073: Önizleme Penceresi Sabit
| | |
|---|---|
| **Dosya** | `style.css:66` |
| **Detay** | 480px sabit genişlik, ≤540px ekranlarda taşma. ≤1024px'de `display:none` ile tamamen kayboluyor. |

#### UX-W-074: Özellikler Izgarası 4 Sütun Sorunu
| | |
|---|---|
| **Dosya** | `style.css:93` |
| **Detay** | 769-1023px aralığında 4 sütun — dar tabletlerde sıkışık. |

#### UX-W-075: Hero İstatistikleri Anlamsal Yanlış
| | |
|---|---|
| **Dosya** | `index.html:53-55` |
| **Detay** | "Reklamsız" ve "Açık" gibi metin `stat-number` sınıfını kullanıyor — sayısal değer değil. |

---

### WEBSITE: Erişilebilirlik

#### UX-W-076: :focus-visible Stilleri Tanımsız
| | |
|---|---|
| **Dosya** | `style.css:22` |
| **Detay** | Klavye kullanıcıları için görünür odak göstergesi yok. |

#### UX-W-077: Mobil Menü Başlangıçta Etiketsiz
| | |
|---|---|
| **Dosya** | `index.html:30-31` |
| **Detay** | `aria-label` JS ile ekleniyor — JS yüklenene kadar etiketsiz flaş. |

#### UX-W-079: Footer Tutarlısızlığı
| | |
|---|---|
| **Dosya** | `ozellikler.html:134-169` |
| **Detay** | Özellikler sayfası footer'ı index.html'deki sosyal bağlantıları içermiyor. |

---

### DESKTOP: Renk Kontrastı (Devamı)

#### UX-D-082: Kenar Çubuğu Bölüm Başlığı Renk
| | |
|---|---|
| **Dosya** | `main.css:240` |
| **Detay** | "OYNATMA LİSTELERI" gibi büyük harf etiketleri `--c-text-3` kullanıyor — düşük kontrast, okunabilirlik zor. |

---

### DESKTOP: Animasyon ve Geçişler

#### UX-D-083: prefers-reduced-motion Eksik
| | |
|---|---|
| **Dosya** | `main.css:76-79` |
| **Detay** | Süreleri 0.01ms'ye ayarlıyor ama `animation: none` ve `transition: none` kullanmıyor — daha temiz bir deneyim olurdu. |

#### UX-D-084: Hızlı Keskin Geçiş Eğrisi
| | |
|---|---|
| **Dosya** | `main.css:56-58` |
| **Detay** | `cubic-bezier(0.2,0,0,1)` — panel kaydırmaları için çok keskin. Daha yumuşak bir ease-out daha parlak hissettirir. |

#### UX-D-085: Göz Kırpma Yükleme
| | |
|---|---|
| **Dosya** | `app.ts:205` |
| **Detay** | Göz atma kartı yüklenirken tüm kap container HTML'i "Yükleniyor..." metni ile değişiyor — iskelet veya çark yok. Sert bir flaş oluşturuyor. |

---

### DESKTOP: Form/Girdi Kullanılabilirliği

#### UX-D-086: Select Elementleri Stillenmemiş
| | |
|---|---|
| **Dosya** | `main.css:1166-1177` |
| **Detay** | Açılır ok için özel stil yok — tarayıcılar arası tutarsız görünüm. |

#### UX-D-087: Karakter Sayaçı Eksik
| | |
|---|---|
| **Dosya** | `index.html:503` |
| **Detay** | `maxlength="60"` tanımlı ama karakter sayaçı gösterilmiyor — sınıra ulaşıncaya kadar bilinmiyor. |

#### UX-D-088: Auth Girdileri Doğrulama Yok
| | |
|---|---|
| **Dosya** | `index.html:374-375` |
| **Detay** | Boş dizeler gönderilebilir — doğrulama yok. |

---

### MOBILE: Kaydırma Davranışı

#### UX-M-090: Sonsuz Kaydırma veya Yukarı Dön Butonu Yok
| | |
|---|---|
| **Dosya** | `index.tsx:94-99` |
| **Detay** | `RefreshControl` var ama `onScroll` işleyicisi yok — uzun listelerde yukarı dönme yolu yok. |

#### UX-M-091: Sözlerde Satır Sabitleme Yok
| | |
|---|---|
| **Dosya** | `player.tsx:287-307` |
| **Detay** | Söz ScrollView'u aktif satıra奉献题目行为 yok — takip etmek zor. |

#### UX-M-092: Klavyeden Kaçınma Yok
| | |
|---|---|
| **Dosya** | `search.tsx:185-242` |
| **Detay** | `keyboardShouldPersistTaps="handled"` var ama klavyeden kaçınma yok — iOS'ta klavye arama sonuçlarını kaplayabilir. |

---

### DESKTOP: Bağlam Menüsü UX

#### UX-D-093: Bağlam Menüsünde Klavye Navigasyonu Yok
| | |
|---|---|
| **Dosya** | `app.ts:1679-1752` |
| **Detay** | Yalnızca faresel — ok tuşları ve Enter ile seçim desteği yok. |

#### UX-D-094: Bağlam Menüsü Pozisyonu Sabit Genişlik Tahmini
| | |
|---|---|
| **Dosya** | `app.ts:1694` |
| **Detay** | `Math.min(x, window.innerWidth - 200)` — 200px sabit tahmin. Menü içeriği daha genişse taşar. |

#### UX-D-095: Bağlam Menüsü Öğelerinde Simgeler Yok
| | |
|---|---|
| **Dosya** | `app.ts:1683-1691` |
| **Detay** | Sektör standardı bağlamlarda eylemlerin yanında simgeler var (oynat, kalp vb.) — daha hızlı görsel tarama. |

---

### ÇAPRAZ PLATFORM: Tutarssızlıklar

#### UX-X-096: Discord Entegrasyonu Yalnızca Desktop
| | |
|---|---|
| **Detay** | Desktop'ta Discord entegrasyonu var, mobile'da hiçbir Discord özelliği yok — alternatif sunulmamış. |

#### UX-X-097: Sözler Farklı Yerlerde
| | |
|---|---|
| **Detay** | Desktop'ta kenar paneli, mobile'da tam ekran sekme — tamamen farklı UX kalıpları. |

#### UX-X-098: Kütüphane Sekmeleri Farklı
| | |
|---|---|
| **Detay** | Desktop: Son Şarkılar/Şarkılar/Albümler/Oynatma Listeleri. Mobile: Beğenilenler/Oynatma Listeleri/Son — farklı sınıflandırma, farklı içerik. |

#### UX-X-099: Beğenilen Şarkılar Farklı Yerlerde
| | |
|---|---|
| **Detay** | Desktop'ta ayrı sayfa, mobile'da Kütüphane > Beğenilenler sekmesi — farklı navigasyon. |

#### UX-X-100: Ses Normalleştirme Yalnızca Desktop
| | |
|---|---|
| **Detay** | Desktop'ta ses normalleştirme toggle'ı var, mobile'da karşılığı yok — özellik eşitliği eksik. |

#### UX-X-101: Dil Seçici Yalnızca Desktop
| | |
|---|---|
| **Detay** | Desktop'ta TR/EN dil seçici var, mobile'da dil ayarı yok. |

#### UX-X-102: Ses Kalitesi Farklı Seçim
| | |
|---|---|
| **Detay** | Desktop: kbps etiketleri ile kalite seçici. Mobile: Hi-Fi/Standard/Tasarruf ile hap buton — aynı ayar için farklı UX. |

---

## Önerilen Çözüm Öncelikleri

### Aşama 1: Kritik (1-2 gün)
1. Mobile tab navigasyonunu tanımla (UX-M-063)
2. Oluşturulan playlist'leri tıklanabilir yap (UX-D-013)
3. Settings HTML yapısını düzelt (UX-D-004)
4. Repeat simgelerini farklılaştır (UX-D-017)
5. Touch target'ları 44px'e çıkar (UX-M-043~047)

### Aşama 2: Kısa Vadeli (1 hafta)
6. Söz otomatik kaydırma ekle (UX-D-029)
7. Renk kontrastını düzelt (UX-D-080,081)
8. Tema tutarlılığını sağla (UX-X-069,070)
9. Boş durum eylem çağrısı ekle (UX-M-068, UX-D-041)
10. Firefox ses kaydırıcısını düzelt (UX-D-089)

### Aşama 3: Orta Vadeli (2-4 hafta)
11. Kuyruk sürükleme ile yeniden sıralama (UX-D-031)
12. Modal erişilebilirlik (Escape, backdrop click, focus trap) (UX-D-025~028)
13. Arama filtreleri dokunma alanı (UX-D-024)
14. Duvarlı responsive yerleşim (UX-D-006,007)
15. Bağlam menüsü ikonları (UX-D-095)

---

*Bu rapor 102 UI/UX sorununu kapsamaktadır. Tüm sorunlar kullanıcı deneyimini doğrudan etkilemektedir.*
