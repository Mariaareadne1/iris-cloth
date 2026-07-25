import { HoloApp, type HoloParams } from './scene.ts';

/**
 * Standalone "header" build of Iris — no DialKit panel, no React.
 * Boots the cloth engine directly, drapes Maria's portrait onto a WHITE fabric
 * as its printed surface, opens flat & still, and exposes a palette panel that
 * recolors both the holographic sheen and the page accent. Background is a
 * fixed bright white.
 */

interface Palette {
  name: string;
  sub: string;
  holo: [string, string, string]; // three-stop holographic ramp
  accent: string;                  // page/accent colour this palette themes
  intensity: number;               // holo sheen strength (B&W stays subtle/white)
}

// Default is Black & White (blends with the real site header); the colour
// palettes live behind the "prefer it in colour?" toggle.
const PALETTES: Palette[] = [
  { name: 'Black & White', sub: 'mono · silver', holo: ['#fbfbfc', '#e2e4ea', '#b9bec9'], accent: '#0044ff', intensity: 0.42 },
  { name: 'Sunset', sub: 'orange · blue', holo: ['#0044ff', '#ff7a1a', '#ffd24d'], accent: '#ff6a00', intensity: 1.15 },
  { name: 'Ice',    sub: 'cyan',          holo: ['#0aa3ff', '#22c1ff', '#cfeaff'], accent: '#0aa3ff', intensity: 1.1 },
  { name: 'Gold',   sub: 'gold · blue',   holo: ['#0044ff', '#ffcf4d', '#fff2c2'], accent: '#d99a00', intensity: 1.15 },
  { name: 'Ember',  sub: 'red · orange',  holo: ['#ff3b3b', '#ff7a1a', '#ffd24d'], accent: '#ff4d2e', intensity: 1.2 },
];

// The knobs offered under "Play with" — keep the one or two you like.
interface Knob {
  id: string;
  label: string;
  min: number; max: number; step: number; value: number;
  apply: (v: number) => void;
}

const host = document.getElementById('hero-host')!;
const app = new HoloApp(host);

// WHITE fabric; the portrait is the printed surface, the palette is the sheen.
const params: HoloParams = {
  performance: 'High',
  physics: { viscosity: 0.6, stiffness: 1, iterations: 14, smoothing: 0.045, grabRadius: 0.3 },
  material: {
    preset: 'Holo',
    finish: 'Glossy',
    baseColor: '#fbfbfc',
    holoIntensity: 0.42,
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
    exposure: 1.15,      // lifts the white so the background is genuinely bright
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

const KNOBS: Knob[] = [
  { id: 'shimmer', label: 'Shimmer', min: 0, max: 3, step: 0.05, value: params.material.holoIntensity,
    apply: (v) => { params.material.holoIntensity = v; app.applyParams(params); } },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** Apply a brand palette: recolor the cloth sheen AND the page accent. */
function applyPalette(pal: Palette) {
  params.material.paletteMix = 1;
  params.material.palette = pal.holo;
  params.material.holoIntensity = pal.intensity;
  app.applyParams(params);
  document.documentElement.style.setProperty('--blue', pal.accent);
  const sh = document.getElementById('shimmer') as HTMLInputElement | null;
  if (sh) sh.value = String(pal.intensity);
  document.querySelectorAll<HTMLElement>('.pal').forEach((el) =>
    el.classList.toggle('active', el.dataset.name === pal.name),
  );
  // when embedded (iframe), let the host page re-theme itself to match
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'iris-palette', name: pal.name, accent: pal.accent, holo: pal.holo }, '*');
  }
}

function buildPanel() {
  const list = document.getElementById('pal-list');
  if (list) {
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

  const knobs = document.getElementById('knob-list');
  if (knobs) {
    for (const k of KNOBS) {
      const row = document.createElement('div');
      row.className = 'knob';
      row.innerHTML =
        `<label>${k.label}</label>` +
        `<input type="range" id="${k.id}" min="${k.min}" max="${k.max}" step="${k.step}" value="${k.value}" />`;
      knobs.appendChild(row);
      const input = row.querySelector('input')!;
      input.addEventListener('input', () => k.apply(Number(input.value)));
    }
  }

  // always-visible reset (no need to open the colour panel)
  document.getElementById('reset-main')?.addEventListener('click', () => app.flattenCloth());

  // change the portrait live from the user's own file
  const photoInput = document.getElementById('photo-input') as HTMLInputElement | null;
  document.getElementById('change-photo')?.addEventListener('click', () => photoInput?.click());
  photoInput?.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      app.setClothImage(img);
      app.flattenCloth();
      app.applyParams(params);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  // colour panel stays hidden until invited; default look is Black & White
  const panel = document.getElementById('panel');
  const toggle = document.getElementById('color-toggle');
  toggle?.addEventListener('click', () => { panel?.classList.add('open'); toggle.classList.add('hidden'); });
  document.getElementById('panel-close')?.addEventListener('click', () => {
    panel?.classList.remove('open');
    toggle?.classList.remove('hidden');
  });

  applyPalette(PALETTES[0]);
}

/** Embed mode (?bare): hide the hero's own overlay/controls so it can be
 *  dropped inside another page (e.g. an iframe) as just the living cloth. */
function applyBareMode() {
  if (!new URLSearchParams(location.search).has('bare')) return;
  // hide only the kicker/sub caption; keep the control cluster (reset,
  // prefer-colour) and the colour panel (which stays hidden until invited)
  document.querySelectorAll<HTMLElement>('.overlay')
    .forEach((el) => { el.style.display = 'none'; });
}

async function boot() {
  app.applyParams(params);
  // drape the portrait; if it fails to load, the cloth stays a blank sheet
  try {
    const portrait = await loadImage('/portrait.png');
    app.setClothImage(portrait);
  } catch {
    /* no image — leave the plain holographic sheet */
  }
  app.flattenCloth();        // open flat & still
  app.applyParams(params);   // re-apply uniforms after the cloth rebuild
  app.reveal();
  buildPanel();
  applyBareMode();
}

boot();
