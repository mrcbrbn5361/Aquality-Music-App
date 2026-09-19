# 📦 06. Paketleme ve Dağıtım

> **Aquality Music Paketleme ve Kurulum Rehberi**  
> `electron-builder` yapılandırması, NSIS kurulum sihirbazı, Portable mod veri izolasyonu ve otomatik görsel üretimi.

---

<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | `2026-09-19 14:51` |
| **Proje Sürümü** | `v1.0.2` (Masaüstü: `v1.0.2`, Web: `v1.0.2`) |
| **Git Dalı (Branch)** | `master` |
| **Son Commit** | `65c5f46 - fix(desktop): secure bot server with origin verification and enforced bearer token validation (1 second ago)` |
| **TypeScript Derleme Sağlığı** | ✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız) |
| **Takip Edilen Sorunlar** | 24 / 24 Çözüldü (%100 Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->

---

## 1. Electron-Builder Yapılandırması (`desktop/package.json`)

Masaüstü paketi `electron-builder` ile derlenir:

```json
"build": {
  "appId": "com.aquality.music",
  "productName": "Aquality Music",
  "directories": {
    "output": "release"
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      },
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "assets/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Aquality Music",
    "include": "installer.nsh",
    "installerLanguages": ["tr_TR", "en_US"],
    "language": "1055"
  }
}
```

---

## 2. Özel NSIS Kurulum Komut Dosyası (`desktop/installer.nsh`)

Kurulum ve kaldırma sırasında tam temizlik sağlamak için özel NSIS kancaları eklenmiştir:

```nsis
!macro customInstall
  ; Masaüstü ve başlat menüsü kısayollarında çalışma dizinini $INSTDIR yap
  SetOutPath "$INSTDIR"
!macroend

!macro customUnInstall
  ; Kaldırma sırasında geçici oturum dosyalarını ve çerezleri temizle
  RMDir /r "$APPDATA\\aquality-music"
  RMDir /r "$LOCALAPPDATA\\aquality-music-updater"
!macroend
```

---

## 3. Portable Mod Veri İzolasyonu (`PKG-01`)

`main.ts` içinde portable mod kontrolü:
```typescript
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const portableDataDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
  app.setPath('userData', portableDataDir);
  console.log('[Portable] Veri dizini izole edildi:', portableDataDir);
}
```
Bu sayede USB bellekten çalıştırıldığında bilgisayarda hiçbir iz bırakılmaz.

---

## 4. Kurulumcu Başlık ve Kenar Çubuğu Görselleri (BMP Üretimi)

NSIS kurulum sihirbazı için gerekli olan 24-bit BMP dosyaları (`installerHeader.bmp: 150x57` ve `installerSidebar.bmp: 164x314`) PowerShell betiği (`scripts/make-installer-bmps.ps1`) ile `System.Drawing` kütüphanesi kullanılarak profesyonel koyu yeşil gradyan ile otomatik üretilmiştir.

---

## 5. Derleme Komutları

- **Tüm Windows Paketlerini Derle**:
  ```bash
  npm run build:win
  ```
- **Yalnızca Kurulum Sihirbazı (NSIS)**:
  ```bash
  npm run build:installer
  ```
- **Yalnızca Taşınabilir (.exe)**:
  ```bash
  npm run build:portable
  ```
Tüm çıktılar `desktop/release/` dizininde oluşturulur.
