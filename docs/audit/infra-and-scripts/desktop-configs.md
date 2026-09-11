# 📄 Dosya Denetimi: `desktop/` Yapılandırma ve Paketleme Dosyaları

> **Dosyalar**: `desktop/package.json`, `desktop/installer.nsh`, `desktop/tsconfig.json`, `desktop/tsconfig.main.json`, `desktop/vite.config.ts`  
> **Rolü**: Electron Derleme ve Windows NSIS Dağıtım Yapılandırması

---

## 🔍 1. Genel İnceleme

- `desktop/package.json`: `electron-builder` ayarları, Windows NSIS ve Portable hedefleri, dosya filtreleri.
- `installer.nsh`: NSIS kurulum sihirbazı kısayolları ve uninstaller komutları.
- `tsconfig.json` & `tsconfig.main.json`: TypeScript hedef ve modül çözünürlükleri.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): NSIS Uninstaller'ın Kullanıcı Verilerini (%APPDATA%) Sormadan Bırakması
- **Konum**: `desktop/installer.nsh:17-24`
- **Kod**:
  ```nsis
  !macro customUnInstall
    SetShellVarContext current
    RMDir /r "$TEMP\aquality-music-chrome-profile"
    RMDir /r "$TEMP\aquality-music-*"
    RMDir /r "$LOCALAPPDATA\aquality-music-updater"
    Delete "$DESKTOP\Aquality Music.lnk"
    Delete "$SMPROGRAMS\Aquality Music.lnk"
  !macroend
  ```
- **Kök Neden**: Kullanıcı uygulamayı Denetim Masası'ndan kaldırdığında `%APPDATA%\Aquality Music` (çerezler, oturum tokenları, çalma listeleri) sessizce diskte bırakılmaktadır. Kullanıcı uygulamayı tamamen temizlemek istediğinde oturum izleri ve veritabanı silinmez.
- **Düzeltme**: Kullanıcıya bir MessageBox ile "Kullanıcı verilerinizi ve oturum çerezlerinizi de silmek istiyor musunuz?" sorusu sorulmalı ve evet denirse `RMDir /r "$APPDATA\Aquality Music"` silinmelidir.

---

### Sorun 2 (🟡 ORTA): Vite ve TSC Arasında OutDir Çakışması
- **Konum**: `desktop/package.json:15-17`
- **Kod**:
  ```json
  "build": "npm run build:main && npm run build:renderer",
  "build:main": "tsc -p tsconfig.main.json",
  "build:renderer": "vite build"
  ```
- **Açıklama**: `vite build` çalıştırıldığında `dist/renderer` dizinini `emptyOutDir` ile temizlerken bazen paralel derlemelerde `dist/main` çıktılarına dokunabilmektedir. Temizlik adımları sıralı ve izole klasör bazlı yapılmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. NSIS Uninstaller'a kullanıcı verisi temizleme seçeneği eklenmelidir.
2. Derleme adımları ve çıktı klasörleri tam izole edilmelidir.
