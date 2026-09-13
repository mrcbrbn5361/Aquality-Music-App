const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const statusFilePath = path.join(rootDir, 'PROJE-DURUM.md');

// Güvenli shell komutu çalıştırma
function runCmd(cmd, fallback = '') {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8', timeout: 25000 }).trim();
  } catch (err) {
    return fallback;
  }
}

// Tarih formatlama (YYYY-MM-DD HH:mm)
function getFormattedDate() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Git Bilgileri
const gitBranch = runCmd('git rev-parse --abbrev-ref HEAD', 'master');
const gitCommit = runCmd('git log -1 --format="%h - %s (%cr)"', 'Bilinmiyor');
const gitStatusRaw = runCmd('git status --porcelain', '');

// Değişen / İzlenen Dosyalar
const changedFiles = gitStatusRaw
  ? gitStatusRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/\s+/);
        const status = parts[0];
        const file = parts.slice(1).join(' ');
        let statusLabel = 'Değiştirildi';
        if (status === '??') statusLabel = 'Yeni Dosya';
        else if (status === 'A') statusLabel = 'Eklendi';
        else if (status === 'D') statusLabel = 'Silindi';
        else if (status === 'M') statusLabel = 'Düzenlendi';
        return { file, status: statusLabel };
      })
  : [];

// Sürüm Bilgileri
let rootPkg = { version: '1.0.0' };
let desktopPkg = { version: '1.0.0' };
let websitePkg = { version: '1.0.0' };
let mobilePkg = { version: '1.0.0' };
try { rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')); } catch {}
try { desktopPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'desktop', 'package.json'), 'utf8')); } catch {}
try { websitePkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'website', 'package.json'), 'utf8')); } catch {}
try { mobilePkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'mobile', 'package.json'), 'utf8')); } catch {}

// TypeScript Derleme Durumu Kontrolü (Main + Renderer + Mobile)
let mainTscOk = false;
let rendererTscOk = false;
let mobileTscOk = false;
let tscStatus = '✅ BAŞARILI (Hatası bulunmuyor)';

try {
  execSync('npx tsc --noEmit -p desktop/tsconfig.main.json', { cwd: rootDir, encoding: 'utf8', timeout: 30000 });
  mainTscOk = true;
} catch (err) {
  tscStatus = `⚠️ MAIN TS HATASI: ${(err.stdout || err.message || '').slice(0, 100)}`;
}

try {
  execSync('npx tsc --noEmit -p desktop/tsconfig.json', { cwd: rootDir, encoding: 'utf8', timeout: 30000 });
  rendererTscOk = true;
} catch (err) {
  if (mainTscOk) {
    tscStatus = `⚠️ RENDERER TS HATASI: ${(err.stdout || err.message || '').slice(0, 100)}`;
  }
}

try {
  execSync('npx tsc --noEmit -p mobile/tsconfig.json', { cwd: rootDir, encoding: 'utf8', timeout: 30000 });
  mobileTscOk = true;
} catch (err) {
  if (mainTscOk && rendererTscOk) {
    tscStatus = `⚠️ MOBIL TS HATASI: ${(err.stdout || err.message || '').slice(0, 100)}`;
  }
}

if (mainTscOk && rendererTscOk && mobileTscOk) {
  tscStatus = '✅ BAŞARILI (Masaüstü Main + Renderer + Mobil Expo Hatasız)';
}

// Kod Satırı (LOC) Sayımı
function countLinesInDir(dirPath, extensions = ['.ts', '.js', '.html', '.css']) {
  let totalLines = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'release') {
      totalLines += countLinesInDir(fullPath, extensions);
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        totalLines += content.split('\n').length;
      } catch {}
    }
  }
  return totalLines;
}

const mainLoc = countLinesInDir(path.join(rootDir, 'desktop', 'src', 'main'));
const rendererLoc = countLinesInDir(path.join(rootDir, 'desktop', 'src', 'renderer'));
const websiteLoc = countLinesInDir(path.join(rootDir, 'website'));
const mobileLoc = countLinesInDir(path.join(rootDir, 'mobile'), ['.ts', '.tsx', '.json', '.js']);

