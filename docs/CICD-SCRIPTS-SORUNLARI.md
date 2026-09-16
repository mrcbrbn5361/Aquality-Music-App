# CI/CD ve Scripts - Kapsamlı Sorun Analizi

> **Son Güncelleme:** 2026-09-16  
> **Platform:** GitHub Actions, Node.js Scripts, PowerShell, Discord Bot  
> **Toplam Sorun:** 33  
> **Önem Dereceleri:** Kritik: 5 | Yüksek: 8 | Orta: 14 | Düşük: 6

---

## 🔴 KRİTİK - Güvenlik

### S-001: Release Asset'leri Her Push'ta Yükleniyor
| | |
|---|---|
| **Dosya** | `.github/workflows/build-windows.yml` |
| **Satır** | 54 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** Koşul `github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'` — main/master'e yapılan her push'ta release asset'leri yükleniyor. Tag olmayan commit'lerde release oluşturulup değiştirilebilir.

**Çözüm:** Tag tabanlı tetikleme:
```yaml
if: startsWith(github.ref, 'refs/tags/v')
```

---

### S-002: macOS Workflow'da Güvenlik Header'ları Eksik + Kirli Symlink
| | |
|---|---|
| **Dosya** | `.github/workflows/build-mac.yml` |
| **Satır** | 31-40 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `brew install p7zip` + manuel symlink + mkdir + cp bloğu kırılgan. `which 7za` ve `which 7z` ikisi de başarısız olursa `$P7ZA` boş olur ve `ln -sf "" ./7za` kırık bir symlink oluşturur. Hata yönetimi yok.

**Ek Sorun:** Workspace kökünde proje dışı dosya oluşturuyor.

---

### S-003: discord-bot Token Çevre Değişkeninde
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/index.js` |
| **Satır** | 15 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `process.env.DISCORD_TOKEN` ile token yükleniyor. `.env` dosyası repo'ya commit edilirse (yaygın hata) token açığa çıkar. `.env.example` ve `.gitignore` kontrolü yok.

---

### S-004: Bot API'sinde Kimlik Doğrulama Yok
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/index.js` |
| **Satır** | 37 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `http://127.0.0.1:9863/api/v1/state` adresine hardkodlanmış localhost URL'si ile bağlanıyor. Bu API noktasında kimlik doğrulama yok — localhost'taki herhangi biri durumu sahteleyebilir.

---

### S-005: Git Hook'u Zorla Yazma
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs` |
| **Satır** | 446-457 |
| **Önem** | 🔴 KRİTİK |
| **Durum** | Açık |

**Açıklama:** `ensureGitHook` her script çalıştırıldığında `.git/hooks/post-commit` dosyasını sessizce overwritten ediyor. Bu müdahalesiz davranış — script kullanıcı onayı olmadan git hook'larını değiştirmemeli.

**Ek Sorun:** Hook göreceli yol kullanıyor (`node scripts/update-docs.cjs`) — alt dizinlerden çalıştırılursa başarısız olur.

---

## 🟠 YÜKSEK - CI/CD Hataları

### S-006: gh release upload ile Sessiz Başarısızlık
| | |
|---|---|
| **Dosya** | `.github/workflows/build-windows.yml:58`, `build-mac.yml:62` |
| **Satır** | 58, 62 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `gh release upload ... || true` başarısızlıkları sessizce bastırıyor. Yükleme başarısız olursa workflow yine de başarılı olur.

---

### S-007: Auto-Update Dosyaları Release'de Eksik
| | |
|---|---|
| **Dosya** | `.github/workflows/build-windows.yml:58`, `build-mac.yml:62` |
| **Satır** | 58, 62 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Yükleme yalnızca `.exe` ve `.dmg` dosyalarını ekliyor — `.blockmap`, `latest.yml`, `latest-mac.yml` dosyaları eksik. Bu auto-update'i kırar.

---

### S-008: npm install Yerine npm ci Kullanılmaması
| | |
|---|---|
| **Dosya** | `.github/workflows/build-windows.yml`, `build-mac.yml` |
| **Satır** | - |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** CI'da `npm install` kullanılıyor — tekrarlanabilir değil. `npm ci` kullanılmalı.

---

### S-009: macOS Workflow'da PR Tetikleyicisi Eksik
| | |
|---|---|
| **Dosya** | `.github/workflows/build-mac.yml` |
| **Satır** | - |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Windows workflow'unda `pull_request` tetikleyicisi var ama macOS'de yok — PR'lar macOS'ta doğrulanmıyor.

---

### S-010: cardRenderer.js'de Kırık Rounded Rect
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/cardRenderer.js` |
| **Satır** | 15 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `ctx.lineTo(x + radius.tl)` `y` parametresi eksik — `(x + radius.tl, undefined)` noktasına çizgi çiziyor. Yuvarlak dikdörtgen yolu hatalı olacak.

