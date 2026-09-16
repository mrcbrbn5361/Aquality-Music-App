# Mobile (Expo/React Native) Sorun Analizi

> **Toplam Sorun:** 34 | **KRITIK:** 2 | **YUKSEK:** 5 | **ORTA:** 14 | **DUSUK:** 13

---

## KRITIK Sorunlar

### MOB-01: `autoPlay` State Eksik - Uygulama Cokuyor
- **Dosya:** `mobile/app/(tabs)/settings.tsx:24, 95`
- **Kategori:** BUG / CRASH
- **Aciklama:** `settings.tsx` `usePlayer()`'dan `autoPlay` destructure ediyor ve `playerStore.setAutoPlay(val)` cagiriyor. Ancak `PlayerState` arayuzunde `autoPlay` ozelligi yok ve `PlayerStore` sinifinda `setAutoPlay()` metodu tanimli degil. Switch tiklandiginda `TypeError: playerStore.setAutoPlay is not a function` hatasi verir.
- **Cozum:**
  ```typescript
  // PlayerState arayuzune ekle:
  autoPlay: boolean;
  
  // Varsayilan duruma ekle:
  autoPlay: true,
  
  // Yeni metod ekle:
  setAutoPlay(enabled: boolean) {
    this.state.autoPlay = enabled;
    this.notify();
  }
  ```

### MOB-02: `playerStore.setAutoPlay()` Runtime Hatasi
- **Dosya:** `mobile/app/(tabs)/settings.tsx:95`
- **Kategori:** BUG / CRASH
- **Aciklama:** MOB-01 ile ayni sorunun kullanim tarafindaki sonucu. "Sonsuz Radyo" switch'i tiklandiginda uygulama coker.
- **Cozum:** MOB-01 ile ayni.

---

## YUKSEK Sorunlar

### MOB-03: Search Debounce Timer Unmount'ta Temizlenmiyor
- **Dosya:** `mobile/app/(tabs)/search.tsx:48`
- **Kategori:** BELLEK-SIZINTI
- **Aciklama:** Debounce `setTimeout` bilesen unmount oldugunda temizlenmiyor. Kullanici navigasyon yaparsa, timeout callback'iUnmount edilmis bilesende `setSuggestions` cagirarak React uyarisi verir.
- **Cozum:**
  ```typescript
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
  ```

### MOB-04: PlayerStore Dizileri Direkt Mutasyon
- **Dosya:** `mobile/src/store/player-store.ts:165, 245, 248, 262, 280, 296, 308`
- **Kategori:** BUG
- **Aciklama:** `push()`, `splice()`, `unshift()` ile diziler dogrudan degistiriliyor. React'in shallow comparison'u ayni referansi gordugunden guncelleme atlanabilir.
- **Cozum:** Yeni dizi olusturulmali:
  ```typescript
  // push yerine:
  this.state.queue = [...this.state.queue, song];
  // splice yerine:
  this.state.likedIds = this.state.likedIds.filter((_, i) => i !== idx);
  ```

### MOB-05: `usePlayer()` Memoization'i Engellemek
- **Dosya:** `mobile/src/store/player-store.ts:349-358`
- **Kategori:** PERFORMANS
- **Aciklama:** `setState({ ...playerStore.getState() })` her bildirimde yeni obje olusturur. Tum aboneler (SongRow, MiniPlayer, ayarlar, kutuphane) her durum degisikliginde yeniden render alir.
- **Cozum:** Selector tabanli abonelik veya `useSyncExternalStore` kullanilmali. Progress guncellemeleri ayri listener grubuna ayrilmali.

### MOB-06: Progress Guncellemeleri Cascade Re-render
- **Dosya:** `mobile/src/store/player-store.ts:361-374`, `AudioBridge.tsx:165`
- **Kategori:** PERFORMANS
- **Aciklama:** Her 300ms'de bir progress guncellemesi tum `usePlayerProgress()` abonelerini yeniden render'a zorlar. Player modal'i her 300ms'de yeniden render olur.
- **Cozum:** Progress guncellemeleri 1000ms'e dusurulmeli veya `requestAnimationFrame` kullanilmali. Progress-bagimli UI kucuk memoize edilmis bilesenlere bolunmeli.

### MOB-07: Auto-play Switch Her Zaman False Gosterir
- **Dosya:** `mobile/app/(tabs)/settings.tsx:93-98`
- **Kategori:** BUG (Kullanici Tarafinda Gorunur)
- **Aciklama:** `autoPlay` maglum oldugundan `Switch` her zaman `false` gosterir. Kullanici acsa bile switch kapali gorunur.
- **Cozum:** MOB-01 ile ayni.

