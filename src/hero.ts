import { HoloApp, type HoloParams } from './scene.ts';

/**
 * Standalone "header" build of Iris — no control panel, no React.
 * Boots the holographic cloth engine directly, drapes Maria's name onto the
 * fabric as its printed surface, and locks the palette to the site's blue.
 * This page is what can be embedded (iframe) as the site's hero.
 */

const host = document.getElementById('hero-host')!;
const app = new HoloApp(host);

// Iris Blue material on a white background — cool-lock engages because the
// preset name matches the blue set (see scene.ts applyParams).
const params: HoloParams = {
  performance: 'High',
  physics: { viscosity: 0.6, stiffness: 1, iterations: 14, smoothing: 0.045, grabRadius: 0.3 },
  material: {
    preset: 'Iris Blue',
    finish: 'Glossy',
    baseColor: '#0a2bd6',
    holoIntensity: 2.4,
    holoScale: 300,
    bandFreq: 0.9,
    saturation: 0.9,
    hueShift: 0.6,
    sparkle: 0.5,
    specTint: 0.6,
    iridescence: 0.8,
    roughness: 0.12,
    metalness: 1.0,
    clearcoat: 1.0,
    coatRoughness: 0.08,
    sheen: 0.12,
    bump: 2.0,
    bumpTiling: 3,
  },
  images: { edit: false, useImage: true, scale: 1, rotation: 0, opacity: 1, cornerRadius: 0 },
  render: {
    background: '#ffffff',
    exposure: 0.62,
    environment: 0.9,
    bloom: 0.08,
    bloomThreshold: 1.3,
    noise: 0.12,
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
 * Matches maria-showalter/index.html: "MARIA" in Fraunces blue over
 * "Showalter" in Fraunces italic black.
 */
async function makeNameTexture(): Promise<HTMLImageElement> {
  try {
    await (document as unknown as { fonts: FontFaceSet }).fonts.load("600 150px 'Fraunces'");
    await (document as unknown as { fonts: FontFaceSet }).fonts.load("italic 400 150px 'Fraunces'");
    await (document as unknown as { fonts: FontFaceSet }).fonts.ready;
  } catch {
    /* fall back to serif */
  }
  // squarer canvas → the cloth spreads (like the original demo) instead of
  // wadding into a thin ribbon, so the print stays readable as it ripples
  const w = 1200, h = 900;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // white ink reads cleanly over the electric-blue holo — keeps the site's
  // Fraunces lockup (MARIA semibold over Showalter italic), just legible
  ctx.fillStyle = '#ffffff';
  ctx.font = "600 300px 'Fraunces', Georgia, serif";
  ctx.fillText('MARIA', w / 2, h * 0.35);
  ctx.font = "italic 400 210px 'Fraunces', Georgia, serif";
  ctx.fillText('Showalter', w / 2, h * 0.66);
  const img = new Image();
  await new Promise<void>((res) => { img.onload = () => res(); img.src = cv.toDataURL('image/png'); });
  return img;
}

/** Wire the background swatches + reset button in hero.html. */
function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

function setBackground(btn: HTMLElement) {
  const hex = btn.dataset.bg!;
  // per-swatch film grain: the "paper" swatch renders grain-free for a clean
  // bright white; the others keep a touch of grain (nice on dark backgrounds)
  const noise = btn.dataset.noise !== undefined ? Number(btn.dataset.noise) : 0.12;
  // tone mapping darkens the clear color, so a "white" bg renders gray unless
  // we lift exposure; the paper swatch pushes it to a genuinely bright white
  const exposure = btn.dataset.exposure !== undefined ? Number(btn.dataset.exposure) : 0.62;
  params.render.background = hex;
  params.render.noise = noise;
  params.render.exposure = exposure;
  app.applyParams(params);
  document.body.style.background = hex;
  // keep overlay + control chrome legible on any background
  const dark = isDark(hex);
  document.documentElement.style.setProperty('--ink', dark ? '#f8f6f3' : '#0a0a0a');
  document.getElementById('controls')?.classList.toggle('dark', dark);
  document.querySelectorAll<HTMLElement>('.sw').forEach((el) => el.classList.toggle('active', el === btn));
}

function wireControls() {
  document.querySelectorAll<HTMLButtonElement>('.sw').forEach((btn) => {
    btn.addEventListener('click', () => setBackground(btn));
  });
  document.getElementById('reset')?.addEventListener('click', () => app.resetCloth());
  // default to the clean "paper" white
  const paper = document.querySelector<HTMLElement>('.sw[data-paper]');
  if (paper) setBackground(paper);
}

async function boot() {
  app.applyParams(params);
  const nameImg = await makeNameTexture();
  app.setClothImage(nameImg);
  app.applyParams(params); // re-apply after cloth rebuild so uniforms stick
  app.reveal();
  wireControls();
}

boot();
