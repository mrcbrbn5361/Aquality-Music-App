# 🛡️ Kategorik Sorun Denetimi: Güvenlik ve Gizlilik (Security & Privacy)

> **Kategori Kodu**: `SEC`  
> **Kapsam**: Tüm Proje (Masaüstü, Mobil, Web, Ağ İstekleri, Çerezler ve Tokenlar)  
> **Toplam Bulgu**: 7 Güvenlik Başlığı

---

## 🔍 1. Güvenlik Değerlendirme Matrisi

| Sorun ID | Öncelik | Başlık | Etkilenen Dosya | Durum |
|---|---|---|---|---|
| `SEC-06` | 🔴 KRİTİK | Google OAuth Gömülü Pencere "disallowed_useragent" Engeli | `desktop/src/main/auth/google-oauth.ts` | ❌ AÇIK |
| `SEC-07` | 🟠 YÜKSEK | Discord OAuth'ta CSRF State Parametresi Eksikliği | `desktop/src/main/auth/discord-oauth.ts` | ❌ AÇIK |
| `SEC-08` | 🔴 KRİTİK | Plaintext Token ve Client Secret Saklama | `desktop/src/main/utils/store.ts` | ❌ AÇIK |
| `SEC-09` | 🟠 YÜKSEK | Açık Bırakılan Chrome CDP Debug Portu (9222) | `desktop/src/main/auth/music-auth.ts` | ❌ AÇIK |
| `SEC-10` | 🟡 ORTA | Çevrimdışı Modda Güvensiz Font İstekleri ve CSP Gevşekliği | `desktop/src/renderer/index.html` | ❌ AÇIK |
| `SEC-11` | 🟠 YÜKSEK | Mobil InnerTube Sahte Windows User-Agent Riski | `mobile/src/api/innertube.ts` | ❌ AÇIK |
| `SEC-12` | 🟡 ORTA | NSIS Kaldırma Sonrası Kalan Hassas Çerez Dosyaları | `desktop/installer.nsh` | ❌ AÇIK |

---

## ⚠️ 2. Detaylı Güvenlik Açığı Analizleri

### `SEC-06`: Google OAuth Gömülü Pencere Engeli
- **Tehdit**: Google, phishing ve credential harvesting saldırılarını önlemek amacıyla gömülü tarayıcılardan (Embedded Webview/Chromium) OAuth akışlarını engeller.
- **Sonuç**: Kullanıcı şifresini girdiği anda "Bu tarayıcı veya uygulama güvenli olmayabilir" uyarısı alır ve işlem durur.
- **Çözüm**: RFC 8252 uyarınca `shell.openExternal()` ile harici sistem tarayıcısı açılmalıdır.

### `SEC-07`: Discord OAuth CSRF State Eksikliği
- **Tehdit**: Yetkilendirme kodu değişiminde bir `state` parametresi kullanılmamaktadır.
- **Sonuç**: Kötü niyetli bir yerel web sayfası kurbanın tarayıcısına yetkilendirme linkini tetikleterek yerel sunucuyu kandırabilir.
- **Çözüm**: Kriptografik rastgele `state` parametresi üretilip doğrulanmalıdır.

### `SEC-08`: Plaintext Token ve Secret Saklama
- **Tehdit**: `aquality-music-data.json` dosyası `%APPDATA%` altında şifresiz düz metin saklanmaktadır.
- **Sonuç**: Bilgisayardaki herhangi bir yazılım tokenları doğrudan okuyabilir.
- **Çözüm**: `safeStorage.encryptString()` kullanılmalıdır.

---

## 🛠️ 3. Güvenlik İyileştirme Yol Haritası

1. OAuth akışları harici tarayıcı ve PKCE + State standardına taşınmalıdır.
2. `safeStorage` entegrasyonu tamamlanmalıdır.
3. CDP bağlantısı işi biter bitmez Chrome debug oturumu sonlandırılmalıdır.
