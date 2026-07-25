import { HoloApp, type HoloParams } from './scene.ts';

/**
 * Standalone "header" build of Iris — no DialKit panel, no React.
 * Boots the cloth engine directly, drapes Maria's name onto a WHITE fabric as
 * its printed surface, opens flat & still, and exposes a small palette panel
 * that recolors both the holographic sheen and the page accent.
 */

interface Palette {
  name: string;
  sub: string;
  /** three-stop holographic ramp on the cloth */
  holo: [string, string, string];
  /** page + accent colour this palette themes the site with */
  accent: string;
}

const PALETTES: Palette[] = [
  { name: 'Iris',   sub: 'blue · violet',    holo: ['#0044ff', '#6a4bff', '#22c1ff'], accent: '#0044ff' },
  { name: 'Sunset', sub: 'orange · blue',    holo: ['#0044ff', '#ff7a1a', '#ffd24d'], accent: '#ff6a00' },
  { name: 'Ice',    sub: 'cyan',             holo: ['#0aa3ff', '#22c1ff', '#cfeaff'], accent: '#0aa3ff' },
  { name: 'Rose',   sub: 'magenta · blue',   holo: ['#0044ff', '#ff4dc4', '#8a5cff'], accent: '#e0359a' },
];

const host = document.getElementById('hero-host')!;
const app = new HoloApp(host);

// WHITE fabric with a holographic sheen from the brand palette. The name is
// printed in the site's own blue + black, which reads cleanly on white.
const params: HoloParams = {
  performance: 'High',
  physics: { viscosity: 0.6, stiffness: 1, iterations: 14, smoothing: 0.045, grabRadius: 0.3 },
  material: {
    preset: 'Holo',            // coolLock off; the palette drives colour
    finish: 'Glossy',
    baseColor: '#eef1fb',      // near-white cloth
    holoIntensity: 1.7,
    holoScale: 300,
    bandFreq: 0.9,
    saturation: 0.95,
    hueShift: 0.0,
    sparkle: 0.45,
    specTint: 0.5,
    iridescence: 0.7,
    roughness: 0.34,
    metalness: 0.55,
    clearcoat: 1.0,
    coatRoughness: 0.12,
    sheen: 0.35,
    bump: 1.4,
    bumpTiling: 3,
    paletteMix: 1,
    palette: PALETTES[0].holo,
  },
  images: { edit: false, useImage: true, scale: 1, rotation: 0, opacity: 1, cornerRadius: 0 },
  render: {
    background: '#ffffff',
    exposure: 1.15,
    environment: 0.9,
    bloom: 0.06,
    bloomThreshold: 1.35,
    noise: 0,
    toneMapping: 'Neutral',
    occlusion: true,
    occlusionStrength: 1,
    dof: false,
    dofAperture: 40,
    dofBlur: 0.04,
    dofRange: 0.3,
  },
};

/**
 * Render the site's intro lockup onto a transparent canvas → the cloth print.
 * Matches maria-showalter/index.html: "MARIA" Fraunces blue over "Showalter"
 * Fraunces italic black — legible because the fabric is white.
 */
async function makeNameTexture(): Promise<HTMLImageElement> {
  try {
    await (document as unknown as { fonts: FontFaceSet }).fonts.load("600 150px 'Fraunces'");
    await (document as unknown as { fonts: FontFaceSet }).fonts.load("italic 400 150px 'Fraunces'");
    await (document as unknown as { fonts: FontFaceSet }).fonts.ready;
  } catch {
    /* fall back to serif */
  }
  const w = 1200, h = 900;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0044ff'; // MARIA — site blue
  ctx.font = "600 300px 'Fraunces', Georgia, serif";
  ctx.fillText('MARIA', w / 2, h * 0.35);
  ctx.fillStyle = '#0a0a0a'; // Showalter — site ink black, italic
  ctx.font = "italic 400 210px 'Fraunces', Georgia, serif";
  ctx.fillText('Showalter', w / 2, h * 0.66);
  const img = new Image();
  await new Promise<void>((res) => { img.onload = () => res(); img.src = cv.toDataURL('image/png'); });
  return img;
}

function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function setBackground(btn: HTMLElement) {
  const hex = btn.dataset.bg!;
  const noise = btn.dataset.noise !== undefined ? Number(btn.dataset.noise) : 0.12;
  const exposure = btn.dataset.exposure !== undefined ? Number(btn.dataset.exposure) : 0.62;
  params.render.background = hex;
  params.render.noise = noise;
  params.render.exposure = exposure;
  app.applyParams(params);
  document.body.style.background = hex;
  const dark = isDark(hex);
  document.documentElement.style.setProperty('--ink', dark ? '#f8f6f3' : '#0a0a0a');
  document.querySelectorAll<HTMLElement>('.dark-aware').forEach((el) => el.classList.toggle('dark', dark));
  document.querySelectorAll<HTMLElement>('.sw').forEach((el) => el.classList.toggle('active', el === btn));
}

/** Apply a brand palette: recolor the cloth sheen AND the page accent. */
function applyPalette(pal: Palette) {
  params.material.paletteMix = 1;
  params.material.palette = pal.holo;
  app.applyParams(params);
  document.documentElement.style.setProperty('--blue', pal.accent);
  document.querySelectorAll<HTMLElement>('.pal').forEach((el) =>
    el.classList.toggle('active', el.dataset.name === pal.name),
  );
}

function buildPalettePanel() {
  const list = document.getElementById('pal-list');
  if (!list) return;
  for (const pal of PALETTES) {
    const btn = document.createElement('button');
    btn.className = 'pal';
    btn.dataset.name = pal.name;
    btn.innerHTML =
      `<span class="pal-chip" style="background:linear-gradient(120deg,${pal.holo[0]},${pal.holo[1]},${pal.holo[2]})"></span>` +
      `<span class="pal-text"><b>${pal.name}</b><small>${pal.sub}</small></span>`;
    btn.addEventListener('click', () => applyPalette(pal));
    list.appendChild(btn);
  }
}

function wireControls() {
  document.querySelectorAll<HTMLButtonElement>('.sw').forEach((btn) => {
    btn.addEventListener('click', () => setBackground(btn));
  });
  document.getElementById('reset')?.addEventListener('click', () => {
    app.flattenCloth();
  });
  const shimmer = document.getElementById('shimmer') as HTMLInputElement | null;
  shimmer?.addEventListener('input', () => {
    params.material.holoIntensity = Number(shimmer.value);
    app.applyParams(params);
  });
  buildPalettePanel();
  applyPalette(PALETTES[0]);
  const paper = document.querySelector<HTMLElement>('.sw[data-paper]');
  if (paper) setBackground(paper);
}

async function boot() {
  app.applyParams(params);
  const nameImg = await makeNameTexture();
  app.setClothImage(nameImg);
  app.flattenCloth();        // open flat & still
  app.applyParams(params);   // re-apply uniforms after the cloth rebuild
  app.reveal();
  wireControls();
}

boot();
