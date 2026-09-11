# 📄 Dosya Denetimi: `desktop/src/main/preload.ts`

> **Dosya Yolu**: `desktop/src/main/preload.ts`  
> **Kod Hacmi**: 108 Satır  
> **Rolü**: Renderer ile Main Süreci Arasındaki Context Bridge Köprüsü

---

## 🔍 1. Genel İnceleme ve Güvenlik Modeli

`preload.ts`, Electron'un `contextIsolation: true` ve `nodeIntegration: false` güvenlik standartlarına uygun olarak arayüze (`window.api`) sadece belirli fonksiyonları açmakla yükümlüdür.

Açılan ana API modülleri:
- `api.window`: Pencere kontrol fonksiyonları (minimize, maximize, close, isMaximized)
- `api.youtube`: InnerTube arama ve içerik çekme API'leri
- `api.store`: Kalıcı veri get/set
- `api.auth`: Google & YouTube Music oturum yönetimi
- `api.discord`: Discord RPC ve OAuth
- `api.player`: Gizli oynatıcı kontrol metodları ve durum dinleyicisi

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1: `autoUpdater` Metodlarının Preload'da Eksik Olması (Erişilemez Özellik)
- **Konum**: `desktop/src/main/preload.ts:1-104` ve `desktop/src/main/main.ts:463-480`
- **Açıklama**: `main.ts` içinde `auto:checkForUpdates` ve `auto:getUpdateStatus` IPC işleyicileri tanımlanmış olmasına rağmen, `preload.ts` içinde bu çağrıları renderer'a aktaracak hiçbir `api.autoUpdate` metodu tanımlanmamıştır.
- **Etki**: Kullanıcı arayüzü (Ayarlar sekmesi) güncelleme kontrolü yapamaz veya güncelleme durumunu sorgulayamaz.
- **Düzeltme**: `preload.ts` içine şu blok eklenmelidir:
  ```ts
  autoUpdate: {
    checkForUpdates: () => ipcRenderer.invoke('auto:checkForUpdates'),
    getUpdateStatus: () => ipcRenderer.invoke('auto:getUpdateStatus')
  }
  ```

---

### Sorun 2: `auth:deeplink` Event Dinleyicisinin Preload'da Bulunmaması
- **Konum**: `desktop/src/main/main.ts:545` ve `desktop/src/main/preload.ts`
- **Açıklama**: `main.ts` içinde gelen deeplink protokol istekleri (`aquality-music://...`) şu şekilde renderer'a iletilmektedir:
  ```ts
  mainWindow.webContents.send('auth:deeplink', deeplink);
  ```
  Ancak `preload.ts` içinde bu olayı dinleyecek bir köprü (`api.auth.onDeeplink`) tanımlanmamıştır.
- **Etki**: Tarayıcıdan veya harici OAuth yönlendirmesinden gelen deeplink'ler arayüze ulaşamaz ve sessizce kaybolur.
- **Düzeltme**:
  ```ts
  onDeeplink: (callback: (url: string) => void) => {
    const handler = (_: unknown, url: string) => callback(url);
    ipcRenderer.on('auth:deeplink', handler);
    return () => ipcRenderer.removeListener('auth:deeplink', handler);
  }
  ```

---

### Sorun 3: `logoutMusicCompletely` IPC Çağrısının Dışa Aktarılmaması
- **Konum**: `desktop/src/main/main.ts:400` ve `desktop/src/main/preload.ts:49`
- **Açıklama**: `main.ts` içinde hem `auth:logoutMusic` hem de oturumu ve tüm cookie'leri sıfırlayan `auth:logoutMusicCompletely` tanımlanmıştır. Ancak `preload.ts` sadece `logoutMusic` çağrısını bağlamıştır.
- **Etki**: Kullanıcı hesap değiştirmek veya çerezleri tamamen temizlemek istediğinde tam çıkış yapamaz.

---

### Sorun 4: Tip Güvenliği Zafiyeti (`any` Kullanımı)
- **Konum**: `desktop/src/main/preload.ts:82, 97-101`
- **Açıklama**:
  ```ts
  create: (d: any) => ipcRenderer.invoke('auth:createClient', d),
  onUpdate: (cb: (u: any) => void) => {
    const h = (_: unknown, u: any) => cb(u);
    ipcRenderer.on('player:update', h);
    return () => ipcRenderer.removeListener('player:update', h);
  }
  ```
  `d: any` ve `u: any` kullanımı, TypeScript'in derleme zamanında tip uyuşmazlıklarını yakalamasını engeller. Renderer tarafında yanlış bir veri alanı beklendiğinde runtime hatası (`undefined reading property`) oluşur.
- **Düzeltme**: Güçlü tiplendirilmiş `PlaybackUpdate` ve `ClientInput` arayüzleri preload üzerinden dışa aktarılmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Preload içine `autoUpdate` nesnesi eklenmelidir.
2. `auth.onDeeplink` dinleyicisi eklenerek protokol yönlendirmeleri arayüze iletilmelidir.
3. `auth.logoutMusicCompletely` eklenmelidir.
4. Tüm `any` tipleri katı arayüzlerle (interface) değiştirilmelidir.
