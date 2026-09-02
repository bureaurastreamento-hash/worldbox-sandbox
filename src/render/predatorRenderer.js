// Desenha os predadores (predator/predatorAI.js) — pose parada/andando
// (mesmo sprite, sem ciclo de quadros) durante patrolling/chasing/fleeing, e
// uma pose de ataque dedicada durante `attacking`. Mesmo padrão de
// recorte-por-alpha de agentRenderer.js/decorationRenderer.js.
//
// Arte: Tiny RPG Character Asset Pack 02 (mesma família do Cavaleiro/Orc),
// variantes SEM sombra do pack — o jogo desenha a própria elipse em
// drawShadow. Um quadro estático por estado, recortado à mão do spritesheet:
//   Demonio            = Demon_A_Idle, quadro 0
//   DemonioAtacando    = Demon_A_Attack02, quadro 2 (espada erguida, sem o
//                        rastro branco dos quadros seguintes, que congelado
//                        vira um borrão)
//   MonstroSangue      = Blood Monster_A_Idle, quadro 0
//   MonstroSangueAtacando = Blood Monster_A_Attack01, quadro 3 (garra no alto,
//                        mesmo critério: antes do rastro branco)
// O pack tem Idle/Walk/Attack01/Attack02/Hurt/Death completos em 100x100 —
// animar de verdade é possível e continua na mesa, só não foi feito aqui.

import { PREDATOR_SPECIES_STATS } from '../utils/constants.js';

const SPRITE_DIR = 'assets/sprites';

const IDLE_FILE = { demon: 'Demonio', blood: 'MonstroSangue' };
const ATTACK_FILE = { demon: 'DemonioAtacando', blood: 'MonstroSangueAtacando' };

const sprites = {}; // key -> Image
for (const [species, file] of Object.entries(IDLE_FILE)) {
  const img = new Image();
  img.src = `${SPRITE_DIR}/${file}.png`;
  sprites[species] = img;
}
for (const [species, file] of Object.entries(ATTACK_FILE)) {
  const img = new Image();
  img.src = `${SPRITE_DIR}/${file}.png`;
  sprites[`${species}Attack`] = img;
}

const spriteBounds = new Map(); // Image -> { x, y, w, h }

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

Object.values(sprites).forEach((img) => {
  img.onload = () => spriteBounds.set(img, computeContentBounds(img));
});

const BASE_HEIGHT = 28; // px de tela em zoom 1 — entre plant (12) e tree (26)/agente adulto (44)
const HIT_FLASH_SECONDS = 0.15; // mesmo valor de render/agentRenderer.js

function drawPlaceholder(ctx, x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#8a3b2b';
  ctx.fill();
}

function drawShadow(ctx, x, y, width) {
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, width / 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fill();
}

export function drawPredators(ctx, world, camera) {
  if (!world.predators?.length) return;

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const now = world.elapsedSeconds ?? 0;
  ctx.imageSmoothingEnabled = false;

  for (const predator of world.predators) {
    if (!predator.alive) continue;

    const pos = camera.worldToScreen(predator.position.x, predator.position.y, viewW, viewH);
    // renderScale preserva a proporção relativa entre espécies: o recorte por
    // alpha sozinho normalizaria o monstro de sangue (rasteiro, 15px de
    // conteúdo) pra mesma altura do demônio em pé (20px).
    const scale = PREDATOR_SPECIES_STATS[predator.species]?.renderScale ?? 1;
    const size = BASE_HEIGHT * scale * camera.zoom;
    drawShadow(ctx, pos.x, pos.y, size * 0.6);

    const key = predator.state === 'attacking' ? `${predator.species}Attack` : predator.species;
    const sprite = sprites[key];
    const bounds = isSpriteReady(sprite) ? spriteBounds.get(sprite) : null;
    const flashing = predator.hitFlashAt != null && now - predator.hitFlashAt < HIT_FLASH_SECONDS;

    if (!bounds) {
      drawPlaceholder(ctx, pos.x, pos.y, size);
      continue;
    }

    const h = size;
    const w = h * (bounds.w / bounds.h);
    ctx.drawImage(sprite, bounds.x, bounds.y, bounds.w, bounds.h, pos.x - w / 2, pos.y - h, w, h);
    if (flashing) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255, 40, 40, 0.55)';
      ctx.fillRect(pos.x - w / 2, pos.y - h, w, h);
      ctx.restore();
    }
  }
}
