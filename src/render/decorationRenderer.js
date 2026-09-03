// Decoração do mapa (árvore, planta, casa, fogueira, baú).
//
// Arte PROCEDURAL (render/terrain/decorTextures.js), no mesmo estilo e na
// mesma direção de luz do terreno — ver render/tileRenderer.js pro porquê de
// não vir de pack. Só a fogueira continua vindo de arquivo (`Fogueira.png`,
// que sobreviveu à limpeza de arte).
//
// O tamanho na tela sai da própria altura da textura vezes DECOR_ART_SCALE,
// em vez de um número por tipo escrito à mão: assim a densidade de pixel da
// decoração bate com a dos personagens e do terreno automaticamente, e
// mexer no tamanho de uma árvore é mexer na arte dela, não numa tabela
// paralela que precisa ser mantida em sincronia.
//
// `world.decorations` (world/decorations.js) não muda: cada entrada só tem
// { type, x, y }, então a variante de espécie é escolhida na hora do
// desenho, determinística pela posição — mesma decoração sempre cai na mesma
// variante entre frames, sem precisar guardar isso nos dados.
//
// A fauna (que já foi decoração parada aqui) virou predador de verdade — ver
// render/predatorRenderer.js. Não existe mais como tipo de decoração aqui.

import { buildDecorTextures, DECOR_ART_SCALE } from './terrain/decorTextures.js';

const SPRITE_DIR = 'assets/sprites';

const VARIANTS_BY_TYPE = {
  tree: ['ArvoreComum', 'Pinheiro', 'ArvoreAzulada'],
  plant: ['Arbusto', 'Sebe'],
  chest: ['Bau'],
  house: ['Casa'],
};

let textures = null;

// Fogueira é o único arquivo que sobrou aqui — tem padding em volta, então
// precisa do recorte por alpha que o resto do jogo já usa.
const campfireSprite = new Image();
campfireSprite.src = `${SPRITE_DIR}/Fogueira.png`;
let campfireBounds = null;
const CAMPFIRE_SIZE = 14; // px de tela em zoom 1

function isSpriteReady(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

function computeContentBounds(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 10) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return { x: 0, y: 0, w: canvas.width, h: canvas.height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

campfireSprite.onload = () => {
  campfireBounds = computeContentBounds(campfireSprite);
};

// Hash determinístico pela posição de mundo — não consome rng de lugar
// nenhum, só distribui as variantes entre as decorações de forma estável.
function pickVariant(list, x, y) {
  const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  return list[Math.floor(h * list.length) % list.length];
}

// Brilho pulsante atrás da fogueira — `performance.now()` (não
// `world.elapsedSeconds`) de propósito: é feedback visual de ambiente, deve
// continuar pulsando com o jogo pausado, mesmo espírito do easing de câmera.
const GLOW_PULSE_MS = 900;
function drawCampfireGlow(ctx, x, y, size) {
  const pulse = (Math.sin(performance.now() / GLOW_PULSE_MS) + 1) / 2; // 0..1
  const radius = size * (0.9 + pulse * 0.25);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255, 160, 60, ${0.35 + pulse * 0.15})`);
  gradient.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawShadow(ctx, x, y, width) {
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, width / 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fill();
}

// Planta/fogueira/baú são baixos demais pra sombra própria valer a pena.
const SHADOW_BY_TYPE = { tree: true, house: true };

export function drawDecorations(ctx, world, camera) {
  if (!world.decorations?.length) return;
  if (!textures) textures = buildDecorTextures();

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const topLeft = camera.screenToWorld(0, 0, viewW, viewH);
  const bottomRight = camera.screenToWorld(viewW, viewH, viewW, viewH);
  const margin = 64;
  ctx.imageSmoothingEnabled = false;

  for (const deco of world.decorations) {
    if (
      deco.x < topLeft.x - margin ||
      deco.x > bottomRight.x + margin ||
      deco.y < topLeft.y - margin ||
      deco.y > bottomRight.y + margin
    ) {
      continue;
    }

    const pos = camera.worldToScreen(deco.x, deco.y, viewW, viewH);

    if (deco.type === 'campfire') {
      drawCampfireGlow(ctx, pos.x, pos.y, CAMPFIRE_SIZE * camera.zoom);
      if (campfireBounds) {
        const h = CAMPFIRE_SIZE * camera.zoom;
        const w = h * (campfireBounds.w / campfireBounds.h);
        ctx.drawImage(
          campfireSprite,
          campfireBounds.x, campfireBounds.y, campfireBounds.w, campfireBounds.h,
          pos.x - w / 2, pos.y - h, w, h,
        );
      }
      continue;
    }

    const variants = VARIANTS_BY_TYPE[deco.type];
    const texture = variants ? textures[pickVariant(variants, deco.x, deco.y)] : null;
    if (!texture) continue;

    const h = texture.height * DECOR_ART_SCALE * camera.zoom;
    const w = texture.width * DECOR_ART_SCALE * camera.zoom;

    if (SHADOW_BY_TYPE[deco.type]) drawShadow(ctx, pos.x, pos.y, w * 0.8);

    ctx.drawImage(texture, pos.x - w / 2, pos.y - h, w, h);
  }
}
