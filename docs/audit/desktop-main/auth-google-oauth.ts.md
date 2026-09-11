# 📄 Dosya Denetimi: `desktop/src/main/auth/google-oauth.ts` ve `google-credentials.ts`

> **Dosya Yolu**: `desktop/src/main/auth/google-oauth.ts` ve `desktop/src/main/auth/google-credentials.ts`  
> **Kod Hacmi**: 379 Satır + 6 Satır  
> **Rolü**: Google OAuth 2.0 Kimlik Doğrulama ve Token Yenileme

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`google-oauth.ts`, kullanıcının Google hesabıyla resmi OAuth 2.0 akışı üzerinden giriş yapmasını sağlamak üzere tasarlanmıştır. İçerisinde yerel bir Node.js HTTP sunucusu (`http.createServer`) açarak `http://127.0.0.1:{port}/callback` adresine gelecek yetkilendirme kodunu (`code`) bekler ve bu kodu Google Token uç noktasına ileterek `access_token` ve `refresh_token` alır.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): Gömülü BrowserWindow İçinde Google Giriş Engeli ("disallowed_useragent")
- **Konum**: `desktop/src/main/auth/google-oauth.ts:233-245`
- **Kod**:
  ```ts
  authWindow = new BrowserWindow({
    width: 500,
    height: 700,
    parent: parentWindow,
    modal: true,
    title: 'Google ile Giriş Yap',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  authWindow.loadURL(authUrl);
  ```
- **Kök Neden**: Google, Electron pencereleri, WebView'lar veya gömülü tarayıcılardan OAuth oturum açılmasını kesin olarak yasaklamıştır (Google OAuth 2.0 Güvenlik Politikası: *Disallowed Embedded Webviews*). Kullanıcı bu pencerede Google hesabını girmeye çalıştığında Google sistemi Chromium/Electron imzasını tespit eder ve derhal **"403: disallowed_useragent / Bu tarayıcı veya uygulama güvenli olmayabilir"** hatası ile girişi engeller.
- **Etki**: Kullanıcı masaüstü uygulamasında Google OAuth ile ASLA oturum açamaz.
- **Düzeltme**:
  Google OAuth standartlarına (RFC 8252 - OAuth 2.0 for Native Apps) uyulmalı, gömülü `BrowserWindow` tamamen kaldırılarak `shell.openExternal(authUrl)` ile kullanıcının varsayılan sistem tarayıcısı (Chrome, Edge, Firefox) açılmalıdır:
  ```ts
  import { shell } from 'electron';
  shell.openExternal(authUrl);
  ```

---

### Sorun 2 (🔴 KRİTİK): Çift Token Exchange ve Yarış Koşulu (Race Condition)
- **Konum**: `desktop/src/main/auth/google-oauth.ts:134-165` ve `247-285`
- **Kod**:
  - `server` request işleyicisi içinde token exchange çağrısı (`POST https://oauth2.googleapis.com/token`)
  - `authWindow.webContents.on('did-navigate')` içinde AYNI token exchange çağrısı
- **Kök Neden**: Kod hem yerel HTTP sunucusunun gelen isteğinde hem de Electron penceresinin `did-navigate` olayında paralel olarak `fetch(GOOGLE_TOKEN_URL, ...)` çağrısı yapmaktadır.
- **Etki**: Tek kullanımlık olan `authorization_code` için aynı anda iki istek gönderilir. İlk gelen isteğe Google token verirken, milisaniye farkıyla giden ikinci istek **"invalid_grant: code already redeemed"** hatası alır ve akış `cleanup()` yaparak oturumu iptal edebilir.
- **Düzeltme**: `did-navigate` olayı iptal edilmeli, token değişimi yalnızca yerel HTTP sunucusunun callback rotasında yapılmalıdır.

---

### Sorun 3 (🟠 YÜKSEK): PKCE (Proof Key for Code Exchange) Eksikliği
- **Konum**: `desktop/src/main/auth/google-oauth.ts:224-231`
- **Kök Neden**: Discord OAuth akışında PKCE (`verifier` ve `challenge`) uygulanmışken, Google OAuth akışında PKCE kullanılmamıştır.
- **Etki**: Masaüstü uygulamalarında client secret gizli tutulamayacağı için, PKCE olmadan authorization code'un yetkisiz bir yerel süreç tarafından ele geçirilmesi durumunda token çalınabilir.
- **Düzeltme**: `code_verifier` ve `code_challenge` üretilerek `authUrl` ve token exchange gövdesine eklenmelidir.

---

### Sorun 4 (🟠 YÜKSEK): Paketlemede Boş Gelen Çevre Değişkenleri
- **Konum**: `desktop/src/main/auth/google-credentials.ts:4-5`
- **Kod**:
  ```ts
  export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
  ```
- **Kök Neden**: Uygulama derlenip `.exe` kurulum paketi yapıldığında son kullanıcının makinesinde `process.env.GOOGLE_CLIENT_ID` tanımsız (`undefined`) olacaktır.
- **Etki**: Kullanıcı Google ile giriş butonuna bastığında konsolda ve ekranda doğrudan `"Google bilgileri eksik (uygulama paketi hatalı)."` hatası belirir.
- **Düzeltme**: Ayarlar ekranında kullanıcının kendi Client ID ve Secret'ını girebileceği bir alan sağlanmalı veya derleme sırasında güvenli build-time injection yapılmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Gömülü pencere kaldırılmalı, `shell.openExternal` ile sistem tarayıcısına geçilmelidir.
2. `did-navigate` içindeki mükerrer token exchange kodu silinmelidir.
3. PKCE desteği entegre edilmelidir.
4. Çevre değişkeni eksikliğinde kullanıcı dostu yönlendirme sunulmalıdır.
