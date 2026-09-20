# 🏛️ Aquality Music — Sistem Mimarisi & Teknoloji Yığını

## 1. Genel Bakış
Aquality Music, YouTube Music altyapısını kullanarak reklamsız, yüksek kaliteli ve modern bir dinleme deneyimi sunan 4 platformlu hibrit bir müzik ekosistemidir:
1. **Desktop:** Electron 28 + Vite + TypeScript (Windows NSIS/Portable, macOS DMG/ZIP).
2. **Mobile:** React Native + Expo Router (`AudioBridge` YouTube IFrame WebView ses motoru).
3. **Website:** Vite tabanlı statik SEO ve indirme portalı (Vercel barındırma: `https://aqualitymusic.vercel.app`).
4. **Discord Bot & RPC:** Discord.js v14 + Canvas oynatıcı kart motoru (`cardRenderer.js`) + Port 9863 REST API.

---

## 2. Teknoloji Yığını & Platform Katmanları

| Katman | Teknoloji / Çatılar | Detay / Rol |
| :--- | :--- | :--- |
| **Monorepo** | npm workspaces (`desktop`, `website`, `mobile`) | Sürüm: `1.0.2` · Bağımlılık kuralı: Sadece `npm ci` |
| **Masaüstü Çalışma Zamanı** | Electron 28.3.3 + Node 18.18.2 | Main / Preload / Renderer izolasyonu, contextIsolation: true |
| **Renderer UI** | Vite 5 + Vanilla TypeScript + CSS Variables | Özel tema motoru, Glassmorphism, Sanal Liste |
| **Mobil Uygulama** | React Native 0.74 + Expo SDK 51 | Expo Go uyumlu, Expo Router dosya tabanlı yönlendirme |
| **Mobil Ses Motoru** | `AudioBridge` (Hidden WebView + YouTube IFrame API) | Arka planda kesintisiz YouTube ses akışı |
| **Kimlik & Auth** | Google OAuth2 + InnerTube SAPISIDHASH | Gizli `loginWindow` (Chrome 131 UA), CDP desteği |
| **İletişim & RPC** | Discord RPC (`discord-rpc`) + Yerel REST API (Port 9863) | Oynatıcı durumu senkronizasyonu, Bearer token güvenliği |
| **Çoklu Ajan Köprüsü** | **SyncytiumMD (`.syncytium/`)** | OpenCode (Muse Spark) ↔ Antigravity ortak hafıza ve kural senkronizasyonu |

---

## 3. Dizin Yapısı ve Sınırları

```text
Aquality-Music-App/
├── .syncytium/                      # 🧠 Tek Doğruluk Kaynağı (Universal AI SSoT)
│   ├── syncytium.config.json       # 8 AI adaptörü konfigürasyonu
│   ├── architecture.md             # Bu mimari doküman
│   ├── HANDOFF.md                  # Canlı model devir teslim bayrağı
│   ├── rules/                      # Kanonik proje ve kodlama kuralları
│   └── memory/                     # Mimari Karar Kayıtları (ADRs)
├── desktop/                        # 💻 Masaüstü Uygulaması (Electron + Vite)
│   ├── src/main/                   # Ana süreç (auth, api, store, discord-rpc)
│   ├── src/preload/                # Köprü scriptleri (preload.ts, login-preload.ts)
│   └── src/renderer/               # Arayüz (DOM bileşenleri, oynatıcı, stiller)
├── mobile/                         # 📱 Mobil Uygulama (Expo + React Native)
│   ├── app/                        # Expo Router sayfaları ve modal pencereler
│   └── src/components/             # UI bileşenleri ve AudioBridge motoru
├── website/                        # 🌐 Web Sitesi (Vite)
│   └── dist/                       # Dağıtım derlemesi (Vercel deployment)
├── scripts/                        # 🛠️ Yardımcı Araçlar
│   ├── discord-bot/                # Discord botu ve Canvas kart çizici
│   └── update-docs.cjs             # Aquality Docs Engine (otomatik doküman senkronu)
└── memory.md                       # 🧠 Antigravity & OpenCode kalıcı oturum hafızası
```

---

## 4. Güvenlik & İletişim Sınırları
1. **Secret İzolasyonu:** Client Secret, API anahtarları ve auth token'ları asla Renderer süreçlerine aktarılmaz; yalnızca Node ana sürecinde tutulur.
2. **REST API Güvenliği (Port 9863):** Yalnızca yerel loopback veya izinli `aqualitymusic.vercel.app` origin'lerine izin verilir; harici tarayıcı kökenleri 403 Forbidden ile engellenir. Durum değişikliği yapan isteklerde Bearer token zorunludur.
3. **Electron 28 & Node 18 Uyumu:** Node 22+ API'leri (`node:sqlite` vb.) Electron 28 ortamında bulunmadığından kullanılmaz; stealth BrowserWindow ve güvenli dosya akışları tercih edilir.
