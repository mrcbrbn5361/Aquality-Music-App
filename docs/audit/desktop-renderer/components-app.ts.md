# 📄 Dosya Denetimi: `desktop/src/renderer/components/app.ts`

> **Dosya Yolu**: `desktop/src/renderer/components/app.ts`  
> **Kod Hacmi**: 2,384 Satır  
> **Rolü**: Tüm Masaüstü Arayüzünün Monolitik Kontrolörü

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`app.ts`, Aquality Music masaüstü uygulamasının tüm arayüz mantığını, kullanıcı etkileşimlerini ve IPC haberleşmesini tek bir çatı altında toplayan monolitik bir TypeScript dosyasıdır. Sayfa değişimleri (`home`, `search`, `library`, `liked`, `settings`), arama önerileri, oynatma kuyruğu, ses seviyesi, süre kaydırıcı (scrubber), bağlam menüleri ve bildirimler (toast) bu dosya tarafından yönetilir.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): 2,384 Satırlık Monolitik Anti-Pattern
- **Konum**: Tüm Dosya (`1 - 2384. satırlar`)
- **Kök Neden**: Arayüz hiçbir alt bileşene (component), servise veya yardımcı modüle ayrılmamıştır. Tüm global durum tek bir `state` nesnesinde tutulmakta ve yüzlerce bağımsız fonksiyon doğrudan bu durum nesnesini mutasyona uğratmaktadır.
- **Etki**:
  - Kodun okunabilirliği ve bakımı son derece zordur.
  - Bir hata ayıklanırken yan etkiler (side-effects) öngörülemez.
  - Birim testi (Unit test) yazılması imkansızdır.
- **Düzeltme**: Kod en az 6 bağımsız modüle parçalanmalıdır:
  1. `state.ts`: Durum yönetimi ve olay yayıcı (event emitter)
  2. `player-controller.ts`: Oynatma kontrolleri, scrubber ve IPC dinleyicisi
  3. `navigation.ts`: Sayfa yönlendirme (routing)
  4. `views/home.ts`, `views/search.ts`, `views/library.ts`: Sayfa render modülleri
  5. `ui-components/`: Toast, context menu, modal ve playlist yöneticileri

---

### Sorun 2 (🔴 KRİTİK): Her 800ms'de Bir `saveQueue()` ile Disk I/O Tıkanması
- **Konum**: `desktop/src/renderer/components/app.ts:971`
- **Kod**:
  ```ts
  api.player.onUpdate((u: any) => {
    // ...
    saveQueue();
    // ...
  });
  ```
- **Kök Neden**: Oynatıcıdan her metadata veya şarkı güncellemesi geldiğinde `saveQueue()` çağrılmaktadır. `saveQueue()` fonksiyonu `api.store.set('queue', ...)` ve `api.store.set('queueIndex', ...)` tetikler. Bu çağrılar `main.ts` üzerinden `electron-store`'a gider ve diske senkron yazım (`fs.writeFileSync`) yapar.
- **Etki**: Müzik çalarken ve radyo modunda sürekli diske yazma işlemi yapılır; bu da ana süreçte mikro gecikmelere sebep olur.
- **Düzeltme**: `saveQueue()` fonksiyonuna `debounce` uygulanmalı, yalnızca kuyruğa kullanıcı tarafından yeni şarkı eklendiğinde/silindiğinde kaydedilmelidir.

---

### Sorun 3 (🟠 YÜKSEK): Her Durum Güncellemesinde Tüm Şarkı Satırlarının DOM Taraması
- **Konum**: `desktop/src/renderer/components/app.ts:967-969`
- **Kod**:
  ```ts
  $$('.song-row').forEach((r) => {
    r.classList.toggle('playing', (r as HTMLElement).dataset.id === pollVid);
  });
  ```
- **Kök Neden**: Oynatıcıdan gelen her güncellemede ekrandaki tüm şarkı satırları (`.song-row`) baştan sorgulanıp sınıf kontrolü yapılmaktadır. Eğer ekranda 100 şarkılık bir liste varsa, her 800ms'de 100 DOM elementi güncellenmektedir.
- **Etki**: Tarayıcının stil hesaplama (style recalibration) ve boyama (paint) döngüleri sürekli meşgul edilir.
- **Düzeltme**: Sadece önceki çalan satır (`lastActiveRow`) ve yeni çalan satır güncellenmelidir.

---

### Sorun 4 (🟠 YÜKSEK): Context Menu Kapatma Dinleyicisinde Bellek Sızıntısı Riski
- **Konum**: `desktop/src/renderer/components/app.ts:1650`
- **Kod**:
  ```ts
  document.addEventListener('click', closeContextMenu, { once: true });
  ```
- **Kök Neden**: Sağ tıklama ile bağlam menüsü açıldığında dokümana `{ once: true }` dinleyicisi eklenmektedir. Ancak kullanıcı sağ tıklamayı üst üste farklı yerlerde yaptığında önceki dinleyici tetiklenmeden yeni dinleyiciler birikebilir.
- **Düzeltme**: Tek bir global dinleyici kurulmalı ve delegasyon yöntemiyle kapatılmalıdır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. `app.ts` modüler hale getirilmeli ve bileşenlere bölünmelidir.
2. `saveQueue()` disk yazımları debounce edilmelidir.
3. DOM güncellemeleri tüm listeyi taramak yerine hedefe yönelik hale getirilmelidir.
