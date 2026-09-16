# 💻 09. Geliştirici Kılavuzu

> **Aquality Music Geliştirici El Kitabı**  
> Projeyi sıfırdan çalıştırma, geliştirme döngüsü, derleme, hata ayıklama ve test kılavuzu.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-16 23:24` |
| **Proje Sürümü** | `v1.0.1` (Masaüstü: `v1.0.1`, Web: `v1.0.1`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `f1dc31d - fix(auth): resolve Google 'browser not secure' error and unblock guest playback (2 seconds ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 24 / 24 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 1. Ön Gereksinimler (Prerequisites)

1. **Node.js**: Sürüm 18 veya 20 LTS.
2. **Git**: Sürüm kontrolü ve kancalar (hooks) için.
3. **Windows Derleme Araçları**: Eğer yerel C/C++ modülleri yeniden derlenecekse Visual Studio C++ Build Tools (Python & C++).

---

## 2. Kurulum ve İlk Çalıştırma

Terminali proje kök dizininde açın:

```bash
# 1. Bağımlılıkları yükleyin
npm install

# 2. Geliştirme ortamını başlatın (Dokümanları otomatik günceller ve Electron'u açar)
npm run dev
```

---

## 3. Kullanılabilir NPM Komutları

| Komut | Açıklama |
|---|---|
| `npm run dev` | Masaüstü uygulamasını Vite HMR ve Electron ile hot-reload modunda başlatır. |
| `npm run build` | Hem ana süreci (`tsc`) hem de arayüzü (`vite build`) derler. |
| `npm run build:website` | Web sitesini `website/dist/` klasörüne statik olarak derler. |
| `npm run build:win` | Windows için hem Setup hem Portable paketleri `desktop/release/` içine üretir. |
| `npm run build:installer` | Yalnızca NSIS Setup kurulum sihirbazını (`.exe`) üretir. |
| `npm run build:portable` | Yalnızca taşınabilir Portable (`.exe`) sürümünü üretir. |
| `npm run docs:update` | Tüm Markdown dokümanlarını ve durum matrisini canlı analiz edip günceller. |
| `npm run status:update` | Kök dizindeki `PROJE-DURUM.md` dosyasını yeniler. |

---

## 4. Tip Kontrolleri (TypeScript Verification)

Projenin tip güvenliğini doğrulamak için:

```bash
# Ana Süreç Tip Kontrolü
npx tsc --noEmit -p desktop/tsconfig.main.json

# Arayüz (Renderer) Süreç Tip Kontrolü
npx tsc --noEmit -p desktop/tsconfig.json
```

---

## 5. Hata Ayıklama ve Loglar (Debugging)

- **`debug.log` & `debug-err.log`**: Uygulama çalışırken kök dizinde oluşan log dosyalarıdır.
- **Chromium DevTools**: Masaüstü uygulamasında `Ctrl + Shift + I` tuşlarına basarak geliştirici konsolunu açabilirsiniz.
- **Adblock & Stream Resolver Logları**: Terminal çıktısında `[Adblock]`, `[StreamResolver]`, `[InnerTube]` önekleriyle izlenebilir.