// Kapsamlı Sorun Veritabanı (21 Madde - Hepsi Çözüldü)
const issues = [
  {
    id: 'SEC-01',
    category: 'Güvenlik',
    title: 'Google OAuth Client Secret renderer maruziyeti',
    impact: 'İstemci tarafında yetkisiz token erişimi riski',
    priority: 'KRİTİK',
    status: '✅ DÜZELTİLDİ',
    solution: 'Client Secret renderer preload exposure\'dan kaldırıldı, güvenli ana süreçte tutuldu.'
  },
  {
    id: 'SEC-02',
    category: 'Güvenlik',
    title: 'XSS & HTML Injection açıkları (kartlar, playlist isimleri, OAuth)',
    impact: 'Kullanıcı verisi ve browse yanıtları üzerinden DOM XSS',
    priority: 'KRİTİK',
    status: '✅ DÜZELTİLDİ',
    solution: 'escapeHtml genişletildi, tüm dinamik kartlara ve OAuth URI parse adımlarına uygulandı.'
  },
  {
    id: 'SEC-03',
    category: 'Güvenlik',
    title: 'Chrome Cookie dosyası kilitlenmesi ve geçici dosya sızıntısı riski',
    impact: 'Chrome açıkken EBUSY/EPERM hatası; temp dosyada cookie kalma riski',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'os.tmpdir(), benzersiz geçici UUID dosya adı ve try-finally ile garantili disk temizliği sağlandı.'
  },
  {
    id: 'SEC-04',
    category: 'Güvenlik',
    title: 'login.html bağımsız penceresinde Preload/CSP uyumsuzluğu ve ölü kod',
    impact: 'Preload olmadan window.api tanımsız kalır ve pencere kilitlenir',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'Kullanılmayan login.html kaldırıldı; oturum akışı tam izole MusicAuth penceresi üzerinden netleştirildi.'
  },
  {
    id: 'SEC-05',
    category: 'Güvenlik',
    title: 'setWindowOpenHandler ve shell:openExternal güvensiz protokol riski',
    impact: 'Zararlı URL şemalarının (javascript:, file:) işletim sisteminde yürütülmesi',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'isSafeExternalUrl ortak fonksiyonu ile yalnızca https ve izin verilen alan adları açılacak şekilde filtrelendi.'
  },
  {
    id: 'ARC-01',
    category: 'Mimari',
    title: 'stream-resolver.ts pencere nesnesine __adCssHooked ataması',
    impact: 'BrowserWindow nesnesine dinamik özellik atanması, tip karmaşası',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'BrowserWindow WeakSet (adCssHookedWindows) ile tip güvenli ve bellek sızıntısız yapıya geçirildi.'
  },
  {
    id: 'ARC-02',
    category: 'Mimari',
    title: 'InnerTube clientVersion eskimesi riski',
    impact: '1.20241001 sürümünün YouTube tarafından drop edilmesi ve 400 Bad Request',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'clientVersion 1.20250801.00.00 sürümüne güncellendi (innertube, stream-resolver, music-auth).'
  },
  {
    id: 'ARC-03',
    category: 'Mimari',
    title: 'Liked Songs dinamik aramada Türkçe regex hatası ve sabit ID eksikliği',
    impact: 'Beğenilen şarkılar listesinin Türkçe YouTube Music kullanıcılarında boş gelmesi',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'Regex Türkçe diline uyarlandı ve dinamik arama başarısız olursa yerleşik LM (Liked Music) doğrudan fallback\'i eklendi.'
  },
  {
    id: 'ARC-04',
    category: 'Mimari',
    title: 'music-auth onBeforeSendHeaders cleanup ve kapsam eksikliği',
    impact: 'Session header listener\'ının filtrelenmemiş tüm istekleri modifiye etmesi',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'Hedef Google/YouTube URL filtrelemesi ve izole header ekleme yapısı uygulandı.'
  },
  {
    id: 'DAT-01',
    category: 'Veri & Durum',
    title: 'store.ts queue tipinde duration ve artistId alanlarının eksikliği',
    impact: 'TypeScript tip uyuşmazlığı; kuyruk kaydında duration/artistId kaybı riski',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'StoreData arayüzünde queue ve recentlyPlayed modellerine duration ve artistId tanımlandı.'
  },
  {
    id: 'DAT-02',
    category: 'Veri & Durum',
    title: 'Playlist ID çakışma (collision) riski',
    impact: 'Hızlı ardışık çalma listesi oluşturmada veri ezilmesi',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'Timestamp + rastgele UUID türevi benzersiz ID üretimi (pl_${Date.now()}_...) eklendi.'
  },
  {
    id: 'UI-01',
    category: 'Arayüz / UX',
    title: 'Arama sonuçlarında albüm ve sanatçı kartlarına tıklanamaması',
    impact: 'Kullanıcının arama sonuçlarından sanatçı veya albüme gidememesi',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'openBrowseCard ortak fonksiyonu yazıldı ve arama kartlarına click handler eklendi.'
  },
  {
    id: 'UI-02',
    category: 'Arayüz / UX',
    title: 'Giriş yapılmadan şarkıya tıklandığında sessizce durması',
    impact: 'Kullanıcının neden çalmama olduğunu anlamaması (kötü UX)',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'playSong içinde giriş kontrolü ve yönlendirici modal/toast eklendi.'
  },
  {
    id: 'UI-03',
    category: 'Arayüz / UX',
    title: 'Uygulama dilinin sabit Türkçe olması (i18n eksikliği)',
    impact: 'Uluslararası kullanıcılar için dil seçeneği bulunmaması',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'Ayarlar sekmesine Türkçe (tr) ve İngilizce (en) dil seçeneği eklendi; i18nDict ve applyLanguage entegrasyonu tamamlandı.'
  },
  {
    id: 'UI-04',
    category: 'Arayüz / UX',
    title: 'Sanatçı sayfalarında carousel raflarının ayrıştırılamaması',
    impact: 'Sanatçı sayfasındaki şarkıların ve albümlerin boş gözükmesi',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'musicCarouselShelfRenderer desteği InnerTube ayrıştırıcısına eklendi.'
  },
  {
    id: 'UI-05',
    category: 'Arayüz / UX',
    title: 'Kütüphane ve Beğenilenler boş durumlarında yönlendirme eksikliği',
    impact: 'Kullanıcının boş sayfada takılıp nereye gideceğini bilememesi',
    priority: 'DÜŞÜK',
    status: '✅ DÜZELTİLDİ',
    solution: 'Müzik Ara ve Müzik Keşfet etkileşimli yönlendirme butonları eklendi.'
  },
  {
    id: 'WEB-01',
    category: 'Web & Dağıtım',
    title: 'website/vite.config.js içinde gizlilik ve koşullar sayfalarının eksik olması',
    impact: 'Web sitesi build alındığında gizlilik ve lisans linklerinin 404 vermesi',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'gizlilik.html ve kosullar.html rollupOptions.input nesnesine bağlandı.'
  },
  {
    id: 'WEB-02',
    category: 'Web & Dağıtım',
    title: 'Web sitesi HTML dosyalarında type="module" script uyarısı',
    impact: 'Vite derleyicisinin scriptleri bundle edememesi ve konsolda uyarı',
    priority: 'DÜŞÜK',
    status: '✅ DÜZELTİLDİ',
    solution: 'Tüm HTML sayfalarındaki script etiketlerine type="module" eklendi.'
  },
  {
    id: 'UX-01',
    category: 'Arayüz / UX',
    title: 'Spotify Standardı Arayüz ve Dinamik Etkileşimler (Ekolayzır & Kart Oynatma)',
    impact: 'Eski düz liste görünümü ve kartlarda dinamik oynat düğmesinin olmaması',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: '3 barlı canlı yeşil ekolayzır, hover oynat ikonları, kart hover yüzen yeşil oynat butonları eklendi.'
  },
  {
    id: 'PKG-01',
    category: 'Paketleme & Dağıtım',
    title: 'Portable sürüm veri izolasyonu ve USB taşınabilirliği eksikliği',
    impact: 'Portable modda çalıştırıldığında verilerin yerel %APPDATA% içine sızması',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'PORTABLE_EXECUTABLE_DIR tespit edilerek userData klasörü exe yanındaki data/ klasörüne izole edildi.'
  },
  {
    id: 'PKG-02',
    category: 'Paketleme & Dağıtım',
    title: 'Kurulum sihirbazı (NSIS) kısayol parametreleri, kaldırma temizliği ve dil eksiklikleri',
    impact: 'Kısayol çalışma dizini eksikliği, uninstaller sonrası artık dosyalar',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'installer.nsh içinde SetOutPath $INSTDIR ve kapsamlı uninstaller temizliği eklendi; tr_TR dili bağlandı.'
  },
  {
    id: 'BOT-01',
    category: 'Discord & Bot',
    title: 'Aquality Music Port 9863 Yerel Bot REST API ve Canvas Kart Motoru Eksikliği',
    impact: 'Discord botlarının çalan şarkıyı, süreyi ve önerileri çekememesi',
    priority: 'YÜKSEK',
    status: '✅ DÜZELTİLDİ',
    solution: 'Port 9863 HTTP REST API (/api/v1/state) sunucusu, preload köprüsü, app.ts senkronizasyonu ve @napi-rs/canvas oynatıcı kartı bot motoru eklendi.'
  },
  {
    id: 'REL-01',
    category: 'Kararlılık',
    title: 'Çoklu monitör bağlantısı kesildiğinde pencerenin ekran dışı koordinatlarda kalması',
    impact: 'İkinci ekran çıkarıldığında uygulamanın görünmeyen koordinatlarda açılması',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'screen.getAllDisplays() ile pencere koordinatlarının aktif monitör alanı içinde olduğu doğrulanarak ekran dışı kalma engellendi.'
  },
  {
    id: 'SEC-07',
    category: 'Güvenlik',
    title: 'Discord OAuth rastgele CSRF state doğrulaması ve port çakışması koruması',
    impact: 'Oturum açma sırasında CSRF riski ve port kilitlenmesi',
    priority: 'ORTA',
    status: '✅ DÜZELTİLDİ',
    solution: 'Kriptografik 32-byte CSRF state parametresi, PKCE doğrulaması ve EADDRINUSE hata yakalaması eklendi.'
  }
];

