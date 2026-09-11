# 📄 Dosya Denetimi: `desktop/src/main/main.ts`

> **Dosya Yolu**: `desktop/src/main/main.ts`  
> **Kod Hacmi**: 554 Satır  
> **Rolü**: Electron Ana Süreç Giriş Noktası (App Lifecycle, BrowserWindow, Global Menü, IPC Dispatcher)

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`main.ts`, uygulamanın işletim sistemi tarafından ilk başlatılan giriş noktasıdır. Görevleri şunlardır:
1. Portable / Kurulum modunu tespit edip `userData` yolunu belirlemek.
2. `SingleInstanceLock` ile tek örnek çalışmasını denetlemek.
3. Ana pencereyi (`mainWindow`) oluşturmak ve konumunu geri yüklemek.
4. Alt servisleri (`StreamResolver`, `MusicAuth`, `YouTubeAPI`, `DiscordRPC`) ayağa kaldırmak.
5. Renderer'dan gelen 30'dan fazla IPC çağrısını dinleyip yönlendirmek.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1: Single Instance Lock Yarış Koşulu ve Kapanma Gecikmesi
- **Konum**: `desktop/src/main/main.ts:483-489`
- **Kod**:
  ```ts
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.whenReady().then(() => app.quit());
  }
  app.whenReady().then(async () => {
    if (!gotLock) return;
    // servisleri başlat...
  });
  ```
- **Kök Neden**: Kilit alınamadığında `app.quit()` doğrudan çağrılmayıp `app.whenReady()` içine sokulmuştur. Bu durum, ikinci açılan instance'ın arka planda sistem kaynaklarını (bellek, dosya tanımlayıcıları) gereksiz yere yüklemesine ve yanıt vermeyen bir hayalet süreç olarak takılı kalmasına neden olabilir.
- **Düzeltme**:
  ```ts
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.exit(0);
  }
  ```

---

### Sorun 2: `before-quit` Olayında Zorunlu `process.exit(0)` Veri Bozulması Riski
- **Konum**: `desktop/src/main/main.ts:534-541`
- **Kod**:
  ```ts
  app.on('before-quit', () => {
    try { streamResolver?.destroy(); } catch {}
    try { discordRPC?.disconnect(); } catch {}
    for (const win of BrowserWindow.getAllWindows()) {
      try { win.destroy(); } catch {}
    }
    setTimeout(() => process.exit(0), 500);
  });
  ```
- **Kök Neden**: 500 milisaniyelik zorunlu bir `process.exit(0)` zamanlayıcısı kurulmuştur. Uygulama kapanırken `electron-store` veya SQLite/LevelDB (Chrome cookies) arka planda diske yazma işlemi yapıyorsa, sürecin aniden öldürülmesi JSON veya veritabanı dosyalarında veri bozulmasına (`corrupted store`) yol açar.
- **Düzeltme**: Pencereler usulüne uygun kapatılmalı (`win.close()`), asenkron temizlikler `Promise.allSettled` ile beklenmeli ve Node.js event loop'unun doğal olarak boşalarak uygulamanın kapanması sağlanmalıdır.

---

### Sorun 3: Harici Monitör Çıkarıldığında Ekran Dışı Pencere Başlatma (Invisible Window)
- **Konum**: `desktop/src/main/main.ts:66-71`
- **Kod**:
  ```ts
  const saved = storeManager?.getWindowBounds();
  const bounds = (saved && saved.width >= 800 && saved.height >= 500)
    ? { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
    : { width: 1280, height: 820 };
  ```
