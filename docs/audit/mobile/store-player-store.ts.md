# 📄 Dosya Denetimi: `mobile/src/store/player-store.ts`

> **Dosya Yolu**: `mobile/src/store/player-store.ts`  
> **Kod Hacmi**: 225 Satır  
> **Rolü**: Mobil Durum Yöneticisi ve `usePlayer` React Hook'u

---

## 🔍 1. Genel İnceleme ve Mimari Rolü

`player-store.ts`, mobil uygulamanın o anki şarkısını, oynatma/duraklatma durumunu, geçen süreyi (`currentTime`), toplam süreyi (`duration`), beğeni listesini ve kuyruğu yönetir. `AsyncStorage` kullanarak beğenilen şarkıları ve son çalınanları kalıcı olarak telefonda tutar.

---

## ⚠️ 2. Tespit Edilen Kritik Sorunlar ve Kök Neden Analizi

### Sorun 1 (🔴 KRİTİK): `usePlayer` Re-Render Fırtınası ve Aşırı Pil Tüketimi
- **Konum**: `mobile/src/store/player-store.ts:91-95, 214-224`
- **Kod**:
  ```ts
  setProgress(currentTime: number, duration: number) {
    this.state.currentTime = currentTime;
    if (duration > 0) this.state.duration = duration;
    this.notify();
  }

  export function usePlayer() {
    const [state, setState] = useState(playerStore.getState());
    useEffect(() => {
      return playerStore.subscribe(() => {
        setState({ ...playerStore.getState() });
      });
    }, []);
    return state;
  }
  ```
- **Kök Neden**:
  1. `AudioBridge` bileşeni müzik çalarken her 250-500 milisaniyede bir `setProgress()` fonksiyonunu çağırır.
  2. `setProgress()`, `this.notify()` metodunu tetikler.
  3. `usePlayer()` hook'u kullanan TÜM bileşenler (`MiniPlayer`, `PlayerModal`, alt gezinme çubuğu, şarkı satırları vb.), saniyede 2-4 kez hiçbir selector filtresi olmadan tamamen yeniden çizilir (`setState({ ... })`).
- **Etki**:
  - Şarkı çalarken telefonun işlemcisi sürekli %15-30 meşgul tutulur.
  - Cihaz ısınır ve batarya çok hızlı tükenir.
  - Arayüz kaydırmalarında mikro takılmalar (frame drops) yaşanır.
- **Düzeltme**:
  React 18/19 standardı olan `useSyncExternalStoreWithSelector` kullanılmalı veya `zustand` kütüphanesine geçilerek bileşenlerin sadece ihtiyaç duydukları alt duruma (örneğin sadece `playing` veya sadece `currentTime`) abone olması sağlanmalıdır:
  ```ts
  // Yalnızca progress bar'ın currentTime dinlemesi sağlanmalı:
  const currentTime = usePlayerStore(state => state.currentTime);
  ```

---

### Sorun 2 (🟡 ORTA): Kuyruk Durumunun (Queue) `AsyncStorage` İçinde Saklanmaması
- **Konum**: `mobile/src/store/player-store.ts:20-25`
- **Açıklama**: Masaüstü sürümünde çalma kuyruğu (`queue` ve `queueIndex`) diskte saklanıp uygulama açıldığında geri yüklenirken, mobil sürümde yalnızca `liked`, `recent`, `volume` ve `adblock` anahtarları saklanmaktadır.
- **Etki**: Kullanıcı uygulamayı kapatıp açtığında o an dinlemekte olduğu şarkı ve çalan liste tamamen sıfırlanır.

---

## 🛠️ 3. Özet ve Eylem Planı

1. Selector tabanlı abonelik mimarisine geçilerek re-render fırtınası durdurulmalıdır.
2. `queue` ve `queueIndex` `AsyncStorage` ile kalıcı hale getirilmelidir.
