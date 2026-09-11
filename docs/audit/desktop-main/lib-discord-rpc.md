# 📄 Dosya Denetimi: `desktop/src/main/lib/discord-rpc/` (Ölü Kod Analizi)

> **Dizin Yolu**: `desktop/src/main/lib/discord-rpc/`  
> **Dosyalar**: `client.ts`, `discord-rpc.ts`, `embedFromTrack.ts`, `ipc-path.ts`, `ipc.ts`  
> **Kod Hacmi**: ~650 Satır (5 Dosya)  
> **Rolü**: [KULLANILMAYAN / DEAD CODE] Özel Discord IPC İstemcisi

---

## 🔍 1. Genel İnceleme ve Tespit

`desktop/src/main/lib/discord-rpc/` dizini altında Windows Named Pipe (`\\.\pipe\discord-ipc-0`) ve Unix Domain Socket üzerinden Discord masaüstü istemcisiyle doğrudan konuşmak için geliştirilmiş 5 adet TypeScript kaynak dosyası bulunmaktadır:

1. `client.ts`: Discord RPC bağlantı ve olay yöneticisi
2. `discord-rpc.ts`: RPC komut formatları ve veri modelleri
3. `embedFromTrack.ts`: Şarkı bilgisini Discord aktivitesine dönüştüren formatlayıcı
4. `ipc-path.ts`: İşletim sistemine göre IPC soket yolunu bulan yardımcı fonksiyon
5. `ipc.ts`: Node.js `net.Socket` üzerinde çalışan düşük seviyeli paket kodlayıcı/çözücü

---

## ⚠️ 2. Mimari Çelişki ve Ölü Kod Kanıtı

Projede Discord RPC bağlantısı gerçekte şu şekilde kurulmaktadır:
- `desktop/src/main/utils/discord.ts:1`:
  ```ts
  import { Client } from 'discord-rpc'; // <-- npm'deki harici paket kullanılıyor!
  ```
- `desktop/package.json:26`:
  ```json
  "dependencies": {
    "discord-rpc": "^4.0.1"
  }
  ```

Tüm kaynak kodda yapılan metin ve sembol aramalarında (`grep_search`):
- `desktop/src/main/lib/discord-rpc/` klasöründeki dosyaların **hiçbiri** `main.ts`, `discord.ts` veya başka bir dosya tarafından `import` edilmemektedir.
- Bu klasör projede tamamen **ölü kod (dead code)** olarak durmaktadır.

---

## ⚠️ 3. Riskler ve Sorunlar

1. **Paket Boyutu ve Derleme İsrafı**: 5 dosya `tsconfig.main.json` tarafından her build'de derlenmekte, `dist/main/lib/discord-rpc/` altına JS çıktıları üretilmekte ve nihai `.exe` / installer boyutunu gereksiz yere şişirmektedir.
2. **Kafa Karışıklığı ve Bakım Borcu**: Geliştirici veya denetçi projeyi incelerken Discord RPC'nin bu yerel sınıflar üzerinden çalıştığını zannedebilir; oysa çalışan kod npm'deki eski (deprecated) `discord-rpc` paketidir.
3. **npm `discord-rpc` Paketinin Eksiklikleri**: `desktop/src/main/utils/discord.ts:122` satırında yazılan yoruma göre:
   ```ts
   // NOT: npm discord-rpc'nin setActivity'si type'ı çöpe attığı için ham gönderilir.
   ```
   npm'deki paket aktivite tipini doğru iletemediği için hacky çözümler uygulanmaktadır; oysa yerel klasördeki kod tam da bu sorunu çözmek için yazılmış ancak sisteme entegre edilmeden unutulmuştur!

---

## 🛠️ 4. Özet ve Eylem Planı

İki temiz çözüm yolu mevcuttur:
1. **Seçenek A (Tavsiye Edilen - Modernizasyon)**: `desktop/src/main/utils/discord.ts` içindeki npm `discord-rpc` bağımlılığı kaldırılmalı ve projenin kendi yazdığı `desktop/src/main/lib/discord-rpc/client.ts` sınıfına bağlanmalıdır. Böylece npm paketinden kurtulunur ve tam tip desteği sağlanır.
2. **Seçenek B (Temizlik)**: Eğer npm paketi korunacaksa, kafa karışıklığını ve ölü kod yükünü önlemek için `desktop/src/main/lib/discord-rpc/` klasörü tamamen silinmelidir.