**Çözüm:**
```javascript
ctx.lineTo(x + radius.tl, y);  // y eklendi
```

---

### S-011: Sürüm Tutarsızlığı - README.md
| | |
|---|---|
| **Dosya** | `README.md` |
| **Satır** | 1, 10 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Başlık `v1.0.0` diyor, badge `Version-1.0.0` gösteriyor, ama gerçek sürüm `v1.0.1`.

---

### S-012: Sürüm Tutarsızlığı - TUM-GUNCELLEMELER
| | |
|---|---|
| **Dosya** | `TUM-GUNCELLEMELER-VE-SURUM-NOTLARI.md` |
| **Satır** | 3, 232 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** Başlık `v1.0.0-stable` diyor ama bölüm 9 başlığı `v1.0.1` yazıyor.

---

### S-013: PROJE-DURUM.md ile Script Tutarsızlığı
| | |
|---|---|
| **Dosya** | `PROJE-DURUM.md` |
| **Satır** | 18 |
| **Önem** | 🟠 YÜKSEK |
| **Durum** | Açık |

**Açıklama:** `Toplam Takip Edilen Sorun: 24` diyor ama `update-docs.cjs` 22 sorun tanımlıyor.

---

## 🟡 ORTA - Script Hataları

### S-014: update-docs.cjs Hata İletişimi Kırpılmış
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs` |
| **Satır** | 71-93 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** TypeScript kontrol hata mesajları 100 karaktere kırpılmış — faydalı tanı bilgileri kaybediliyor.

---

### S-015: update-docs.cjs LOC Sayımında Yanlış Diziler
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs` |
| **Satır** | 100-116 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `countLinesInDir` yalnızca `dist` ve `release`'ı atlıyor — `.git`, `build`, `.expo`, `.cache` dizinlerini atlamıyor. LOC metrikleri şişirilebilir.

---

### S-016: JSON Dosyaları Kod Olarak Sayılıyor
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs` |
| **Satır** | 121 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `mobileLoc` `.json` dosyalarını (`package.json`, `app.json`) kod olarak sayıyor — kaynak kodu değil.

---

### S-017: Atomik Olmayan Dosya Yazma
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs` |
| **Satır** | 408 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `fs.writeFileSync(statusFilePath, md, 'utf8')` dosyayı tamamen overwrite ediyor. Script kesilirse dosya bozulabilir. Atomik yazma (temp dosyası, sonra rename) kullanılmalı.

---

### S-018: Git Status Parsing Kırılgan
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs` |
| **Satır** | 31-33 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `git status --porcelain` çıktısının ayrıştırılması tam olarak 2+ boşlukla ayrılmış parça bekliyor. Yeniden adlandırılmış dosyalar (ör. `R  old -> new`) `parts.slice(1).join(' ')` mantığını bozar.

---

### S-019: Boş catch Blokları - Scripts
| | |
|---|---|
| **Dosya** | `scripts/update-docs.cjs:112,455` |
| **Satır** | 112, 455 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Dosya okuma ve hook yazma hataları sessizce yutuluyor.

---

### S-020: PowerShell Scriptinde GDI Handle Sızıntısı
| | |
|---|---|
| **Dosya** | `scripts/make-installer-bmps.ps1` |
| **Satır** | 22-36, 43-92 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Bitmap nesneleri hata yoluyla temizlenmeden sızıyor. Adımlar arasında hata olursa GDI handle'ları serbest kalmaz. `try/catch/finally` ile `Dispose()` çağrılmalı.

---

### S-021: PowerShell Scriptinde Hata Yönetimi Yok
| | |
|---|---|
| **Dosya** | `scripts/make-installer-bmps.ps1` |
| **Satır** | - |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Script boyunca `-ErrorAction Stop` veya `try/catch` yok. Tek bir başarısızlık diskte kısmi bitmap dosyaları bırakır.

---

### S-022: Discord Bot - Boş catch Blokları
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/index.js` |
| **Satır** | 43, 82 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** Ağ hataları ve fetch hataları sessizce yutuluyor.

