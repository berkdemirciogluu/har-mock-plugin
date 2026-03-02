#!/usr/bin/env node
// HAR Mock Plugin — Icon Generator
// Tasarım: Koyu teal arka plan, HAR dosya gövdesi, HTTP log çizgileri, replay oku
// Konsept: HAR dosyası yakalama ve tekrar oynatma (mock)

const sharp = require('sharp');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'packages', 'extension', 'public');

function createIconSvg(size) {
  const s = size;
  const cr = Math.round(s * 0.2); // köşe yuvarlama

  // Dosya gövdesi boyutları (ortalanmış)
  const docW = s * 0.54;
  const docH = s * 0.62;
  const docX = (s - docW) / 2;
  const docY = s * 0.14;
  const docR = s * 0.07;
  const fold = s * 0.15; // kıvrık köşe boyutu

  // Log çizgileri (3 adet, ortada)
  const lineX1 = docX + docW * 0.17;
  const lineX2req = docX + docW * 0.72; // request: kısa (→)
  const lineX2res = docX + docW * 0.58; // response: daha kısa (←)
  const lineX2mid = docX + docW * 0.65; // orta satır
  const lineY1 = docY + docH * 0.33;
  const lineY2 = docY + docH * 0.52;
  const lineY3 = docY + docH * 0.71;
  const lw = Math.max(s * 0.055, 1); // çizgi kalınlığı
  const dotR = s * 0.045; // ok başı nokta

  // Replay dairesi (sağ alt köşede, döngü oku)
  const rcx = s * 0.725;
  const rcy = s * 0.755;
  const rr = s * 0.165;
  const rsw = Math.max(s * 0.065, 1);

  // Replay ok ucu (dairedeki kesik noktada küçük üçgen)
  const arrowAngle = (-20 * Math.PI) / 180;
  const ax = (rcx + rr * Math.cos(arrowAngle)).toFixed(2);
  const ay = (rcy + rr * Math.sin(arrowAngle)).toFixed(2);
  const arrowSize = s * 0.085;

  // Dosya kırpık köşe path: sol üst → sağ üst (fold öncesi) → fold → sağ alt → sol alt
  const docPath = [
    `M ${docX + docR} ${docY}`,
    `H ${docX + docW - fold}`,
    `L ${docX + docW} ${docY + fold}`,
    `V ${docY + docH - docR}`,
    `Q ${docX + docW} ${docY + docH} ${docX + docW - docR} ${docY + docH}`,
    `H ${docX + docR}`,
    `Q ${docX} ${docY + docH} ${docX} ${docY + docH - docR}`,
    `V ${docY + docR}`,
    `Q ${docX} ${docY} ${docX + docR} ${docY}`,
    `Z`,
  ].join(' ');

  // Kıvrık köşe üçgeni (fold detayı)
  const foldPath = [
    `M ${docX + docW - fold} ${docY}`,
    `L ${docX + docW - fold} ${docY + fold}`,
    `L ${docX + docW} ${docY + fold}`,
  ].join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#0f3460"/>
    </linearGradient>
    <linearGradient id="docFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0.07)"/>
    </linearGradient>
    <linearGradient id="replayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#5eead4"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>

  <!-- Arka plan -->
  <rect width="${s}" height="${s}" rx="${cr}" fill="url(#bg)"/>

  <!-- Dosya gövdesi (içi yarı saydam) -->
  <path d="${docPath}" fill="url(#docFill)" stroke="rgba(255,255,255,0.55)" stroke-width="${Math.max(s * 0.028, 1)}"/>

  <!-- Kıvrık köşe çizgisi -->
  <path d="${foldPath}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="${Math.max(s * 0.028, 1)}"/>

  <!-- Satır 1: REQUEST → (soldan sağa, ok ucu sağda) -->
  <line x1="${lineX1}" y1="${lineY1}" x2="${lineX2req}" y2="${lineY1}"
        stroke="rgba(255,255,255,0.90)" stroke-width="${lw}" stroke-linecap="round"/>
  <circle cx="${lineX2req}" cy="${lineY1}" r="${dotR}" fill="rgba(255,255,255,0.90)"/>

  <!-- Satır 2: RESPONSE ← (sağdan sola, ok ucu solda) -->
  <line x1="${lineX1}" y1="${lineY2}" x2="${lineX2res}" y2="${lineY2}"
        stroke="rgba(94,234,212,0.85)" stroke-width="${lw}" stroke-linecap="round"/>
  <circle cx="${lineX1}" cy="${lineY2}" r="${dotR}" fill="rgba(94,234,212,0.85)"/>

  <!-- Satır 3: soluk (daha kısa) -->
  <line x1="${lineX1}" y1="${lineY3}" x2="${lineX2mid}" y2="${lineY3}"
        stroke="rgba(255,255,255,0.40)" stroke-width="${lw}" stroke-linecap="round"/>

  <!-- Replay dairesi (sağ altta, teal) - yayın büyük kısmı -->
  <path d="M ${rcx} ${rcy - rr} A ${rr} ${rr} 0 1 1 ${ax} ${ay}"
        fill="none" stroke="url(#replayGrad)" stroke-width="${rsw}" stroke-linecap="round"/>

  <!-- Replay ok başı (küçük üçgen) -->
  <polygon points="${ax},${ay}
                   ${(parseFloat(ax) - arrowSize * 0.7).toFixed(2)},${(parseFloat(ay) - arrowSize).toFixed(2)}
                   ${(parseFloat(ax) + arrowSize * 0.55).toFixed(2)},${(parseFloat(ay) - arrowSize * 0.85).toFixed(2)}"
           fill="url(#replayGrad)"/>
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