- **Kök Neden**: `saved.x` ve `saved.y` koordinatları, kullanıcının daha önce bağladığı ikinci bir monitöre ait olabilir. Kullanıcı monitörü çıkardığında, Electron pencereyi o fiziksel olmayan koordinatlarda (`x: 2560`) oluşturur. Uygulama görev çubuğunda açık görünür fakat ekranda hiçbir pencere belirmez.
- **Düzeltme**: `electron.screen.getAllDisplays()` kullanılarak kaydedilen koordinatların mevcut ekran sınırları içinde olup olmadığı doğrulanmalıdır:
  ```ts
  import { screen } from 'electron';
  function isVisibleOnAnyDisplay(bounds: { x: number; y: number; width: number; height: number }): boolean {
    return screen.getAllDisplays().some(display => {
      const db = display.bounds;
      return (
        bounds.x >= db.x &&
        bounds.y >= db.y &&
        bounds.x + bounds.width <= db.x + db.width &&
        bounds.y + bounds.height <= db.y + db.height
      );
    });
  }
  ```

---

### Sorun 4: `player:update` Dinleyicisinin İlk Oynatmaya Kadar Kaydedilmemesi
- **Konum**: `desktop/src/main/main.ts:245-252`
- **Kod**:
  ```ts
  ipcMain.handle('yt:player', async (_, videoId: string) => {
    // ...
    if (!resolverListenerSet) {
      resolverListenerSet = true;
      streamResolver.onUpdate((u) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('player:update', u);
        }
      });
    }
  ```
- **Kök Neden**: `streamResolver.onUpdate` dinleyicisi `setupIPC()` yerine `yt:player` çağrısının içine gömülmüştür. Eğer kullanıcı uygulamayı başlattıktan sonra klavye kısayoluyla, restore edilen kuyruktan veya bildirimden oynatma komutu verirse veya `mainWindow` yeniden yüklenirse (Ctrl+R / reload), bu köprü senkronizasyonunu kaybeder.
- **Düzeltme**: Dinleyici `setupIPC()` fonksiyonunda bir defaya mahsus tanımlanmalı ve pencere yenilendiğinde hedef `webContents` dinamik olarak referans alınmalıdır.

---

### Sorun 5: IPC Parametrelerinde Tip ve Değer Doğrulama Eksikliği
- **Konum**: `desktop/src/main/main.ts:266-273`
- **Kod**:
  ```ts
  ipcMain.handle('player:seek', async (_, seconds: number) => {
    await streamResolver.seek(seconds);
    return true;
  });
  ipcMain.handle('player:setVolume', async (_, vol: number) => {
    await streamResolver.setVolume(vol);
    return true;
  });
  ```
- **Kök Neden**: `seconds` ve `vol` değerleri sınanmamaktadır. `seconds` değeri `NaN`, negatif veya sonsuz gelirse stream resolver içindeki DOM scripti hata üretir. `vol` değeri 0-100 veya 0-1 aralığı dışına taşarsa YouTube oynatıcı ses seviyesi kilitlenebilir.
- **Düzeltme**:
  ```ts
  const clampedVol = Math.max(0, Math.min(100, Number(vol) || 0));
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  ```

---

### Sorun 6: Geliştirici Araçları Kısayolu Engellemesinin macOS'ta İşlememesi
- **Konum**: `desktop/src/main/main.ts:137-143`
- **Kod**:
  ```ts
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
      event.preventDefault();
    }
  });
  ```
- **Kök Neden**: Yalnızca Windows kombinasyonları (`F12` ve `Ctrl+Shift+I`) engellenmiştir. macOS ortamında geliştirici araçları `Cmd+Option+I` ile açılır ve bu kısayol engellenmemiştir.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `SingleInstanceLock` mekanizmasında `app.exit(0)` kullanılarak gereksiz süreçler hemen sonlandırılmalıdır.
2. `before-quit` içindeki agresif `setTimeout(process.exit, 500)` kaldırılmalıdır.
3. `screen.getAllDisplays()` ile çoklu monitör pencere konumu doğrulaması eklenmelidir.
4. IPC dinleyicileri uygulama açılışında `setupIPC()` altında merkezi ve güvenli biçimde bağlanmalıdır.
