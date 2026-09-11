# 📄 Dosya Denetimi: `desktop/src/main/auth/discord-oauth.ts`

> **Dosya Yolu**: `desktop/src/main/auth/discord-oauth.ts`  
> **Kod Hacmi**: 246 Satır  
> **Rolü**: Discord OAuth2 (PKCE) Oturum Yönetimi

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`discord-oauth.ts`, kullanıcının Discord hesabıyla giriş yaparak profil bilgilerini (kullanıcı adı, avatar, e-posta) almasını ve uygulamadaki kullanıcı kartına bağlamasını sağlar. Discord Developer Portal üzerinde PKCE uyumlu masaüstü uygulaması olarak yapılandırılmıştır.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): Sabit Port (65432) Kilitlenmesi (`EADDRINUSE`)
- **Konum**: `desktop/src/main/auth/discord-oauth.ts:38-39`
- **Kod**:
  ```ts
  const OAUTH_PORT = 65432;
  const REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/callback`;
  ```
- **Kök Neden**: Yetkilendirme sunucusu sabit bir porta (`65432`) bağlanmaya çalışmaktadır.
- **Etki**:
  - Eğer kullanıcının bilgisayarında 65432 portunu kullanan başka bir uygulama varsa veya Aquality Music'in önceki bir oturumu arka planda asılı kalmışsa `server.listen(OAUTH_PORT)` çağrısı `Error: listen EADDRINUSE: address already in use 127.0.0.1:65432` hatası vererek çöker.
  - Kullanıcı Discord ile giriş yapamaz.
- **Düzeltme**:
  Dinamik port (`server.listen(0)`) veya alternatif port dizisi (`[65432, 65433, 65434]`) denenmeli, Discord Portal Redirect URI listesine de bu portlar eklenmelidir.

---

### Sorun 2 (🟠 YÜKSEK): Eksik CSRF Koruması (`state` Parametresi Yokluğu)
- **Konum**: `desktop/src/main/auth/discord-oauth.ts:98-100, 170-180`
- **Kök Neden**: OAuth akışında PKCE uygulanmış olmasına rağmen kriptografik bir `state` parametresi üretilmemiştir ve callback isteğinde doğrulanmamaktadır.
- **Etki**: Yerel makinedeki kötü niyetli bir süreç veya tarayıcı sekmesi `http://127.0.0.1:65432/callback?code=...` adresine sahte bir istek tetikleyerek kullanıcının oturumunu hedefleyebilir (Cross-Site Request Forgery).
- **Düzeltme**:
  ```ts
  const state = crypto.randomBytes(32).toString('hex');
  // authUrl'e state eklenmeli:
  // &state=${state}
  // Callback rotasında:
  if (url.searchParams.get('state') !== expectedState) {
    throw new Error('Geçersiz CSRF state parametresi');
  }
  ```

---

### Sorun 3 (🟡 ORTA): Sunucu Zaman Aşımı (Timeout) Bulunmaması
- **Konum**: `desktop/src/main/auth/discord-oauth.ts:91-116`
- **Kök Neden**: Yerel HTTP sunucusu açıldıktan sonra kullanıcı Discord onay ekranında bekler veya pencereyi kapatmadan bırakırsa sunucu süresiz olarak açık kalır.
- **Düzeltme**: 5 dakikalık bir güvenlik zaman aşımı (`setTimeout(() => finishError('Zaman aşımı'), 300000)`) eklenmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Sabit port yerine dinamik/yedekli port mekanizması kurulmalıdır.
2. `state` parametresi ile CSRF koruması zorunlu kılınmalıdır.
3. Asılı kalan sunucuları kapatmak için zaman aşımı mekanizması getirilmelidir.
