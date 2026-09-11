# 📄 Dosya Denetimi: `desktop/src/main/utils/discord.ts`

> **Dosya Yolu**: `desktop/src/main/utils/discord.ts`  
> **Kod Hacmi**: 180 Satır  
> **Rolü**: Discord Rich Presence (RPC) Durum Yayıncısı

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`discord.ts`, kullanıcının o an dinlediği parçanın adını, sanatçısını, geçen süreyi ve albüm kapağını Discord profili üzerinde "Aquality Music Dinliyor" şeklinde yayınlayan sınıftır.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): 8 Saniyelik Asılı Kalma (Login Timeout Block)
- **Konum**: `desktop/src/main/utils/discord.ts:60-65`
- **Kod**:
  ```ts
  const timeoutPromise = new Promise<void>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 8000)
  );
  await Promise.race([Promise.all([connectPromise, loginPromise]), timeoutPromise]);
  ```
- **Kök Neden**: Discord kapalıyken uygulama açıldığında veya yeniden bağlanırken 8 saniye boyunca IPC soketi beklenir. Bu sırada IPC kuyruğuna gelen diğer Discord istekleri bekletilir.
- **Düzeltme**: Zaman aşımı süresi 3-4 saniyeye düşürülmeli ve arka planda asenkron olarak (non-blocking) çalıştırılmalıdır.

---

### Sorun 2 (🟡 ORTA): Discord Bot ve CDN Görsel URL Boyut Sınırları
- **Konum**: `desktop/src/main/utils/discord.ts:98-120`
- **Kod**:
  ```ts
  const cover = (data.coverUrl || data.largeImageKey || '') as string;
  ```
- **Kök Neden**: YouTube Music bazen çok uzun query string parametreleri içeren kapak URL'leri üretir. Discord RPC protokolünde `large_image` URL uzunluğu maksimum 256 karakterdir. 256 karakteri aşan URL'ler gönderildiğinde Discord IPC soketi `Error: Payload too large` veya doğrulama hatası vererek aktiviteyi yayınlamayı reddeder.
- **Düzeltme**: URL uzunluğu kontrol edilmeli, 256 karakteri aşıyorsa basitleştirilmiş `https://i.ytimg.com/vi/{id}/hqdefault.jpg` formatına dönüştürülmelidir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Bağlantı zaman aşımı 3 saniyeye çekilmeli ve ana süreci bekletmeyecek şekilde izole edilmelidir.
2. Kapak URL'leri 256 karakter kuralına göre sanitize edilmelidir.