---

### S-023: Discord Bot - rate Limit Riski
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/index.js` |
| **Satır** | 135 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `message.guild.members.fetch({ force: true })` önbelleği atlıyor ve API çağrısı yapıyor. Çok sayıda kullanıcı tetiklerse Discord rate limit'ine çarpılabilir.

---

### S-024: Discord Bot - platformName Hardcode
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/index.js` |
| **Satır** | 242 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `platformName: 'Aquality Music'` hardcode edilmiş ama satır 171'de hesaplanan `platformName` değişkeni `'Spotify'` olabilir — tutarsız.

---

### S-025: Discord Bot - Lyrics Butonu Yanıltıcı
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/index.js` |
| **Satır** | 274-279 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `btn_lyrics` etkileşimi statik mesaj döndürüyor, gerçek sözler yok — yanıltıcı UX.

---

### S-026: TUM-GUNCELLEMELER - Gerçekleştirlmemiş Komutlar
| | |
|---|---|
| **Dosya** | `TUM-GUNCELLEMELER-VE-SURUM-NOTLARI.md` |
| **Satır** | 172 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** `.spo`, `.har`, `.harmonic` komutları listeleniyor ama bot kodunda (index.js:99) yalnızca `.aquamusic` ve `.a` ele alınıyor — bu komutlar gerçekleştirilmedi.

---

### S-027: TUM-GUNCELLEMELER - Yerel Olarak Tutulur İddiası
| | |
|---|---|
| **Dosya** | `TUM-GUNCELLEMELER-VE-SURUM-NOTLARI.md` |
| **Satır** | 6 |
| **Önem** | 🟡 ORTA |
| **Durum** | Açık |

**Açıklama:** "GitHub üzerinde yayınlanmaz, yerel olarak tutulur" deniyor ama dosya repo'ya commit edilmiş — çelişki.

---

## 🔵 DÜŞÜK

### S-028: Windows Workflow'da Gereksiz 7zip-bin Kurulumu
| | |
|---|---|
| **Dosya** | `.github/workflows/build-windows.yml` |
| **Satır** | 31 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `npm install 7zip-bin --no-save` — package.json'a kaydedilmeyen bağımlılık kuruluyor. Windows'ta electron-builder 7zip'i zaten paketliyor, gereksiz adım.

---

### S-029: double-build Riski
| | |
|---|---|
| **Dosya** | `.github/workflows/build-windows.yml` |
| **Satır** | 37, 40 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `npm --workspace=desktop run build` ardından `npm run build:win` çalışıyor — electron-builder muhtemelen Vite build'ini de içeriyor, çift build olabilir.

---

### S-030: Discord Bot - unhandledRejection Yok
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/index.js` |
| **Satır** | - |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `process.on('unhandledRejection')` handler'ı yok — yakalanmamış promise reddetmeleri botu sessizce çökertebilir.

---

