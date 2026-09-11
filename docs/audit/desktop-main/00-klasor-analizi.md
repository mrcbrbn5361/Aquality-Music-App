# 📁 Klasör Denetimi: `desktop/src/main/` (Masaüstü Ana Süreç)

> **Modül Adı**: Electron Main Process Controller & Native Bridges  
> **Dosya Sayısı**: 16 TypeScript Dosyası  
> **Toplam Satır**: ~4,580 Satır  
> **Kritik Güvenlik Sınırı**: Node.js Native Ortamı (Sistem İzinleri, Dosya Sistemi, Ağ ve IPC)

---

## 🏗️ 1. Mimari Yapı ve Sorumluluk Dağılımı

`desktop/src/main/` klasörü, Aquality Music masaüstü uygulamasının kalbidir. Electron'un iki süreçli (multi-process) mimarisinde doğrudan işletim sistemi API'lerine, yerel soketlere, dosya sistemine ve gizli tarayıcı pencerelerine erişimi olan tek yetkili katmandır.

```
desktop/src/main/
├── main.ts                    # Uygulama yaşam döngüsü, pencere yönetimi, IPC dinleyicileri
├── preload.ts                 # Renderer ile Main arasındaki güvenli contextBridge köprüsü
├── api/
│   ├── innertube.ts           # YouTube Music iç API (InnerTube) istekleri ve veri modelleri
│   └── stream-resolver.ts     # Gizli Chromium penceresi, reklam engelleme ve oynatma kontrolü
├── auth/
│   ├── music-auth.ts          # YouTube Music Chrome cookie transferi ve session partition
│   ├── google-oauth.ts        # Google Desktop OAuth akışı ve yerel token saklama
│   ├── google-credentials.ts  # Google Client ID & Secret ortam değişkenleri
│   └── discord-oauth.ts       # Discord OAuth2 (PKCE) akışı
├── lib/
│   └── discord-rpc/           # [ÖLÜ KOD] Yerel Discord RPC implementasyonu (5 dosya)
├── providers/
│   ├── auth-provider.ts       # YTMDesktop2 uyumlu harici istemci yetkilendirme
│   ├── lyrics-provider.ts     # Şarkı sözü ayar ve servis köprüsü
│   └── volume-ratio.ts        # [PLACEBO] Ses normalizasyon köprüsü
├── types/
│   └── discord-rpc.d.ts       # discord-rpc kütüphanesi ortam tipleri
└── utils/
    ├── discord.ts             # Discord Rich Presence RPC yöneticisi (npm tabanlı)
    └── store.ts               # electron-store tabanlı kalıcı veri yöneticisi
```

---

## ⚠️ 2. Bu Klasörde Tespit Edilen Sistemik Riskler

### A. Güvenlik ve Yetki İzolasyonu
- **Gömülü BrowserWindow'da OAuth Engeli**: Google OAuth akışı gömülü pencerede yapıldığı için Google'ın modern güvenlik mekanizması (`disallowed_useragent`) tarafından engellenmektedir.
- **CSRF Korumasız Callback Portları**: Discord OAuth akışında `state` parametresi bulunmamakta, yerel bir port (65432) statik olarak açılmaktadır.
- **Plaintext Secret Saklama**: Kullanıcı verisi içinde Google Client Secret ve tokenlar diskte şifresiz JSON olarak saklanmaktadır.

### B. Oturum ve Veri Akışı Çelişkileri
- `innertube.ts` dosyası Node.js yerel `fetch()` motorunu kullanırken, kullanıcının YouTube Music oturumu Electron'un izole `persist:aquality-music` session'ında tutulmaktadır. Fetch çağrılarına bu cookie'ler aktarılmadığı için beğeni listesi (`LM`) ve kütüphane çağrıları 401 hatası vermektedir.

### C. Performans ve Donanım Yükü
- `stream-resolver.ts` içinde oynatıcı penceresine `--disable-gpu` verilmiş olması ses ve video decode işlemlerini tamamen CPU çekirdeklerine aktarmakta, fan gürültüsü ve CPU aşırı kullanımına yol açmaktadır.
- 800ms ve 250ms'lik periyotlarla DOM üzerinde rekürsif `querySelectorAll('*')` Shadow DOM taraması yapılmaktadır.

### D. Ölü ve Sahte (Placebo) Modüller
- `desktop/src/main/lib/discord-rpc/` içerisindeki 5 dosya projede hiçbir yere import edilmemiştir.
- `volume-ratio.ts` içindeki `apply()` fonksiyonu hiçbir yerden çağrılmamakta ve YTM DOM'unda karşılığı bulunmamaktadır.

---

## 📋 3. Klasör İçi Dosya Detay Dokümantasyonları

Ayrıntılı dosya bazlı analiz ve kod düzeltmeleri için aşağıdaki dokümanları inceleyiniz:
- [main.ts İncelemesi](main.ts.md)
- [preload.ts İncelemesi](preload.ts.md)
- [api/innertube.ts İncelemesi](api-innertube.ts.md)
- [api/stream-resolver.ts İncelemesi](api-stream-resolver.ts.md)
- [auth/music-auth.ts İncelemesi](auth-music-auth.ts.md)
- [auth/google-oauth.ts İncelemesi](auth-google-oauth.ts.md)
- [auth/discord-oauth.ts İncelemesi](auth-discord-oauth.ts.md)
- [lib/discord-rpc/ İncelemesi](lib-discord-rpc.md)
- [providers/ İncelemesi](providers.md)
- [utils/store.ts İncelemesi](utils-store.ts.md)
- [utils/discord.ts İncelemesi](utils-discord.ts.md)
