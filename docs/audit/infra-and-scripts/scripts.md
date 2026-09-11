# 📄 Dosya Denetimi: `scripts/` (`update-docs.cjs`, `update-status.cjs`, `make-installer-bmps.ps1`)

> **Dosya Yolları**: `scripts/update-docs.cjs`, `scripts/update-status.cjs`, `scripts/make-installer-bmps.ps1`  
> **Kod Hacmi**: ~540 Satır  
> **Rolü**: Dokümantasyon Senkronizasyonu ve NSIS BMP Üretimi

---

## 🔍 1. Genel İnceleme

- `update-docs.cjs`: Git durumunu, TypeScript derleme sağlığını ve satır sayılarını (LOC) ölçerek `PROJE-DURUM.md` ve `docs/08-SORUNLAR-VE-COZUMLER.md` dosyalarını günceller.
- `make-installer-bmps.ps1`: `icon.png` dosyasından NSIS Installer için `installerHeader.bmp` (150x57) ve `installerSidebar.bmp` (164x314) üretir.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): PowerShell Scriptinde Sabit "d:\Aquality-Music-App" Yolu
- **Konum**: `scripts/make-installer-bmps.ps1:3`
- **Kod**:
  ```powershell
  $baseDir = "d:\Aquality-Music-App"
  $iconPath = Join-Path $baseDir "desktop\assets\icon.png"
  ```
- **Kök Neden**: Kök dizin yolu sabit olarak `d:\Aquality-Music-App` yazılmıştır.
- **Etki**: Projeyi `C:\Users\...` veya başka bir sürücüye indiren geliştiriciler veya CI/CD iş akışları bu scripti çalıştırdığında `icon.png bulunamadi` hatasıyla derleme çöker.
- **Düzeltme**:
  ```powershell
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $baseDir = Split-Path -Parent $scriptDir
  ```

---

### Sorun 2 (🟠 YÜKSEK): `update-docs.cjs` İçinde Statik Sorun Listesi Kısıtı
- **Konum**: `scripts/update-docs.cjs:124-250`
- **Açıklama**: Kod içinde 21 maddelik statik bir dizi hardcoded olarak tutulmaktadır. Kod tabanında yeni bir açık çözüldüğünde veya yeni bir sorun eklendiğinde `scripts/update-docs.cjs` dosyası her çalıştırıldığında bu statik listeyi geri basarak yeni verilerin ezilmesine yol açabilir.
- **Düzeltme**: Sorun listesi harici bir JSON dosyasından (`docs/issues.json`) dinamik okunmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. PowerShell yolu scriptin çalıştığı dizine göre dinamik hale getirilmelidir.
2. Sorun listesi dinamik JSON veri kaynağından beslenmelidir.
