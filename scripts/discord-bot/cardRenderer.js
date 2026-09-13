const { createCanvas, loadImage } = require('@napi-rs/canvas');

function roundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.trim() + '...';
}

function formatTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Aquality Music & Harmonic Uyumlu Modern Canvas Oynatıcı Kartı
 */
async function renderPlayerCard({
  title = 'Bilinmeyen Şarkı',
  artist = 'Bilinmeyen Sanatçı',
  album = 'Aquality Music',
  coverUrl = null,
  currentSec = 0,
  durationSec = 0,
  username = 'Kullanıcı',
  suggestions = [],
  platformName = 'Aquality',
  accentColor = '#1ED760' // Opsiyonel Kırmızı (#E53935) veya Yeşil (#1ED760)
}) {
  const width = 640;
  const height = 340;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Koyu zemin kartı
  ctx.fillStyle = '#121316';
  roundRect(ctx, 0, 0, width, height, 18);
  ctx.fill();

  // Kart çerçevesi
  ctx.strokeStyle = '#222328';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Sol Taraf: Albüm Kapağı
  const coverSize = 150;
  const coverX = 24;
  const coverY = 24;

  ctx.save();
  roundRect(ctx, coverX, coverY, coverSize, coverSize, 12);
  ctx.clip();

  let coverLoaded = false;
  if (coverUrl) {
    try {
      const img = await loadImage(coverUrl);
      ctx.drawImage(img, coverX, coverY, coverSize, coverSize);
      coverLoaded = true;
    } catch (err) {
      console.warn('[CardRenderer] Kapak resmi yüklenemedi:', err.message);
    }
  }

  if (!coverLoaded) {
    ctx.fillStyle = '#1e1f25';
    ctx.fillRect(coverX, coverY, coverSize, coverSize);
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 40px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♫', coverX + coverSize / 2, coverY + coverSize / 2);
  }
  ctx.restore();

  // Platform Rozeti (Pill Badge)
  const pillW = 104;
  const pillH = 26;
  const pillX = coverX + (coverSize - pillW) / 2;
  const pillY = coverY + coverSize + 14;

  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 10;
  ctx.fillStyle = accentColor;
  roundRect(ctx, pillX, pillY, pillW, pillH, 13);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = accentColor === '#1ED760' ? '#000000' : '#ffffff';
  ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`● ${platformName}`, pillX + pillW / 2, pillY + pillH / 2);

  // Sağ Taraf İçeriği
  const rightX = 200;
  const rightEnd = width - 25;
  const rightWidth = rightEnd - rightX;

  // Üst Başlık
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#9b9da4';
  ctx.fillText('Şu anda dinliyor', rightX, 26);

  ctx.textAlign = 'right';
  ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#9b9da4';
  ctx.fillText(truncateText(ctx, username, 180), rightEnd, 26);

  // Şarkı Başlığı
  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(truncateText(ctx, title, rightWidth), rightX, 48);

  // Sanatçı Adı
  ctx.font = 'bold 15px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#e2e3e8';
  ctx.fillText(truncateText(ctx, artist, rightWidth), rightX, 78);

  // Albüm Adı
  ctx.font = '13px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#7e818c';
  ctx.fillText(truncateText(ctx, album, rightWidth), rightX, 98);

  // Süre Zaman Etiketleri
  const timeY = 125;
  ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#8c8e96';
  ctx.textAlign = 'left';
  ctx.fillText(formatTime(currentSec), rightX, timeY);

  ctx.textAlign = 'right';
  ctx.fillText(formatTime(durationSec), rightEnd, timeY);

  // İlerleme Çubuğu
  const barY = 143;
  const barH = 4;
  const progressRatio = durationSec > 0 ? Math.min(Math.max(currentSec / durationSec, 0), 1) : 0;
  const filledW = Math.max(progressRatio * rightWidth, 2);

  ctx.fillStyle = '#282a30';
  roundRect(ctx, rightX, barY, rightWidth, barH, 2);
  ctx.fill();

  ctx.fillStyle = accentColor;
  roundRect(ctx, rightX, barY, filledW, barH, 2);
  ctx.fill();

  // Parlayan Gösterge Noktası
  const thumbX = rightX + filledW;
  const thumbY = barY + barH / 2;
  ctx.save();
  ctx.shadowColor = accentColor;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // ÖNERİLER Bölümü
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 11px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#8c8e96';
  ctx.fillText('ÖNERİLER', rightX, 168);

  const listStartY = 192;
  const itemGap = 36;
  for (let i = 0; i < 3; i++) {
    const item = suggestions[i] || {
      title: `Benzer Şarkı Önerisi ${i + 1}`,
      artist: artist || platformName
    };

    const curY = listStartY + (i * itemGap);
    const circleX = rightX + 8;
    const circleY = curY + 11;
    const circleR = 9;

    ctx.save();
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.fillStyle = accentColor === '#1ED760' ? '#000000' : '#ffffff';
    ctx.font = 'bold 10px Segoe UI, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((i + 1).toString(), circleX, circleY);
    ctx.restore();

    const textStartX = rightX + 26;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 12px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(truncateText(ctx, item.title, rightWidth - 30), textStartX, curY);

    ctx.font = '11px Segoe UI, Arial, sans-serif';
    ctx.fillStyle = '#8c8e96';
    ctx.fillText(truncateText(ctx, item.artist, rightWidth - 30), textStartX, curY + 16);
  }

  return canvas.toBuffer('image/png');
}

module.exports = { renderPlayerCard, formatTime };
