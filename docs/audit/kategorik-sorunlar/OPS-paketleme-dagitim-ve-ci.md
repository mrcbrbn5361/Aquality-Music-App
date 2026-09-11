# 📦 Kategorik Sorun Denetimi: Paketleme, Dağıtım ve CI/CD (Packaging & DevOps)

> **Kategori Kodu**: `OPS`  
> **Kapsam**: NSIS, Portable, Electron Builder, GitHub Actions, EAS Build  
> **Toplam Bulgu**: 5 DevOps Başlığı

---

## 🔍 1. DevOps Değerlendirme Matrisi

| Sorun ID | Öncelik | Başlık | Etkilenen Dosya | Durum |
|---|---|---|---|---|
| `OPS-01` | 🔴 KRİTİK | GitHub Actions Üzerinde Windows CI/CD Hattı Bulunmaması | `.github/workflows/` | ❌ AÇIK |
| `OPS-02` | 🔴 KRİTİK | PowerShell Scriptinde Sabit `d:\Aquality-Music-App` Yolu | `scripts/make-installer-bmps.ps1` | ❌ AÇIK |
| `OPS-03` | 🟠 YÜKSEK | macOS İçin Kod İmzalama (Code Signing) Bulunmaması | `.github/workflows/build-mac.yml` | ❌ AÇIK |
| `OPS-04` | 🟠 YÜKSEK | Web Sitesi İndirme Linkinin 404 Vermesi (Release Yokluğu) | `website/indir.html` | ❌ AÇIK |
| `OPS-05` | 🟡 ORTA | NSIS Uninstaller'ın Kullanıcı Çerezlerini Bırakması | `desktop/installer.nsh` | ❌ AÇIK |

---

## ⚠️ 2. Detaylı DevOps Analizleri

### `OPS-01`: Windows CI/CD Yokluğu
- **Problem**: Birincil hedef olan Windows platformu için otomatik build testi ve release yayınlama adımı yoktur. macOS için workflow varken Windows için olmaması büyük bir operasyonel eksikliktir.
- **Çözüm**: `windows-latest` üzerinde koşan tam otomatik iş akışı oluşturulmalıdır.

### `OPS-02`: PowerShell Sabit Yol Hatası
- **Problem**: Script içindeki `d:\...` yolu projenin başka ortamlarda inşa edilmesini engeller.
- **Çözüm**: `$PSScriptRoot` kullanılarak dinamikleştirilmelidir.

---

## 🛠️ 3. DevOps Yol Haritası

1. Windows GitHub Actions workflow'u eklenmelidir.
2. PowerShell ve build scriptleri ortamdan bağımsız hale getirilmelidir.
3. NSIS uninstaller temizliği tamamlanmalıdır.
