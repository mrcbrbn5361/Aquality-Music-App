# 📄 Dosya Denetimi: `mobile/src/api/innertube.ts`

> **Dosya Yolu**: `mobile/src/api/innertube.ts`  
> **Kod Hacmi**: 524 Satır  
> **Rolü**: Mobil Cihazlar İçin Optimize Edilmiş YouTube Music InnerTube İstemcisi

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

Mobil istemcideki `innertube.ts`, masaüstündeki büyük versiyonun mobil ağlar için hafifletilmiş bir varyantıdır. `WEB_REMIX` client context'i ile çalışır. Hızlı arama, ana sayfa quick picks ve sanatçı/albüm ayrıştırması yapar.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🟠 YÜKSEK): Mobil Hücresel Bağlantıda İstek Zaman Aşımı Bulunmaması
- **Konum**: `mobile/src/api/innertube.ts:38-48`
- **Kök Neden**:
  ```ts
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload)
  });
  ```
  Mobil cihazlarda tünel, metro veya asansör gibi hücresel sinyalin koptuğu anlarda `fetch` istekleri asılı kalır. Hiçbir `timeout` veya `AbortSignal` tanımlanmadığı için ekran yüklenme indikatöründe (`ActivityIndicator`) takılı kalır ve kullanıcı uygulamayı kapatıp açmak zorunda kalır.
- **Düzeltme**:
  ```ts
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(..., { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  ```

---

### Sorun 2 (🟡 ORTA): Masaüstü Chrome User-Agent'ının Mobil Ağlarda Google Tarafından İşaretlenmesi
- **Konum**: `mobile/src/api/innertube.ts:7-8`
- **Kod**:
  ```ts
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  ```
- **Kök Neden**: Mobil cihaz (Android/iOS) hücresel IP'si üzerinden gönderilen istekte `Windows NT 10.0` User-Agent'ı kullanılmaktadır. Google'ın bot ve sahtecilik algoritmaları bu çelişkiyi tespit ettiğinde istekleri hızla CAPTCHA ve 403 Forbidden ile sınırlandırabilir.
- **Düzeltme**: `ANDROID_MUSIC` veya mobil platforma uygun resmi istemci kimliği kullanılmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Tüm API isteklerine 12 saniyelik zaman aşımı denetimi getirilmelidir.
2. User-Agent başlığı mobil bağlama uygun olarak güncellenmelidir.
