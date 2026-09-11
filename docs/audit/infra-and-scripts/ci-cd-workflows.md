# 📄 Dosya Denetimi: `.github/workflows/` (Sürekli Entegrasyon ve Dağıtım)

> **Dosya Yolu**: `.github/workflows/build-mac.yml`  
> **Kod Hacmi**: 39 Satır  
> **Rolü**: GitHub Actions Otomatik Derleme Hattı

---

## 🔍 1. Genel İnceleme

Projede GitHub Actions için yalnızca tek bir iş akışı (`build-mac.yml`) bulunmaktadır. Bu iş akışı `macos-latest` üzerinde `npm run build:mac` komutunu çalıştırarak `.dmg` ve `.zip` çıktılarını üretip artifact olarak kaydetmektedir.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): Windows İçin CI/CD İş Akışının Tamamen Bulunmaması
- **Konum**: `.github/workflows/`
- **Kök Neden**: Proje "%100 Windows 11 Odaklı" olarak konumlandırılmış olmasına rağmen, GitHub Actions üzerinde Windows derlemesi (`build-win.yml`) bulunmamaktadır.
- **Etki**:
  - Yapılan commit'lerde Windows NSIS ve Portable build'lerinin kırılıp kırılmadığı test edilmemektedir.
  - GitHub Releases sayfasına otomatik Windows `.exe` yüklemesi yapılamamaktadır.
- **Düzeltme**: `windows-latest` üzerinde `npm run build:win` ve `npm run build:portable` çalıştıran `build-windows.yml` iş akışı eklenmelidir.

---

### Sorun 2 (🟠 YÜKSEK): macOS Kod İmzalama (Code Signing) ve Notarization Eksikliği
- **Konum**: `.github/workflows/build-mac.yml:26-30`
- **Açıklama**: macOS derlemesinde Apple Geliştirici Sertifikası (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`) tanımlı değildir.
- **Etki**: Üretilen `.dmg` ve `.zip` dosyaları imzasızdır. Bir Mac kullanıcısı indirdiğinde Apple Gatekeeper **"Uygulama hasarlı olduğu için açılamıyor"** uyarısı vererek çalıştırmayı engeller.
- **Düzeltme**: Apple Developer kimlik bilgileri GitHub Secrets üzerinden `electron-builder` ortamına aktarılmalıdır.

---

### Sorun 3 (🟡 ORTA): Otomatik Test ve Lint Adımlarının Yokluğu
- **Konum**: `.github/workflows/build-mac.yml:23-28`
- **Açıklama**: İş akışında derleme öncesinde `npm run typecheck` veya test adımları koşulmamaktadır. Hatalı tip veya syntax içeren kodlar bile derlenmeye çalışılmaktadır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `build-windows.yml` iş akışı eklenmelidir.
2. Otomatik typecheck ve lint adımları CI'a dahil edilmelidir.
3. macOS için kod imzalama sertifikaları bağlanmalıdır.
