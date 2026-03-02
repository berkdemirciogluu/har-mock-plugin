#!/usr/bin/env node
// HAR Mock Plugin — Icon Generator
// Tasarım: Koyu indigo arka plan üzerine beyaz WiFi-tarzı yay + merkez nokta
// Konsept: Ağ trafiği yakalama ve tekrar oynatma

const sharp = require('sharp');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'extension', 'public');

function createIconSvg(size) {
  const cornerRadius = Math.round(size * 0.22);

  // WiFi yaylarının merkez noktası (aşağıda)
  const acx = size / 2;
  const acy = size * 0.7;

  // Yay yarıçapları
  const rSmall = size * 0.115;
  const rMedium = size * 0.245;
  const rLarge = size * 0.375;

  // Çizgi kalınlığı ve nokta yarıçapı
  const sw = Math.max(size * 0.075, 1);
  const dotR = size * 0.072;

  // Yay başlangıç/bitiş: -145° → -35° (yukarı açılan kavis)
  function arcPath(radius) {
    const a1 = (-145 * Math.PI) / 180;
    const a2 = (-35 * Math.PI) / 180;
    const x1 = (acx + radius * Math.cos(a1)).toFixed(3);
    const y1 = (acy + radius * Math.sin(a1)).toFixed(3);
    const x2 = (acx + radius * Math.cos(a2)).toFixed(3);
    const y2 = (acy + radius * Math.sin(a2)).toFixed(3);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#4338ca"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#a5b4fc"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>

  <!-- Arka plan -->
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>

  <!-- Büyük yay (soluk) -->
  <path d="${arcPath(rLarge)}"
        stroke="white" stroke-width="${sw}" fill="none"
        stroke-linecap="round" opacity="0.35"/>

  <!-- Orta yay -->
  <path d="${arcPath(rMedium)}"
        stroke="white" stroke-width="${sw}" fill="none"
        stroke-linecap="round" opacity="0.65"/>

  <!-- Küçük yay (tam opak) -->
  <path d="${arcPath(rSmall)}"
        stroke="white" stroke-width="${sw}" fill="none"
        stroke-linecap="round"/>

  <!-- Merkez nokta (vurgu rengi) -->
  <circle cx="${acx}" cy="${acy}" r="${dotR}" fill="url(#accent)"/>
</svg>`;
}

async function generateIcons() {
  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const svg = createIconSvg(size);
    const output = path.join(OUTPUT_DIR, `icon-${size}.png`);

    await sharp(Buffer.from(svg)).png().toFile(output);
    console.log(`✓ icon-${size}.png oluşturuldu`);
  }

  console.log('\n✅ Tüm ikonlar hazır →', OUTPUT_DIR);
}

generateIcons().catch((err) => {
  console.error('❌ Hata:', err.message);
  process.exit(1);
});
