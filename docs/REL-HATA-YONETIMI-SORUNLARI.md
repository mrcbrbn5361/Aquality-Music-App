# Hata Yönetimi ve Kararlılık Sorunları (REL)

> **Toplam:** 8 sorun | **Kritik:** 1 | **Yüksek:** 3 | **Orta:** 3 | **Düşük:** 1

---

## REL-001: Non-Null Assertion mainWindow! (KRİTİK)

| | |
|---|---|
| **Önem** | 🔴 KRİTİK |
| **Dosya** | `desktop/src/main/main.ts:235` |
| **Kategori** | Runtime Çökme |

### Sorun
```typescript
// main.ts:235
dialog.showMessageBox(mainWindow!, {
  type: 'info',
  title: 'Aquality Music',
  message: 'Aquality Music v1.0.0',
  // ...
});
```

`mainWindow!` non-null assertion kullanılıyor ama `mainWindow` `closed` event'inde `null` yapılıyor (satır 155). Eğer menü "Hakkında" tıklanırsa ve pencere kapatılmışsa runtime crash.

### Etki
- Uygulama çökebilir
- Unhandled exception

### Çözüm
```typescript
// Null check ekle
click: () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Aquality Music',
    message: `Aquality Music v${app.getVersion()}`,
    detail: 'Premium müzik deneyimi.\n\n© 2026 Aquality Music Team. Tüm hakları saklıdır.',
    buttons: ['Tamam']
  });
}
```

---

