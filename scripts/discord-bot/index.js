const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  AttachmentBuilder
} = require('discord.js');
require('dotenv').config();
const { renderPlayerCard } = require('./cardRenderer');

const TOKEN = process.env.DISCORD_TOKEN;
const AQUALITY_APP_ID = '1547602880427724841';
const HARMONIC_APP_ID = '1545832861435830432';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ]
});

// Yerel REST API'den (Port 9863) aktif durumu çekmeyi dener
async function fetchLocalBotState() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 800);
    const res = await fetch('http://127.0.0.1:9863/api/v1/state', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.isPlaying && data.track) return data;
    }
  } catch {}
  return null;
}

// iTunes API üzerinden sanatçıya ait benzer şarkı önerilerini getirir
async function fetchSuggestions(artist, currentTitle) {
  const fallback = [
    { title: 'Benzer Şarkı 1', artist: artist || 'Aquality Music', url: 'https://github.com/mrcbrbn5361/Aquality-Music-App' },
    { title: 'Benzer Şarkı 2', artist: artist || 'Aquality Music', url: 'https://github.com/mrcbrbn5361/Aquality-Music-App' },
    { title: 'Benzer Şarkı 3', artist: artist || 'Aquality Music', url: 'https://github.com/mrcbrbn5361/Aquality-Music-App' }
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
  } catch {}

  return fallback;
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`\n========================================`);
  console.log(`✅ Aquality Discord Botu Hazır: ${readyClient.user.tag}`);
  console.log(`🆔 Client ID: ${readyClient.user.id}`);
  console.log(`🔗 Davet Linki: https://discord.com/oauth2/authorize?client_id=${readyClient.user.id}&permissions=274878024768&scope=bot%20applications.commands`);
  console.log(`========================================\n`);
  console.log(`Komutlar: .aqua, .aquality, .spo, .har`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const cmd = message.content.trim().toLowerCase();
  const validCommands = ['.aqua', '.aquality', '.spo', '.har', '.harmonic'];
  if (validCommands.includes(cmd)) {
    if (!message.guild) return message.reply('❌ Bu komut sadece sunucularda kullanılabilir.');

    let member = message.member;
    if (!member || !member.presence) {
      try {
        member = await message.guild.members.fetch({ user: message.author.id, force: true });
      } catch (err) {}
    }

    // 1. Öncelik: Discord Gateway Presence
    const activities = member?.presence?.activities || [];
    const activity = activities.find(a => 
      a.applicationId === AQUALITY_APP_ID || 
      a.applicationId === HARMONIC_APP_ID ||
      (a.name && (a.name.toLowerCase().includes('aquality') || a.name.toLowerCase().includes('harmonic')))
    );

    // 2. Yedek: Yerel REST API (Eğer aynı makineden tetikleniyorsa)
    const localState = await fetchLocalBotState();

    if (!activity && !localState) {
      return message.reply('❌ Şu anda **Aquality Music** veya **Harmonic** uygulamasında şarkı dinlemiyorsun!');
    }

    const isHarmonic = (activity?.name && activity.name.toLowerCase().includes('harmonic')) || (activity?.applicationId === HARMONIC_APP_ID);
    const accentColor = isHarmonic ? '#E53935' : '#1ED760';
    const platformName = isHarmonic ? 'Harmonic' : 'Aquality Music';

    let title = 'Bilinmeyen Şarkı';
    let artist = 'Bilinmeyen Sanatçı';
    let album = platformName;
    let coverUrl = null;
    let currentSec = 0;
    let durationSec = 0;

    if (localState && localState.track) {
      title = localState.track.title || title;
      artist = localState.track.artist || artist;
      album = localState.track.album || album;
      coverUrl = localState.track.thumbnail || null;
      currentSec = Math.round(localState.track.currentTime || 0);
      durationSec = Math.round(localState.track.duration || 0);
    } else if (activity) {
      title = activity.details || title;
      artist = activity.state || artist;
      album = activity.assets?.largeText || album;

      if (activity.assets?.largeImageURL) {
        coverUrl = activity.assets.largeImageURL({ size: 512 });
      } else if (activity.assets?.largeImage) {
        if (activity.assets.largeImage.startsWith('http')) {
          coverUrl = activity.assets.largeImage;
        } else if (activity.assets.largeImage.startsWith('mp:')) {
          coverUrl = `https://media.discordapp.net/${activity.assets.largeImage.replace('mp:', '')}`;
        }
      }

      const now = Date.now();
      const start = activity.timestamps?.start ? new Date(activity.timestamps.start).getTime() : now;
      const end = activity.timestamps?.end ? new Date(activity.timestamps.end).getTime() : 0;
      durationSec = end > start ? Math.round((end - start) / 1000) : 0;
      currentSec = Math.max(0, Math.round((now - start) / 1000));
    }

    // Sıradaki önerileri al
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

    // Canvas Oynatıcı Kartı
    const cardBuffer = await renderPlayerCard({
      title,
      artist,
      album,
      coverUrl,
      currentSec,
      durationSec,
      username: member.displayName || member.user.username,
      suggestions,
      platformName,
      accentColor
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: 'player-card.png' });
    const embed = new EmbedBuilder()
      .setColor(accentColor)
      .setImage('attachment://player-card.png');

    const appUrl = isHarmonic ? 'https://harmonic-music.org' : 'https://github.com/mrcbrbn5361/Aquality-Music-App';
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel(`${platformName}'ta Aç`).setStyle(ButtonStyle.Link).setURL(appUrl),
      new ButtonBuilder().setCustomId('btn_lyrics').setLabel('Şarkı Sözleri').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder();
    for (let i = 0; i < 3; i++) {
      const item = suggestions[i];
      let label = `${i + 1}. ${item.title}`;
      if (label.length > 25) label = label.slice(0, 22) + '...';
      row2.addComponents(
        new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(item.url || appUrl)
      );
    }

    try {
      await message.reply({ embeds: [embed], files: [attachment], components: [row1, row2] });
    } catch (err) {
      console.error('[Discord Bot] Mesaj gönderilemedi:', err);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId === 'btn_lyrics') {
    await interaction.reply({ content: '🎵 **Şarkı Sözleri** özelliği yakında kullanıma sunulacak!', ephemeral: true });
  }
});

if (TOKEN) {
  client.login(TOKEN).catch((err) => {
    console.error('[Discord Bot] Giriş hatası:', err.message);
  });
} else {
  console.log('[Discord Bot] DISCORD_TOKEN tanımlanmadı. Botu çalıştırmak için .env dosyasına token ekleyin.');
}
