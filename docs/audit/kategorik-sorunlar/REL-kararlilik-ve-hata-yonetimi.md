# 🛑 Kategorik Sorun Denetimi: Kararlılık ve Hata Yönetimi (Reliability & Resilience)

> **Kategori Kodu**: `REL`  
> **Kapsam**: Çökme (Crash), Zaman Aşımları, Askıda Kalma ve Yarış Koşulları  
> **Toplam Bulgu**: 6 Kararlılık Başlığı

---

## 🔍 1. Kararlılık Değerlendirme Matrisi

| Sorun ID | Öncelik | Başlık | Etkilenen Dosya | Durum |
|---|---|---|---|---|
| `REL-01` | 🔴 KRİTİK | Çoklu Monitör Çıkarıldığında Ekran Dışı Başlama | `desktop/src/main/main.ts` | ❌ AÇIK |
| `REL-02` | 🔴 KRİTİK | Mobilde WebView Arka Planda Askıya Alınması | `mobile/src/services/player.ts` | ❌ AÇIK |
| `REL-03` | 🔴 KRİTİK | Android 14 Foreground Service Eksikliği ve Çökme | `mobile/src/services/player.ts` | ❌ AÇIK |
| `REL-04` | 🟠 YÜKSEK | Ağ İsteklerinde `AbortSignal.timeout` Bulunmaması | `desktop/src/main/api/innertube.ts` | ❌ AÇIK |
| `REL-05` | 🟠 YÜKSEK | `before-quit` Olayında 500ms ile Süreci Zorla Öldürme | `desktop/src/main/main.ts` | ❌ AÇIK |
| `REL-06` | 🟠 YÜKSEK | Discord OAuth 65432 Port Çakışması (`EADDRINUSE`) | `desktop/src/main/auth/discord-oauth.ts` | ❌ AÇIK |

---

## ⚠️ 2. Detaylı Kararlılık Analizleri

### `REL-01`: Görünmeyen Ekran Dışı Pencere
- **Senaryo**: Kullanıcı ofiste harici monitörle (örneğin 2560x1440 çözünürlükte sağda duran ekranda) uygulamayı kullanıp kapatır. Evde sadece dizüstü ekranıyla uygulamayı açtığında pencere `x: 2560` koordinatında açılır.
- **Sonuç**: Uygulama açık görünür ama ekranda yoktur.
- **Çözüm**: `screen.getAllDisplays()` ile sınama yapılmalıdır.

### `REL-02` & `REL-03`: Mobil Arka Plan Çökmesi ve Kilitlenmesi
- **Senaryo**: Kullanıcı mobilde şarkıyı başlatıp telefonu cebine koyar veya ekranı kilitler.
- **Sonuç**: WebView dondurulur, ses kesilir; Android 14'te servis bildirimi olmadığı için işletim sistemi süreci zorla öldürür (`crash`).
- **Çözüm**: Native medya oynatıcı ve Android bildirim servisi bağlanmalıdır.

### `REL-05`: `before-quit` Zorunlu Çıkış
- **Senaryo**: Uygulama kapatılırken `setTimeout(() => process.exit(0), 500)` çalışır.
- **Sonuç**: Diske yazılmakta olan veritabanı veya JSON ayar dosyası yarıda kesilerek bozulur.
- **Çözüm**: `process.exit(0)` kaldırılmalı, doğal süreç kapanışı beklenmelidir.

---

## 🛠️ 3. Kararlılık Yol Haritası

1. Pencere koordinat doğrulayıcı eklenmelidir.
2. Mobil ses mimarisi native servise taşınmalıdır.
3. Asenkron I/O işlemleri güvenli kapanışa kavuşturulmalıdır.
