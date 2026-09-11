# 📄 Dosya Denetimi: `desktop/src/main/auth/music-auth.ts`

> **Dosya Yolu**: `desktop/src/main/auth/music-auth.ts`  
> **Kod Hacmi**: 745 Satır  
> **Rolü**: YouTube Music Çerez Tabanlı Kimlik Doğrulama ve Chrome İçe Aktarım Yöneticisi

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`music-auth.ts`, kullanıcının YouTube Music hesabına erişebilmesi için geliştirilmiş çerez yönetim mekanizmasıdır. İki farklı yöntem sunar:
1. **İzole Webview Girişi**: `persist:aquality-music` session'ı altında özel başlıklar (`Client Hints`, `Sec-CH-UA`, sahte Chrome User-Agent) ile oturum açma penceresi sunmak.
2. **Chrome'dan Çerez İçe Aktarma**: Kullanıcının yerel Chrome profilindeki YouTube Music oturumunu CDP (`chrome-remote-interface`) veya doğrudan SQLite cookie veritabanı kopyalaması ile Electron'un `persist` partition'ına aktarmak.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): CDP Bağlantısında Port Çakışması ve Açık Bırakılan Hata Ayıklama Portu
- **Konum**: `desktop/src/main/auth/music-auth.ts:17, 300-360`
- **Kod**:
  ```ts
  const CHROME_DEBUG_PORTS = [9222, 9333];
  ```
- **Kök Neden**: Kullanıcının Chrome tarayıcısını uzaktan yönetmek için Chrome, `--remote-debugging-port=9222` ile başlatılmaktadır.
- **Etki**:
  - Eğer kullanıcının bilgisayarında zaten 9222 portunu kullanan bir geliştirici aracı (VSCode debugger, başka bir Electron uygulaması veya aktif Chrome) varsa bağlantı kurulamamakta veya yanlış hedefe bağlanılmaktadır.
  - Açık kalan 9222 debug portu, yerel ağdaki veya aynı makinedeki kötü niyetli bir sürecin Chrome sekmesine tam yetkiyle bağlanıp çerezleri ve web sayfalarını okumasına olanak tanır.
- **Düzeltme**: İşlem tamamlandığında Chrome debug süreci derhal güvenli şekilde kapatılmalı ve port dinamik olarak atanmalıdır.

---

### Sorun 2 (🟡 ORTA): `onBeforeSendHeaders` İstek Başlıklarının Çok Geniş Tutulması
- **Konum**: `desktop/src/main/auth/music-auth.ts:64-76`
- **Kod**:
  ```ts
  ses.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.google.com/*', '*://*.youtube.com/*', '*://*.googleusercontent.com/*'] },
    (details, cb) => {
      const h = details.requestHeaders;
      h['Sec-CH-UA'] = '"Chromium";v="126", "Google Chrome";v="126", "Not.A/Brand";v="8"';
      // ...
    }
  );
  ```
- **Kök Neden**: Google Client Hints ekleme kuralı `*://*.googleusercontent.com/*` gibi görsel CDN domainlerine de uygulanmaktadır. Statik görsellerin çekilmesinde gereksiz başlık ekleme ek ağ ek yükü oluşturur.
- **Düzeltme**: URL filtreleri sadece `accounts.google.com` ve `music.youtube.com` alan adlarıyla sınırlandırılmalıdır.

---

### Sorun 3 (🟡 ORTA): Geçici Dosya İşlemlerinde İstisna Güvenliği (Cleanup Resilience)
- **Konum**: `desktop/src/main/auth/music-auth.ts:450-520`
- **Kök Neden**: Chrome SQLite cookie veritabanı kopyalanırken `fs.copyFileSync` kullanılmaktadır. Kopyalama esnasında veya SQLite okuması sırasında beklenmeyen bir hata fırlatıldığında `os.tmpdir()` altındaki geçici dosya silinemeyip artık (leftover) veri olarak diskte kalabilmektedir.
- **Düzeltme**: `try ... finally` blokları ile geçici dosyanın her senaryoda silindiği (`fs.unlinkSync`) garanti altına alınmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Chrome Debug portu dinamik yönetilmeli ve işlem bitince anında kapatılmalıdır.
2. `onBeforeSendHeaders` kapsamı yalnızca kimlik doğrulama uç noktalarıyla daraltılmalıdır.
3. Geçici dosya temizliği `finally` bloklarıyla güçlendirilmelidir.
