# 📄 Dosya Denetimi: `desktop/src/main/providers/` (Sahte ve Ölü Sağlayıcılar)

> **Dizin Yolu**: `desktop/src/main/providers/`  
> **Dosyalar**: `auth-provider.ts`, `lyrics-provider.ts`, `volume-ratio.ts`  
> **Kod Hacmi**: ~45 Satır (3 Dosya)  
> **Rolü**: Harici eklenti ve özellik sağlayıcı adaptörleri

---

## 🔍 1. Genel İnceleme ve Dosya Bazlı İnceleme

Bu klasör, YTMDesktop2 projesinden uyarlanmış üç küçük sağlayıcı sınıfı barındırmaktadır:
1. `auth-provider.ts`: Harici üçüncü taraf istemciler (Companion app vb.) için token ve client yönetimi.
2. `lyrics-provider.ts`: Şarkı sözü getirme açma/kapatma durumu.
3. `volume-ratio.ts`: Ses normalizasyonu (loudness equalization).

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): `volume-ratio.ts` Tamamen Sahte (Placebo) Bir Özelliktir
- **Konum**: `desktop/src/main/providers/volume-ratio.ts:8-12`
- **Kod**:
  ```ts
  apply(win: Electron.BrowserWindow, enabled:boolean){
    const script = enabled ? `try{window.__aqualityGain=1.2}catch{}` : `try{window.__aqualityGain=1}catch{}`;
    win.webContents.executeJavaScript(script).catch(()=>{});
  }
  ```
- **Kök Neden**:
  1. `volumeRatioProvider.apply()` fonksiyonu tüm projede **hiçbir yerden çağrılmamaktadır**.
  2. Çağrılsa bile, YouTube Music'in gizli penceresinde `window.__aqualityGain` değişkenini dinleyen, Web Audio API `GainNode` oluşturan veya sesi yükselten hiçbir kod bulunmamaktadır.
- **Etki**: Kullanıcı arayüzde "Ses Normalizasyonu" ayarını açıp kapattığında hiçbir şey değişmez. Bu tamamen işlevsiz ve kullanıcıyı yanıltan bir "placebo" koddur.
- **Düzeltme**: `stream-resolver.ts` içine Web Audio `AudioContext` ve `createGain()` enjeksiyonu yapılmalı veya bu özellik arayüzden ve koddan kaldırılmalıdır.

---

### Sorun 2 (🟠 YÜKSEK): `lyrics-provider.ts` Ayarının `yt:lyrics` Tarafından Yok Sayılması
- **Konum**: `desktop/src/main/providers/lyrics-provider.ts:7-10` ve `desktop/src/main/main.ts:314`
- **Kod**:
  - `lyrics-provider.ts`:
    ```ts
    async fetch(videoId:string, ytApi:any){
      if(!this.isEnabled()) return null;
      try{ return await ytApi.getLyrics(videoId);}catch{ return null; }
    }
    ```
  - `main.ts`:
    ```ts
    ipcMain.handle('yt:lyrics', async (_, videoId: string) => {
      try { return await youtubeAPI.getLyrics(videoId); } catch { return null; }
    });
    ```
- **Kök Neden**: `main.ts` içindeki `yt:lyrics` IPC işleyicisi doğrudan `youtubeAPI.getLyrics()` çağrısı yapmaktadır. `lyricsProvider.isEnabled()` kontrolü yapılmamakta, `lyricsProvider.fetch()` ise hiçbir yerde çağrılmamaktadır.
- **Etki**: Kullanıcı Ayarlar'dan şarkı sözlerini kapatsa bile sözler çekilmeye devam eder; ayar işlevsiz kalır.
- **Düzeltme**: `yt:lyrics` işleyicisi `lyricsProvider.isEnabled()` durumuna bağlanmalıdır.

---

### Sorun 3 (🟡 ORTA): Parçalanmış ve Uyumsuz Store İsimleri
- `main.ts` ve `store.ts` -> `aquality-music-data` store'unu kullanır.
- `lyrics-provider.ts` ve `volume-ratio.ts` -> `aquality-music-settings` store'unu kullanır.
- `auth-provider.ts` -> `aquality-music-auth-clients` store'unu kullanır.
- `music-auth.ts` -> `aquality-music-auth` store'unu kullanır.
- **Kök Neden**: 4 farklı JSON dosyasına bölünmüş gereksiz bir disk parçalanması mevcuttur. Ayarlar tek bir merkezi `StoreManager` altında toplanmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `volume-ratio.ts` ya gerçek bir Web Audio Gain motoruna bağlanmalı ya da tamamen temizlenmelidir.
2. `lyricsProvider` ana `yt:lyrics` IPC akışına entegre edilmelidir.
3. 4 farklı dosya store'u tek bir merkezi yapı altında birleştirilmelidir.
