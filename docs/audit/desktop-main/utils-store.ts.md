# 📄 Dosya Denetimi: `desktop/src/main/utils/store.ts`

> **Dosya Yolu**: `desktop/src/main/utils/store.ts`  
> **Kod Hacmi**: 121 Satır  
> **Rolü**: `electron-store` Sarmalayıcısı, Kalıcı Veri ve Çalma Listesi Modeli

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`store.ts`, kullanıcı tercihlerini (tema, dil, ses seviyesi), son çalınan şarkıları, beğenilen şarkıları, oynatma sırasını (queue) ve yerel oynatma listelerini (playlists) disk üzerinde `%APPDATA%/Aquality Music/aquality-music-data.json` dosyasında saklar.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): Hassas Verilerin (Secret & Token) Düz Metin (Plaintext) Olarak Saklanması
- **Konum**: `desktop/src/main/utils/store.ts:15-16`
- **Kod**:
  ```ts
  interface StoreData {
    // ...
    oauthClientId?: string;
    oauthClientSecret?: string;
  }
  ```
- **Kök Neden**: Google Client Secret ve token verileri işletim sistemi şifrelemesi (Windows DPAPI / `safeStorage`) olmadan doğrudan düz metin (plain text) JSON olarak diske yazılmaktadır.
- **Etki**: Kullanıcının bilgisayarına erişen herhangi bir üçüncü taraf yazılım veya zararlı kod, kullanıcının Google OAuth kimlik bilgilerini kolayca okuyabilir.
- **Düzeltme**: Electron'un yerel `safeStorage` API'si (`safeStorage.encryptString()`) kullanılmalı veya hassas anahtarlar sistem anahtarlığında (Keychain / Credential Vault) tutulmalıdır.

---

### Sorun 2 (🟠 YÜKSEK): Yerel Çalma Listelerinde (Playlists) Şarkı Metadata Kaybı
- **Konum**: `desktop/src/main/utils/store.ts:13, 83-101`
- **Kod**:
  ```ts
  playlists: Array<{ id: string; name: string; songs: string[]; createdAt: number }>;
  ```
- **Kök Neden**: Çalma listeleri `songs: string[]` olarak sadece şarkı video ID'lerini saklamaktadır. Şarkının adı (`title`), sanatçısı (`artist`), süresi (`duration`) veya albüm kapağı (`thumbnail`) kaydedilmemektedir.
- **Etki**:
  - Kullanıcı özel bir liste oluşturup şarkı eklediğinde, listeyi görüntülemek için her açılışta YouTube'dan her şarkı için ayrı ayrı API çağrısı yapılması gerekir.
  - Ağ bağlantısı olmadığında veya şarkı YouTube'dan silindiğinde listenin içeriği tamamen boş ve başlıksız kalır.
- **Düzeltme**: `songs` dizisi sade string ID yerine nesne modeli (`Song[]`) olarak saklanmalıdır.

---

### Sorun 3 (🟠 YÜKSEK): Senkron Disk Blokajı (Synchronous Disk I/O)
- **Konum**: `desktop/src/main/utils/store.ts:52-58`
- **Kök Neden**: `electron-store` varsayılan olarak `fs.writeFileSync` ile çalışır. `app.ts` içinde her şarkı geçişinde, her ses değişiminde ve her `saveQueue()` çağrısında Electron'un ana süreç iş parçacığı (Main Thread) bloke edilir.
- **Etki**: Zayıf depolama aygıtlarında (HDD veya meşgul SSD) ses oynatılırken mikroskobik takılmalara (audio stutter) ve arayüzde donmalara yol açabilir.
- **Düzeltme**: Sık yazılan veriler (özellikle `queue` ve `queueIndex`) için `debounce` (örn: 1000ms gecikmeli toplu yazım) uygulanmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `safeStorage` ile hassas veriler şifrelenmelidir.
2. `playlists` veri modeli şarkı metadatalarını da içerecek şekilde genişletilmelidir.
3. Disk yazma işlemlerine `debounce` eklenerek ana süreç iş parçacığı rahatlatılmalıdır.