const totalIssues = issues.length;
const resolvedIssues = issues.filter((i) => i.status.includes('DÜZELTİLDİ')).length;
const openIssues = totalIssues - resolvedIssues;
const healthPercent = Math.round((resolvedIssues / totalIssues) * 100);
const formattedDate = getFormattedDate();

// 1. PROJE-DURUM.md Dosyasını Üret ve Güncelle
function updateRootStatusFile() {
  let md = `# 🎵 Aquality Music — Proje Durum ve Kapsamlı Sorun Analizi\n\n`;
  md += `> **Otomatik Güncelleme Sistemi**: Bu dosya proje derlendiğinde, commit atıldığında veya \`npm run docs:update\` çalıştırıldığında otomatik olarak güncellenir.\n\n`;
  md += `| Özellik | Değer |\n`;
  md += `|---|---|\n`;
  md += `| **Son Güncelleme** | \`${formattedDate}\` |\n`;
  md += `| **Proje Versiyonu** | \`v${rootPkg.version || '1.0.0'}\` (Masaüstü: \`v${desktopPkg.version || '1.0.0'}\`, Web: \`v${websitePkg.version || '1.0.0'}\`, Mobil: \`v${mobilePkg.version || '1.0.0'}\`) |\n`;
  md += `| **Aktif Git Branch** | \`${gitBranch}\` |\n`;
  md += `| **Son Git Commit** | \`${gitCommit}\` |\n`;
  md += `| **TypeScript Sağlık** | ${tscStatus} |\n`;
  md += `| **Kod Hacmi (LOC)** | Ana Süreç: ~${mainLoc} satır, Arayüz: ~${rendererLoc} satır, Mobil (Expo): ~${mobileLoc} satır, Web: ~${websiteLoc} satır |\n\n`;
  md += `---\n\n`;

  md += `## 📊 1. Proje Genel Durumu ve Sağlık Özeti\n\n`;
  md += `- **Toplam Takip Edilen Sorun**: ${totalIssues}\n`;
  md += `- **Çözülen / İyileştirilen**: ${resolvedIssues} (${healthPercent}%)\n`;
  md += `- **Açık / İncelenen**: ${openIssues}\n`;
  md += `- **Build Durumu**: Masaüstü (Vite + Electron + TS) & Web Sitesi (Vite) entegrasyonu aktif.\n\n`;

  md += `---\n\n`;

  md += `## 🔍 2. Kapsamlı Sorun Analiz Matrisi\n\n`;
  md += `| ID | Kategori | Öncelik | Sorun Tanımı ve Etkisi | Durum | Çözüm / Aksiyon Notu |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (const item of issues) {
    md += `| \`${item.id}\` | **${item.category}** | \`${item.priority}\` | **${item.title}**<br>_${item.impact}_ | ${item.status} | ${item.solution} |\n`;
  }
  md += `\n---\n\n`;

  md += `## 📁 3. Son Değiştirilen / İzlenen Dosyalar (Git Status)\n\n`;
  if (changedFiles.length > 0) {
    md += `| Dosya Yolu | Durum |\n`;
    md += `|---|---|\n`;
    for (const f of changedFiles.slice(0, 35)) {
      md += `| \`${f.file}\` | ${f.status} |\n`;
    }
    if (changedFiles.length > 35) {
      md += `| _...ve ${changedFiles.length - 35} diğer dosya_ | - |\n`;
    }
  } else {
    md += `_Çalışma ağacı temiz. İzlenen herhangi bir kaydedilmemiş değişiklik bulunmuyor._\n`;
  }
  md += `\n---\n\n`;

  md += `## 📚 4. Modüler Dokümantasyon Dizini\n\n`;
  md += `Projenin detaylı alt dokümanlarına [\`docs/\`](docs/README.md) klasöründen ulaşılabilir:\n\n`;
  md += `- [01. Mimari ve Sistem Tasarımı](docs/01-MIMARI-VE-SISTEM-TASARIMI.md)\n`;
  md += `- [02. API ve Stream Motoru](docs/02-API-VE-STREAM-MOTORU.md)\n`;
  md += `- [03. Kimlik Doğrulama ve Güvenlik](docs/03-AUTH-VE-GUVENLIK.md)\n`;
  md += `- [04. Renderer ve Arayüz Tasarımı](docs/04-RENDERER-VE-ARAYUZ.md)\n`;
  md += `- [05. Veri Yönetimi ve Store](docs/05-VERI-STORE-VE-DURUM.md)\n`;
  md += `- [06. Paketleme ve Dağıtım](docs/06-PAKETLEME-VE-DAGITIM.md)\n`;
  md += `- [07. Web Sitesi ve Dağıtım](docs/07-WEB-SITESI-VE-SEO.md)\n`;
  md += `- [08. Sorunlar ve Çözümler Matrisi](docs/08-SORUNLAR-VE-COZUMLER.md)\n`;
  md += `- [09. Geliştirici Kılavuzu](docs/09-GELISTIRICI-KILAVUZU.md)\n`;
  md += `- [10. Mobil (Expo - Android & iOS) Rehberi](docs/10-MOBIL-EXPO-REHBERI.md)\n`;
  md += `- [11. Discord Bot ve RPC Entegrasyonu](docs/11-DISCORD-BOT-VE-RPC-ENTEGRASYONU.md)\n\n`;

  fs.writeFileSync(statusFilePath, md, 'utf8');
}