---

## ORTA Sorunlar

### MOB-08: `Dimensions.get('window')` Modul Kapsaminda Hesaplaniyor
- **Dosya:** `mobile/app/modal/player.tsx:21`, `mobile/app/(tabs)/index.tsx:21`
- **Aciklama:** Ekran dondugunde veya split-screen modunda deger guncellenmez.
- **Cozum:** `useWindowDimensions()` hook'u kullanilmali.

### MOB-09: useCallback/useMemo Eksik
- **Dosya:** `index.tsx`, `search.tsx`, `library.tsx`
- **Aciklama:** Callback'ler her render'da yeniden olusturuluyor, SongRow React.memo'su islevsiz kaliyor.
- **Cozum:** Callback'ler `useCallback` ile sarmalanmali.

### MOB-10: JavaScript Enjeksiyonu - Sanitize Yok
- **Dosya:** `mobile/src/components/AudioBridge.tsx:210`
- **Kategori:** GUVENLIK
- **Aciklama:** `injectJavaScript` ile sarki ID'si dogrudan string interpolasyonu ile ekleniyor. Kote virgul veya ters egik ile injection mumkun.
- **Cozum:** `id.replace(/[^a-zA-Z0-9_-]/g, '')` ile temizlenmeli.

### MOB-11: WebView Origin Whitelist `*`
- **Dosya:** `mobile/src/components/AudioBridge.tsx:276, 289`
- **Kategori:** GUVENLIK
- **Aciklama:** `originWhitelist={['*']}` ve `mixedContentMode="always"` herhangi bir URL'ye izin veriyor.
- **Cozum:** `['https://www.youtube.com', 'https://music.youtube.com']` ile sinirlandirilmali.

### MOB-12: Silent Error Swallowing
- **Dosya:** Cok sayida dosya (player-store.ts, player.ts, search.tsx, player.tsx)
- **Aciklama:** Bos `.catch(() => {})` ve `catch {}` bloklari hatalari yutuyor. Hata ayiklama cok zor.
- **Cozum:** En azindan `console.warn()` ile loglama yapilmali.

### MOB-13: Unmount'ta Iptal Edilmeyen Istekler
- **Dosya:** `innertube.ts`, `search.tsx`, `index.tsx`, `player.tsx`
- **Aciklama:** Bilesen unmount oldugunda API istekleri devam ediyor. Eski yanit yeni sarki sozlerini ezebilir.
- **Cozum:** `AbortController` ile her effect'te iptal destegi eklenmeli.

### MOB-14: Hardcoded Tab Bar Yuksekligi
- **Dosya:** `mobile/app/(tabs)/_layout.tsx:74-75, 86-87`
- **Aciklama:** Android'de notch/cutout icin yukseklik yetersiz.
- **Cozum:** `useSafeAreaInsets()` ile dinamik hesaplama yapilmali.

### MOB-15: monitorInterval Unmount'ta Temizlenmiyor
- **Dosya:** `mobile/src/components/AudioBridge.tsx:127` (JS baglami)
- **Aciklama:** WebView JS baglaminda `monitorInterval` unmount'ta temizlenmiyor.
- **Cozum:** `beforeunload` event listener'i eklenmeli.

### MOB-16: parseTwoRow Null Referans
- **Dosya:** `mobile/src/api/innertube.ts:389, 449`
- **Aciklama:** `parseTwoRow` null donebilir, `as Song` cast'i null gecirebilir.
- **Cozum:** Explicit null daraltma yapilmali.

### MOB-17: React.memo Engelleyici Unstable Props
- **Dosya:** `mobile/src/components/SongRow.tsx:16`
- **Aciklama:** Ebeveynlerdeki inline arrow fonksiyonlar React.memo'yu islevsiz birakir.
- **Cozum:** `useCallback` ile stabil referans saglanmali.

### MOB-18: onPlaybackStatusUpdate Olum Kod
- **Dosya:** `mobile/src/services/player.ts:114-124`
- **Aciklama:** `AudioPlayer` hic atanmadi, handler hic baglanmadi.
- **Cozum:** Kullanilmayan kod kaldirilmali.

---

## DUSUK Sorunlar

### MOB-19: Versiyon Uyumsuzlugu (1.0.0 vs 1.0.1)
- **Dosya:** `mobile/app/(tabs)/settings.tsx:193`
- **Aciklama:** Sabit "v1.0.0" gosteriyor, package.json 1.0.1.
- **Cozum:** `expo-constants` ile dinamik versiyon.