### S-031: Discord Bot - coverUrl Yükleme Zaman Aşımı Yok
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/cardRenderer.js` |
| **Satır** | 79 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `loadImage(coverUrl)` harici URL'den görsel yüklüyor — zaman aşımı yok. URL yavaşsa veya takılırsa kart render'ı süresiz askıda kalır.

---

### S-032: Discord Bot - Font Platform Bağımlılığı
| | |
|---|---|
| **Dosya** | `scripts/discord-bot/cardRenderer.js` |
| **Satır** | 91 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** `'bold 40px Segoe UI, Arial, sans-serif'` — `@napi-rs/canvas` Linux'ta `Segoe UI`'ya sahip olmayabilir. Font fallback çalışıyor ama görsel çıktı platforma bağlı.

---

### S-033: README - Eksik Proje Yapısı
| | |
|---|---|
| **Dosya** | `README.md` |
| **Satır** | 56-74 |
| **Önem** | 🔵 DÜŞÜK |
| **Durum** | Açık |

**Açıklama:** Proje yapısı listesi `website/gizlilik.html`, `website/kosullar.html`, `website/bot.html`, `website/404.html` dosyalarını içermiyor — güncel değil.

---

## Özet Tablosu

| # | Sorun | Önem | Dosya |
|---|-------|------|-------|
| S-001 | Release her push'ta | 🔴 KRİTİK | build-windows.yml:54 |
| S-002 | macOS symlink hack | 🔴 KRİTİK | build-mac.yml:31-40 |
| S-003 | Token çevre değişkeni | 🔴 KRİTİK | discord-bot/index.js:15 |
| S-004 | Bot API auth yok | 🔴 KRİTİK | discord-bot/index.js:37 |
| S-005 | Git hook zorla yazma | 🔴 KRİTİK | update-docs.cjs:446-457 |
| S-006 | Sessiz başarısızlık | 🟠 YÜKSEK | her iki workflow |
| S-007 | Auto-update dosya eksik | 🟠 YÜKSEK | her iki workflow |
| S-008 | npm ci yok | 🟠 YÜKSEK | her iki workflow |
| S-009 | macOS PR tetikleme eksik | 🟠 YÜKSEK | build-mac.yml |
| S-010 | Kırık rounded rect | 🟠 YÜKSEK | cardRenderer.js:15 |
| S-011 | README sürüm eski | 🟠 YÜKSEK | README.md:1 |
| S-012 | TUM-GUNCELEMELER tutarsız | 🟠 YÜKSEK | TUM-GUNCELLEMELER:3 |
| S-013 | PROJE-DURUM tutarsız | 🟠 YÜKSEK | PROJE-DURUM.md:18 |
| S-014 | Hata mesajları kırpılmış | 🟡 ORTA | update-docs.cjs:71-93 |
| S-015 | LOC sayımında yanlış diziler | 🟡 ORTA | update-docs.cjs:100-116 |
| S-016 | JSON kod sayılıyor | 🟡 ORTA | update-docs.cjs:121 |
| S-017 | Atomik yazma yok | 🟡 ORTA | update-docs.cjs:408 |
| S-018 | Git status parsing | 🟡 ORTA | update-docs.cjs:31-33 |
| S-019 | Boş catch blokları | 🟡 ORTA | update-docs.cjs:112,455 |
| S-020 | GDI handle sızıntısı | 🟡 ORTA | make-installer-bmps.ps1 |
| S-021 | PowerShell hata yönetimi | 🟡 ORTA | make-installer-bmps.ps1 |
| S-022 | Bot boş catch | 🟡 ORTA | discord-bot/index.js:43 |
| S-023 | Bot rate limit riski | 🟡 ORTA | discord-bot/index.js:135 |
| S-024 | Bot platformName hardcode | 🟡 ORTA | discord-bot/index.js:242 |
| S-025 | Bot lyrics yanıltıcı | 🟡 ORTA | discord-bot/index.js:274 |
| S-026 | Gerçekleştirilmemiş komutlar | 🟡 ORTA | TUM-GUNCELLEMELER:172 |
| S-027 | Yerel tutma çelişkisi | 🟡 ORTA | TUM-GUNCELLEMELER:6 |
| S-028 | Gereksiz 7zip-bin | 🔵 DÜŞÜK | build-windows.yml:31 |
| S-029 | Çift build riski | 🔵 DÜŞÜK | build-windows.yml:37 |
| S-030 | unhandledRejection yok | 🔵 DÜŞÜK | discord-bot/index.js |
| S-031 | coverUrl zaman aşımı yok | 🔵 DÜŞÜK | cardRenderer.js:79 |
| S-032 | Font platform bağımlılığı | 🔵 DÜŞÜK | cardRenderer.js:91 |
| S-033 | Eksik proje yapısı | 🔵 DÜŞÜK | README.md:56-74 |