// 2. docs/ Altındaki Dosyaların AUTO-UPDATE Bloklarını Güncelle
function updateDocsAutoBlocks() {
  if (!fs.existsSync(docsDir)) return;

  const docFiles = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));

  const statusSnippet = `<!-- AUTO-UPDATE:STATUS-START -->
| Sistem Parametresi | Değer / Durum |
|---|---|
| **Son Güncelleme** | \`${formattedDate}\` |
| **Proje Sürümü** | \`v${rootPkg.version || '1.0.0'}\` (Masaüstü: \`v${desktopPkg.version || '1.0.0'}\`, Web: \`v${websitePkg.version || '1.0.0'}\`) |
| **Git Dalı (Branch)** | \`${gitBranch}\` |
| **Son Commit** | \`${gitCommit}\` |
| **TypeScript Derleme Sağlığı** | ${tscStatus} |
| **Takip Edilen Sorunlar** | ${resolvedIssues} / ${totalIssues} Çözüldü (%${healthPercent} Başarı) |
<!-- AUTO-UPDATE:STATUS-END -->`;

  for (const file of docFiles) {
    const filePath = path.join(docsDir, file);
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('<!-- AUTO-UPDATE:STATUS-START -->')) {
        content = content.replace(
          /<!-- AUTO-UPDATE:STATUS-START -->[\s\S]*?<!-- AUTO-UPDATE:STATUS-END -->/,
          statusSnippet
        );
        fs.writeFileSync(filePath, content, 'utf8');
      }
    } catch (err) {
      console.error(`[Docs Updater] ${file} güncellenirken hata:`, err.message);
    }
  }
}

// 3. Git Post-Commit Kancasını Kur (Otomatik Güncelleme Garantisi)
function ensureGitHook() {
  const gitHooksDir = path.join(rootDir, '.git', 'hooks');
  if (fs.existsSync(gitHooksDir)) {
    const postCommitHook = path.join(gitHooksDir, 'post-commit');
    const hookScript = `#!/bin/sh\nnode scripts/update-docs.cjs\n`;
    try {
      if (!fs.existsSync(postCommitHook) || fs.readFileSync(postCommitHook, 'utf8') !== hookScript) {
        fs.writeFileSync(postCommitHook, hookScript, { encoding: 'utf8', mode: 0o755 });
      }
    } catch {}
  }
}

// Yürütme
try {
  updateRootStatusFile();
  updateDocsAutoBlocks();
  ensureGitHook();
  console.log(`[Aquality Docs Engine] Tüm dokümanlar ve PROJE-DURUM.md başarıyla güncellendi! (${formattedDate})`);
} catch (e) {
  console.error('[Aquality Docs Engine] Hata:', e);
}
