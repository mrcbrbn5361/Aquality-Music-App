# 📁 Klasör Denetimi: `scripts/`, `.github/` ve Kök Altyapı

> **Modül Adı**: Build & CI/CD Pipeline, Maintenance Scripts, Monorepo Roots  
> **Dosya Sayısı**: 10 Dosya  
> **Toplam Satır**: ~1,450 Satır  
> **Rolü**: Proje Otomasyonu, Paketleme ve Sürekli Entegrasyon

---

## 🏗️ 1. Mimari Yapı ve Değerlendirme

Bu katman projenin inşa edilmesini, paketlenmesini, dokümantasyonunun senkronize edilmesini ve GitHub Actions üzerinde sürekli entegrasyonunu sağlar.

```
/
├── package.json               # NPM Workspaces kök dosyası (desktop, website, mobile)
├── tsconfig.json              # Kök TS derleyici ayarı
├── .github/workflows/
│   └── build-mac.yml          # macOS GitHub Actions workflow'u
├── scripts/
│   ├── update-docs.cjs        # Otomatik doküman ve durum senkronizasyon aracı
│   ├── update-status.cjs      # Geriye dönük uyumluluk wrapper'ı
│   └── make-installer-bmps.ps1# NSIS installer BMP görsel üreteci
└── desktop/
    ├── installer.nsh          # NSIS kurulum/kaldırma özelleştirme scripti
    └── package.json           # Masaüstü Electron paketleme konfigürasyonu
```

---

## ⚠️ 2. Bu Klasörde Tespit Edilen Sistemik Riskler

### A. Windows CI/CD Pipeline Eksikliği
- Proje esas olarak bir **Windows 11** uygulaması olarak geliştirilmiş ve pazarlanmış olmasına rağmen, `.github/workflows/` altında **yalnızca macOS derleme iş akışı (`build-mac.yml`)** bulunmaktadır. Windows `.exe` veya NSIS kurulum paketlerini derleyen, test eden veya artifact olarak yükleyen hiçbir GitHub Actions workflow'u yoktur!

### B. PowerShell Scriptinde Sabit Disk Yolu
- `scripts/make-installer-bmps.ps1` dosyasında `$baseDir = "d:\Aquality-Music-App"` şeklinde sabit bir yerel disk yolu kodlanmıştır. Proje başka bir geliştirici tarafından `C:\` sürücüsüne veya CI sunucusuna klonlandığında bu script çökmektedir.

### C. NSIS Kaldırma Temizliği Eksiklikleri
- `installer.nsh` içindeki `customUnInstall` makrosunda `%APPDATA%\Aquality Music` klasörü silinmemektedir.

---

## 📋 3. Klasör İçi Dosya Detay Dokümantasyonları

Ayrıntılı dosya bazlı analiz ve kod düzeltmeleri için aşağıdaki dokümanları inceleyiniz:
- [scripts.md İncelemesi](scripts.md)
- [ci-cd-workflows.md İncelemesi](ci-cd-workflows.md)
- [desktop-configs.md İncelemesi](desktop-configs.md)
- [root-configs.md İncelemesi](root-configs.md)