### MOB-20: Kullanilmayan Bağımlılıklar
- **Dosya:** `mobile/package.json:18, 28, 29`
- **Aciklama:** `expo-linking`, `react-native-worklets`, `react-native-youtube-iframe` hic import edilmiyor.
- **Cozum:** Kaldirilmali.

### MOB-21: Hardcoded User-Agent
- **Dosya:** `mobile/src/components/AudioBridge.tsx:290`
- **Aciklama:** iPhone user-agent'i Android'de uyumsuzluk olusturabilir.
- **Cozum:** Varsayilan user-agent kullanilmali veya dinamik olusturulmali.

### MOB-22: Lyrics Fetch Yarisi
- **Dosya:** `mobile/app/modal/player.tsx:67`
- **Aciklama:** Hizli sarki degisiminde eski sozler yeni sarki uzerine yazabilir.
- **Cozum:** AbortController veya songId kontrolu.

### MOB-23: getGreeting() Her Render'da
- **Dosya:** `mobile/app/(tabs)/index.tsx:41-46`
- **Aciklama:** Her render'da yeni Date() olusturuluyor.
- **Cozum:** `useMemo` ile hesaplanmali.

### MOB-24: Kullaniciya Hata Bildirimi Yok
- **Dosya:** `search.tsx:69-71`, `index.tsx:60-61`
- **Aciklama:** API hatalarinda kullaniciya mesaj gosterilmiyor.
- **Cozum:** Hata durumu ve yeniden deneme butonu eklenmeli.

### MOB-25: Stale Closure in handlePlaySong
- **Dosya:** `mobile/app/(tabs)/index.tsx:77-90`
- **Aciklama:** `useCallback` olmadan degiskenler kapanis tarafindan yakalanir.
- **Cozum:** `useCallback` ile sarmalanmali.

### MOB-26: likedSongs Her Render'da Filtreleniyor
- **Dosya:** `mobile/app/(tabs)/library.tsx:28`
- **Aciklama:** Buyuk dizi icinde O(n*m) filtre calisiyor.
- **Cozum:** `useMemo` ile sarmalanmali.

### MOB-27: expo-env.d.ts Git'te Eksik
- **Dosya:** `mobile/.gitignore:5`, `mobile/tsconfig.json:24`
- **Aciklama:** Yeni klonlarda dosya yok, tsc hata uretebilir.
- **Cozum:** `expo start` once calistirilmali notu eklmeli.

### MOB-28: Hardcoded Fallback Thumbnail URL
- **Dosya:** Cok sayida dosya (6+ yer)
- **Aciklama:** Ayni Unsplash URL'i her yerde kullaniliyor.
- **Cozum:** Paylasilan sabit tanimlanmali.

### MOB-29: audioQuality Ayari Islevsiz
- **Dosya:** `settings.tsx:101-123`, `player.ts`
- **Aciklama:** Ayar kaydediliyor ama gercek oynatmada kullanilmiyor.
- **Cozum:** Gercek kalite secimi uygulanmali veya ayar kaldirilmali.

### MOB-30: Array Index React Key
- **Dosya:** `mobile/app/modal/player.tsx:297`
- **Aciklama:** Index tabanli key'ler yanlis DOM yeniden kullanimina yol acabilir.
- **Cozum:** icerik + index kombinasyonu kullanilmali.

### MOB-31: Tekrarlanan setAudioModeAsync
- **Dosya:** `mobile/app/_layout.tsx:12`, `src/services/player.ts:35`
- **Aciklama:** Iki farkli yerde ayni konfigurasyon cagrisi.
- **Cozum:** Tek bir yere tasimali.

### MOB-32: Progress Bar Inline Style
- **Dosya:** `mobile/app/modal/player.tsx:195`
- **Aciklama:** Her guncellemede layout recalculations.
- **Cozum:** `react-native-reanimated` ile native thread'de animasyon.

### MOB-33: Lyrics useEffect Yanlis Kaynak
- **Dosya:** `mobile/app/modal/player.tsx:67`
- **Aciklama:** `mobileApi` modul kapsaminda singleton, hizli sarki degisiminde sorun.
- **Cozum:** AbortController + songId kontrolu.

### MOB-34: WebView JS Enabled with Untrusted Content
- **Dosya:** `mobile/src/components/AudioBridge.tsx:287-288`
- **Kategori:** GUVENLIK
- **Aciklama:** Harici YouTube iframe API JS erisimi var. MITM veya zehirlenme durumunda komut gonderilebilir.
- **Cozum:** Gelen mesajlar whitelist ile dogrulanmali.