## REL-002: Bot Stop Handler'da Null Kontrolü Eksik

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/main.ts:309-318` |
| **Kategori** | Null Safety |

### Sorun
```typescript
ipcMain.handle('bot-server:stop-bot', async () => {
  if (discordBotProcess) {
    try {
      discordBotProcess.kill();  // null değil ama .killed kontrolü yok
      discordBotProcess = null;
      discordBotStatus = 'stopped';
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }
  discordBotStatus = 'stopped';
  return { success: true };
});
```

`discordBotProcess.kill()` çağrılıyor ama process zaten ölmüş olabilir (`.killed === true`).

### Etki
- Gereksiz hata logları
- Yanlış success/failure dönüşü

### Çözüm
```typescript
ipcMain.handle('bot-server:stop-bot', async () => {
  if (discordBotProcess && !discordBotProcess.killed) {
    try {
      discordBotProcess.kill();
      discordBotProcess = null;
      discordBotStatus = 'stopped';
      return { success: true };
    } catch (e: any) {
      discordBotProcess = null;
      discordBotStatus = 'stopped';
      return { success: false, error: e?.message || String(e) };
    }
  }
  discordBotProcess = null;
  discordBotStatus = 'stopped';
  return { success: true };
});
```

---

## REL-003: importFromChromeLegacy CDP Hata Yönetimi

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/auth/music-auth.ts:410-496` |
| **Kategori** | Hata Mesajı Kalitesi |

### Sorun
```typescript
async importFromChromeLegacy(): Promise<{ success: boolean; cookies: number; error?: string }> {
  let client: any;
  try {
    let lastErr:any=null;
    for (const port of CHROME_DEBUG_PORTS) {
      try { client = await CDP({ host: '127.0.0.1', port }); if(client) break; } catch(e){ lastErr=e; }
    }
    if(!client) throw lastErr;
  } catch (e: any) {
    return { success: false, cookies: 0, error: 'Chrome\'a bağlanılamadı. Chrome\'u kapatıp tekrar "Giriş Yap" düğmesine basın.' };
  }
  // ...
}
```

Hata mesajı kullanıcıya "Chrome'u kapatıp tekrar deneyin" diyor ama CDP'nin neden bağlanamadığını açıklamıyor (port mu kapalı, Chrome mu yok, vs.).

### Etki
- Kullanıcı hatanın kaynağını anlamaz
- Destek ekibi için yetersiz bilgi

### Çözüm
```typescript
catch (e: any) {
  const msg = e?.message || String(e);
  let hint = 'Chrome\'a bağlanılamadı.';
  
  if (msg.includes('ECONNREFUSED')) {
    hint += ' Chrome\'da Developer Tools açmayı deneyin (F12 > Enable remote debugging).';
  } else if (msg.includes('timeout')) {
    hint += ' Bağlantı zaman aşımı — Chrome çok meşgul olabilir.';
  } else {
    hint += ' Hata: ' + msg;
  }
  
  return { success: false, cookies: 0, error: hint };
}
```

---

## REL-004: Adblock Injection Hata Yönetimi

| | |
|---|---|
| **Önem** | 🟠 YÜKSEK |
| **Dosya** | `desktop/src/main/api/stream-resolver.ts:449-456` |
| **Kategori** | Sessiz Hata |

### Sorun
```typescript
this.win.webContents.on('did-start-navigation', () => {
  try { this.win?.webContents.executeJavaScript(ADBLOCK_INJECTION_JS, true).catch(() => {}); } catch {}
});
this.win.webContents.on('dom-ready', () => {
  try { this.win?.webContents.insertCSS(ADHIDE_CSS).catch(() => {}); } catch {}
  try { this.win?.webContents.executeJavaScript(ADBLOCK_INJECTION_JS, true).catch(() => {}); } catch {}
});
```

Tüm hatalar `.catch(() => {})` ile yutuluyor. CSS injection başarısız olursa reklamlar görünebilir ama kullanıcı bilgilendirilmez.

### Etki
- Reklam engelleme sessizce başarısız olabilir
- Debug zorluğu

### Çözüm
```typescript
this.win.webContents.on('dom-ready', () => {
  this.win?.webContents.insertCSS(ADHIDE_CSS).catch((e) => {
    console.warn('[Adblock] CSS injection failed:', e?.message);
  });
  this.win?.webContents.executeJavaScript(ADBLOCK_INJECTION_JS, true).catch((e) => {
    console.warn('[Adblock] JS injection failed:', e?.message);
  });
});
```

---

## REL-005: Bot Token Leak Riski

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/main.ts:324-431` |
| **Kategori** | Güvenlik |

### Sorun
```typescript
// main.ts:377-381
const env = {
  ...process.env,
  DISCORD_TOKEN: token,
  ...extraEnv
};

discordBotProcess = child_process.spawn(cmd, [scriptPath], {
  cwd: botDir,
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// stdout/stderr log'a yazılıyor
discordBotProcess.stdout?.on('data', (data) => {
  const lines = data.toString().split('\n').map((l: string) => l.trim()).filter(Boolean);
  for (const line of lines) {
    discordBotLogs.push(line);  // Log dizisine yazılıyor
    // ...
  }
});
```

Eğer bot token'ı stdout'a yazarsa (hata durumunda), log dizisine düşer ve renderer'a gönderilebilir.

### Etki
- Token log dosyalarına sızabilir
- Renderer'a sızabilir

### Çözüm
```typescript
// Token'ı argüman olarak gönder, env'e değil
const args = [scriptPath, '--token', token];
discordBotProcess = child_process.spawn(cmd, args, {
  cwd: botDir,
  env: { ...process.env, ...extraEnv },  // DISCORD_TOKEN kaldırıldı
  stdio: ['pipe', 'pipe', 'pipe']
});

// Bot tarafında process.argv'dan oku
// index.js: const token = process.argv[process.argv.indexOf('--token') + 1];
```

---

## REL-006: pollTimer Null Kontrolü

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/api/stream-resolver.ts:396-404` |
| **Kategori** | Timer Yönetimi |

### Sorun
```typescript
private startPolling() {
  if (this.pollTimer) return;  // Sadece null kontrolü
  this.pollTimer = setInterval(() => this.pollOnce(), POLL_MS);
}
```

Eğer `pollTimer` zaten set edilmiş ama interval hâlâ çalışıyorsa, yeni bir interval eklenmez (doğru). Ama `stopPolling` çağrılıp hemen ardından `startPolling` çağrılırsa, eski timer temizlenir ve yeni başlar (doğru).

Ancak `stopPolling`'de:
```typescript
private stopPolling() {
  if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
}
```

Bu doğru çalışıyor. Ancak `destroy()` metodu çağrıldığında:
```typescript
destroy(): void {
  this._destroyed = true;
  this.stopPolling();
  this.listeners.clear();
  // ...
}
```

Sonra `pollOnce()` hâlâ çağrılabilirse (timer hâlâ aktifse), `this.win` null olacağı için crash olabilir.

### Çözüm
```typescript
private async pollOnce() {
  const win = this.win;
  if (!win || win.isDestroyed() || this._destroyed) return;  // _destroyed kontrolü ekle
  // ...
}
```

---

## REL-007: migrateDirtyStore Sessiz Hata

| | |
|---|---|
| **Önem** | 🟡 ORTA |
| **Dosya** | `desktop/src/main/auth/music-auth.ts:128-136` |
| **Kategori** | Hata Yönetimi |

### Sorun
```typescript
private migrateDirtyStore(): void {
  try {
    const user = this.store.get('musicUser') as any;
    if (user && (!user.name || user.name.trim().length <= 1 || user.name === 'Y' || user.name === 'YouTube Music' || !sanitizeName(user.name))) {
      console.log('[Auth] Kirli store düzeltildi:', JSON.stringify(user), '-> silindi');
      this.store.set('musicUser', null as any);
    }
  } catch {}  // Sessiz yutuluyor
}
```

Store migration hatası olursa kullanıcı bilgilendirilmez.

### Çözüm
```typescript
private migrateDirtyStore(): void {
  try {
    const user = this.store.get('musicUser') as any;
    if (user && (!user.name || user.name.trim().length <= 1 || user.name === 'Y' || user.name === 'YouTube Music' || !sanitizeName(user.name))) {
      console.log('[Auth] Kirli store düzeltildi:', JSON.stringify(user), '-> silindi');
      this.store.set('musicUser', null as any);
    }
  } catch (e) {
    console.error('[Auth] Store migration failed:', e);
    // Store'u sıfırla
    try {
      this.store.set('musicUser', null as any);
    } catch {}
  }
}
```

---

## REL-008: Connect Promise Resolve Çağrılmazsa

| | |
|---|---|
| **Önem** | 🟢 DÜŞÜK |
| **Dosya** | `desktop/src/main/utils/discord.ts:50-65` |
| **Kategori** | Promise |

### Sorun
```typescript
const connectPromise = new Promise<void>((resolve) => {
  this.client!.on('ready', () => {
    this.isConnected = true;
    resolve();
  });
});

const loginPromise = this.client.login({ clientId: appId });

await Promise.race([Promise.all([connectPromise, loginPromise]), timeoutPromise]);
```

`ready` event'i hiç gelmezse `connectPromise` asılı kalır. Timeout ile resolve edilir ama promise hâlâ memory'de kalır.

### Çözüm
```typescript
const connectPromise = new Promise<void>((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('ready timeout')), 5000);
  this.client!.once('ready', () => {
    clearTimeout(timeout);
    this.isConnected = true;
    resolve();
  });
  this.client!.once('error', (err) => {
    clearTimeout(timeout);
    reject(err);
  });
});
```

---

## Çözüm Özeti

| ID | Çözüm Zorluğu | Süre | Öncelik |
|----|:---:|:---:|:---:|
| REL-001 | Kolay | 10dk | Yüksek |
| REL-002 | Kolay | 10dk | Yüksek |
| REL-003 | Kolay | 30dk | Yüksek |
| REL-004 | Kolay | 10dk | Yüksek |
| REL-005 | Orta | 1saat | Orta |
| REL-006 | Kolay | 5dk | Orta |
| REL-007 | Kolay | 10dk | Orta |
| REL-008 | Kolay | 15dk | Düşük |
