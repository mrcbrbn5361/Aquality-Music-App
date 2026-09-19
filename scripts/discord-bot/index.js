const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  AttachmentBuilder,
  PermissionsBitField
} = require('discord.js');
require('dotenv').config();
const { renderPlayerCard } = require('./cardRenderer');

const TOKEN = process.env.DISCORD_TOKEN;
const AQUALITY_APP_ID = '1547602880427724841';
const AQUALITY_GUILD_ID = process.env.DISCORD_GUILD_ID || '';

// Güvenlik: Kullanıcı başına cooldown (anti-spam)
const cooldowns = new Map();
const COOLDOWN_MS = 3500;

// Intent Grupları
const BASE_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent
];

const PRIVILEGED_INTENTS = [
  GatewayIntentBits.GuildPresences,
  GatewayIntentBits.GuildMembers
];

let activeClient = null;

// Yerel REST API'den (Port 9863) aktif durumu çekmeyi dener
async function fetchLocalBotState() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const headers = {};
    if (process.env.BOT_SERVER_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.BOT_SERVER_TOKEN}`;
    }
    const res = await fetch('http://127.0.0.1:9863/api/v1/state', {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.track) return data;
    }
  } catch (e) {
    // Local API not available, fallback to null
  }
  return null;
}

// iTunes API üzerinden sanatçıya ait benzer şarkı önerilerini getirir
async function fetchSuggestions(artist, currentTitle) {
  const fallback = [
    { title: 'Benzer Şarkı 1', artist: artist || 'Aquality Music', url: 'https://aqualitymusic.vercel.app' },
    { title: 'Benzer Şarkı 2', artist: artist || 'Aquality Music', url: 'https://aqualitymusic.vercel.app' },
    { title: 'Benzer Şarkı 3', artist: artist || 'Aquality Music', url: 'https://aqualitymusic.vercel.app' }
  ];

  if (!artist || artist === 'Bilinmeyen Sanatçı') return fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&limit=6`, {
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const results = (data.results || [])
        .filter(x => !currentTitle || x.trackName.toLowerCase() !== currentTitle.toLowerCase())
        .slice(0, 3)
        .map(x => ({
          title: x.trackName,
          artist: x.artistName,
          url: x.trackViewUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(x.trackName + ' ' + x.artistName)}`
        }));

      if (results.length === 3) return results;
      if (results.length > 0) {
        while (results.length < 3) results.push(fallback[results.length]);
        return results;
      }
    }
  } catch (e) {
    // iTunes API error, use fallback
  }

  return fallback;
}

function setupBotEvents(client, hasPrivilegedIntents) {
  client.once(Events.ClientReady, (readyClient) => {
    console.log(`\n========================================`);
    console.log(`✅ Aquality Discord Botu Aktif: ${readyClient.user.tag}`);
    console.log(`🔒 Hedef Sunucu: ${AQUALITY_GUILD_ID || 'Tüm Sunucular'}`);
    console.log(`📡 Mod: ${hasPrivilegedIntents ? 'Tam Gateway RPC (Privileged Intents Aktif)' : 'Standart Fallback (REST API & Spotify Öncelikli)'}`);
    console.log(`🎵 Varsayılan Komut: .aquamusic`);
    console.log(`========================================\n`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();
    const isAquaMusicCmd = content === '.aquamusic' || content.startsWith('.aquamusic ');

    if (!isAquaMusicCmd) return;

    console.log(`[Discord Bot] Komut alındı: "${message.content}" | Sunucu: ${message.guild?.name || 'DM'} (${message.guild?.id || 'DM'}) | Kullanıcı: ${message.author.tag}`);

    // Sunucu İzolasyonu: Eğer ortam değişkeniyle DISCORD_GUILD_ID zorunlu kılınmışsa sınırla, aksi halde botun eklendiği her sunucuda çalış
    if (AQUALITY_GUILD_ID && message.guild && message.guild.id !== AQUALITY_GUILD_ID) {
      return;
    }

    // 🛡️ GÜVENLİK KONTROLÜ 2: Anti-Spam / Rate-Limiting (Kullanıcı başına bekleme süresi)
    const now = Date.now();
    const userCooldown = cooldowns.get(message.author.id);
    if (userCooldown && now < userCooldown) {
      const remaining = Math.ceil((userCooldown - now) / 1000);
      try {
        const warn = await message.reply(`⏳ Çok hızlısın! Lütfen **${remaining}** saniye sonra tekrar dene.`);
        setTimeout(() => { try { warn.delete(); } catch (e) { /* message already deleted */ } }, 2500);
      } catch (e) {
        // Reply failed, ignore
      }
      return;
    }
    cooldowns.set(message.author.id, now + COOLDOWN_MS);

    // 🛡️ GÜVENLİK KONTROLÜ 3: Kanal Yetki Doğrulaması
    if (message.guild && message.channel && message.guild.members?.me) {
      try {
        const perms = message.channel.permissionsFor(message.guild.members.me);
        if (perms && !perms.has(PermissionsBitField.Flags.SendMessages)) {
          console.warn(`[Discord Bot] Kanalda mesaj gönderme yetkisi yok: ${message.channel.id}`);
          return;
        }
      } catch (e) {
        // Ignore permission check error
      }
    }

    // Kullanıcı Presence (Durum) Bilgisini Çek (Sadece Privileged Intent aktifse denenir)
    let member = message.member;
    if (hasPrivilegedIntents && (!member || !member.presence) && message.guild) {
      try {
        member = await message.guild.members.fetch({ user: message.author.id, withPresences: true, force: true });
      } catch (err) {
        // Gateway presence fetch hatası durumunda fallback'e devam et
      }
    }

    // 1. Öncelik: Discord Gateway Presence (Aquality Music Desktop RPC)
    const activities = member?.presence?.activities || [];
    let activity = activities.find(a => 
      (a.applicationId && String(a.applicationId) === String(AQUALITY_APP_ID)) ||
      (a.name && (
        a.name.toLowerCase().includes('aquality') ||
        a.name.toLowerCase().includes('aquamusic') ||
        a.name.toLowerCase() === 'music'
      ))
    );

    // Fallback: Kullanıcı Spotify dinliyorsa onu da destekle
    const isSpotifyFallback = !activity && activities.some(a => a.name === 'Spotify');
    if (isSpotifyFallback) {
      activity = activities.find(a => a.name === 'Spotify');
    }

    // 2. Yedek: Yerel REST API (Port 9863)
    const localState = await fetchLocalBotState();

    if (!activity && !localState) {
      const helperHint = !hasPrivilegedIntents
        ? '\n\n💡 *Not: Bot şu anda standart modda çalışıyor. Dinlediğiniz parçanın algılanması için Aquality Music masaüstü uygulamanızın açık olduğundan emin olun.*'
        : '';

      const notPlayingEmbed = new EmbedBuilder()
        .setColor('#1ED760')
        .setTitle('🎵 Aktif Şarkı Bulunamadı')
        .setDescription(
          `Hey <@${message.author.id}>, şu anda **Aquality Music** üzerinde dinlediğin bir şarkı tespit edilemedi!\n\n` +
          `**Nasıl Çalışır?**\n` +
          `1. Bilgisayarında [Aquality Music](https://aqualitymusic.vercel.app/) uygulamasını aç.\n` +
          `2. Ayarlar menüsünden **Discord'da Göster** seçeneğinin açık olduğundan emin ol.\n` +
          `3. İstediğin bir şarkıyı çal ve bu kanala tekrar **\`.aquamusic\`** yaz!${helperHint}`
        )
        .setFooter({ text: 'Aquality Community • Sunucuya Özel Entegrasyon' });
      return message.reply({ embeds: [notPlayingEmbed] });
    }

    const accentColor = '#1ED760'; // Canlı Spotify Yeşil Vurgu
    const platformName = isSpotifyFallback ? 'Spotify' : 'Aquality Music';

    let title = 'Bilinmeyen Şarkı';
    let artist = 'Bilinmeyen Sanatçı';
    let album = 'Aquality Music';
    let coverUrl = null;
    let currentSec = 0;
    let durationSec = 0;
    let trackUrl = 'https://aqualitymusic.vercel.app';

    if (localState && localState.track) {
      title = localState.track.title || title;
      artist = localState.track.artist || artist;
      album = localState.track.album || album;
      coverUrl = localState.track.thumbnail || null;
      currentSec = Math.round(localState.track.currentTime || 0);
      durationSec = Math.round(localState.track.duration || 0);
      if (localState.track.url) trackUrl = localState.track.url;
    } else if (activity) {
      title = activity.details || title;
      artist = activity.state || artist;
      album = activity.assets?.largeText || album;

      if (activity.assets) {
        if (typeof activity.assets.largeImageURL === 'function') {
          try { coverUrl = activity.assets.largeImageURL({ size: 512 }); } catch {}
        }
        if (!coverUrl && activity.assets.largeImage) {
          const raw = String(activity.assets.largeImage);
          if (raw.startsWith('http://') || raw.startsWith('https://')) {
            coverUrl = raw;
          } else if (raw.startsWith('mp:')) {
            coverUrl = `https://media.discordapp.net/${raw.replace('mp:', '')}`;
          } else if (raw.startsWith('spotify:')) {
            coverUrl = `https://i.scdn.co/image/${raw.replace('spotify:', '')}`;
          } else if (activity.applicationId) {
            coverUrl = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${raw}.png`;
          }
        }
      }

      if (activity.syncId) {
        trackUrl = `https://open.spotify.com/track/${activity.syncId}`;
      }

      const curNow = Date.now();
      const start = activity.timestamps?.start ? new Date(activity.timestamps.start).getTime() : curNow;
      const end = activity.timestamps?.end ? new Date(activity.timestamps.end).getTime() : 0;
      durationSec = end > start ? Math.round((end - start) / 1000) : 0;
      currentSec = Math.max(0, Math.round((curNow - start) / 1000));
    }

    // Benzer şarkı önerilerini getir
    let suggestions = [];
    if (localState && localState.recommendations && localState.recommendations.length > 0) {
      suggestions = localState.recommendations.map(r => ({
        title: r.title,
        artist: r.artist,
        url: r.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(r.title + ' ' + r.artist)}`
      }));
    }
    if (suggestions.length < 3) {
      const apiSuggestions = await fetchSuggestions(artist, title);
      suggestions = suggestions.concat(apiSuggestions).slice(0, 3);
    }

    try {
      // Ekteki .spo tasarımının birebir dengi Canvas Oynatıcı Kartı
      const cardBuffer = await renderPlayerCard({
        title,
        artist,
        album,
        coverUrl,
        currentSec,
        durationSec,
        username: member?.displayName || member?.user?.username || message.author.username,
        suggestions,
        platformName,
        accentColor
      });

      const attachment = new AttachmentBuilder(cardBuffer, { name: 'aquamusic-card.png' });
      const embed = new EmbedBuilder()
        .setColor(accentColor)
        .setImage('attachment://aquamusic-card.png');

      // 1. Buton Satırı: [Aquality'de Aç ↗] [Şarkı Sözleri]
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Aquality'de Aç").setStyle(ButtonStyle.Link).setURL(trackUrl),
        new ButtonBuilder().setCustomId('btn_lyrics').setLabel('Şarkı Sözleri').setStyle(ButtonStyle.Secondary)
      );

      // 2. Buton Satırı: 1., 2., 3. Öneri Şarkı Butonları
      const row2 = new ActionRowBuilder();
      for (let i = 0; i < 3; i++) {
        const item = suggestions[i];
        let label = `${i + 1}. ${item.title}`;
        if (label.length > 25) label = label.slice(0, 22) + '...';
        row2.addComponents(
          new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(item.url || trackUrl)
        );
      }

      await message.reply({ embeds: [embed], files: [attachment], components: [row1, row2] });
    } catch (err) {
      console.error('[Discord Bot] Kart oluşturma veya gönderme hatası:', err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'btn_lyrics') {
      await interaction.reply({ content: '🎵 **Şarkı Sözleri:** Şarkı sözlerini Aquality Music masaüstü veya mobil uygulamasından anlık canlı senkronizasyonla takip edebilirsiniz!', ephemeral: true });
    }
  });
}

// Bot Başlatıcı: Privileged Intent hatasında otomatik olarak standart intent fallback'ine geçer
async function startBot() {
  if (!TOKEN) {
    console.log('[Discord Bot] DISCORD_TOKEN tanımlanmadı (.env dosyasını kontrol edin).');
    return;
  }

  // 1. Girişim: Tam Yetkili Intent Seti
  console.log('[Discord Bot] Discord Gateway bağlantısı başlatılıyor (Tam Intent Seti)...');
  let client = new Client({
    intents: [...BASE_INTENTS, ...PRIVILEGED_INTENTS]
  });
  setupBotEvents(client, true);

  try {
    await client.login(TOKEN);
    activeClient = client;
  } catch (err) {
    const errMsg = err?.message || String(err);
    const isDisallowedIntents = errMsg.includes('disallowed intents') || err?.code === 'DisallowedIntents';

    if (isDisallowedIntents) {
      console.warn('\n[Discord Bot] ⚠️ DISALLOWED_INTENTS Algılandı!');
      console.warn('[Discord Bot] ℹ️ Bot Privileged Intent yetkisine sahip değil (GuildPresences / GuildMembers).');
      console.warn('[Discord Bot] 🔄 Otomatik Fallback: Standart Intent\'ler ile yeniden bağlanılıyor...');
      console.warn('[Discord Bot] 💡 İpucu: Tam Gateway RPC varlığı için Developer Portal > Bot > Privileged Gateway Intents bölümünden "Presence Intent" ve "Server Members Intent" ayarlarını açabilirsiniz.\n');

      try {
        client.destroy();
      } catch (destroyErr) {
        // Ignore destroy error
      }

      // 2. Girişim: Standart Intent Seti (Guilds, GuildMessages, MessageContent)
      client = new Client({
        intents: BASE_INTENTS
      });
      setupBotEvents(client, false);

      try {
        await client.login(TOKEN);
        activeClient = client;
        console.log('[Discord Bot] ✅ Bot standart intent modunda başarıyla bağlandı.');
      } catch (fallbackErr) {
        console.error('[Discord Bot] Standart intent giriş hatası:', fallbackErr.message);
      }
    } else {
      console.error('[Discord Bot] Giriş hatası:', errMsg);
    }
  }
}

startBot();

process.on('unhandledRejection', (reason) => {
  console.error('[Discord Bot] Yakalanmamış reddetme:', reason);
});
