# CI/CD ve Paketleme Sorunları (OPS)

> **Toplam:** 3 sorun | **Yüksek:** 1 | **Orta:** 1 | **Düşük:** 1

---

## OPS-001: CI'da Typecheck Sadece Desktop Workspace

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `.github/workflows/build-windows.yml:30-31` + `.github/workflows/build-mac.yml:30-31` |
| **Kategori** | CI/CD Kalitesi |

### Sorun
```yaml
# build-windows.yml:30-31
- name: Typecheck Desktop
  run: npm --workspace=desktop run typecheck

# build-mac.yml:30-31
- name: Typecheck Desktop
  run: npm --workspace=desktop run typecheck
```

Sadece desktop workspace'inde typecheck çalışıyor. Mobile ve website workspace'leri kontrol edilmiyor.

### Etki
- Mobile ve website TypeScript hataları production'a geçebilir
- PR review'da yakalanamayan hatalar

### Çözüm
```yaml
# build-windows.yml
- name: Typecheck Desktop
  run: npm --workspace=desktop run typecheck

- name: Typecheck Mobile
  run: cd mobile && npx tsc --noEmit

- name: Typecheck Website
  run: cd website && npx tsc --noEmit 2>/dev/null || true  # Website TS kullanmıyorsa skip

# Veya root level'da tek komut
- name: Typecheck All
  run: |
    npm --workspace=desktop run typecheck
    cd mobile && npx tsc --noEmit
```

---

## OPS-002: Root ve Desktop Version Tutarlılığı

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `package.json` (root) + `desktop/package.json` |
| **Kategori** | Versiyon Yönetimi |

### Sorun
Root `package.json` ve `desktop/package.json` farklı versiyon numaralarına sahip olabilir. `electron-builder` versiyonu `desktop/package.json`'dan alıyor, ama auto-updater root'taki versiyonu kontrol ediyor olabilir.

### Etki
- Versiyon tutarsızlığı
- Auto-update sorunları
- Yanıltıcı "Hakkında" bilgisi

### Çözüm
```json
// root package.json'da version yoksa ekle
{
  "name": "aquality-music",
  "version": "1.0.1",
  "private": true
}

// desktop/package.json'da da aynı version
{
  "name": "aquality-music-desktop",
  "version": "1.0.1",
  // ...
}
```

Veya script ile otomatik senkronize et:
```javascript
// scripts/sync-version.js
const rootPkg = require('../package.json');
const desktopPkg = require('../desktop/package.json');

if (rootPkg.version !== desktopPkg.version) {
  desktopPkg.version = rootPkg.version;
  require('fs').writeFileSync(
    require('path').join(__dirname, '../desktop/package.json'),
    JSON.stringify(desktopPkg, null, 2) + '\n'
  );
  console.log(`Synced desktop version to ${rootPkg.version}`);
}
```

---

## OPS-003: Duplicate Dependency

| | |
|---|---|
| **Önem** | 🟢 DÜŞÜK |
| **Dosya** | `package.json` (root) + `desktop/package.json` |
| **Kategori** | Dependency Yönetimi |

### Sorun
```json
// root package.json
{
  "dependencies": {
    "discord-rpc": "^4.0.1"
  }
}

// desktop/package.json
{
  "dependencies": {
    "discord-rpc": "^4.0.1"
  }
}
```

`discord-rpc` hem root'ta hem desktop'ta dependency olarak tanımlı. npm workspaces'de bu, duplicate install'a neden olur.

### Etki
- Disk kullanımı artar
- `node_modules` boyutu büyür
- Versiyon çakışması riski

### Çözüm
```json
// root package.json'dan discord-rpc'yi kaldır
{
  "dependencies": {
    // discord-rpc KALDIRILDI - sadece desktop'ta olmalı
  }
}

// Veya desktop'tan kaldır, root'tan import et
// Ama bu npm workspaces'de çalışmaz - desktop'ta bırakmak daha iyi
```

---

## Çözüm Özeti

| ID | Çözüm Zorluğu | Süre | Öncelik |
|----|:---:|:---:|:---:|
| OPS-001 | Kolay | 30dk | Yüksek |
| OPS-002 | Kolay | 20dk | Orta |
| OPS-003 | Kolay | 10dk | Düşük |
