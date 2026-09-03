// Geração procedural das texturas de terreno. Roda uma vez no carregamento e
// devolve canvases prontos; o laço de render nunca desenha pixel a pixel.
//
// Por que procedural e não arte de pack: nenhum dos packs baixados tem tile
// no estilo do resto do jogo — o único tileset disponível (Kenney) é chapado
// e saturado, exatamente o "muito cartoon" que se queria eliminar. Gerar dá
// controle total sobre paleta e direção de luz, e sai de graça em bytes.
//
// Resolução de autoria: 16x16, desenhado na tela em TILE_SIZE (32) com
// `imageSmoothingEnabled = false` — ou seja, cada pixel da textura vira 2
// pixels de tela em zoom 1. Isso é deliberado: os personagens têm ~20px de
// arte desenhados a ART_SCALE 2.1, então autorar o terreno a 32px nativo
// deixaria o chão com pixels na metade do tamanho dos dos personagens, e a
// mistura de densidades é o que faz um jogo parecer colado de fontes
// diferentes.

import { hash2, rngAt, fbm } from './noise.js';
import { TERRAIN_PALETTE } from './palette.js';

export const SRC = 16; // px de autoria por tile
// 6 variantes por tipo: com 4, uma cadeia de montanha grande deixava a
// repetição visível como padrão de alvenaria. O custo é 6 canvases de
// 16x16 por tipo — irrelevante.
export const VARIANTS = 6;

function makeCanvas(size = SRC) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Fundo mosqueado: ruído de valor escolhendo entre os tons da rampa. É a
// camada que tira o "cor chapada" de qualquer tipo de terreno.
function paintMottle(ctx, palette, { seed, scale = 0.35, spread = 1, stretchX = 1, stretchY = 1 }) {
  const { ramp } = palette;
  for (let y = 0; y < SRC; y++) {
    for (let x = 0; x < SRC; x++) {
      const n = fbm(x * scale * stretchX, y * scale * stretchY, { octaves: 2, seed });
      // Centraliza em torno do meio da rampa e abre conforme `spread`.
      const t = 0.5 + (n - 0.5) * spread;
      const idx = Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))));
      px(ctx, x, y, ramp[idx]);
    }
  }
}

// Tufos de grama: traço vertical de 2px com um pixel claro no topo-esquerda,
// que é de onde vem a luz. Poucos e espalhados — grama coberta de tufos vira
// textura de tapete.
function paintGrass(ctx, palette, seed) {
  // Granulação fina de propósito: com `scale` baixo o ruído vira bolhas
  // arredondadas e a grama lê como plástico-bolha. Frequência mais alta dá
  // grão de vegetação.
  paintMottle(ctx, palette, { seed, scale: 0.85, spread: 0.75 });
  const rnd = rngAt(seed, 17, 3);
  const tufts = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < tufts; i++) {
    const x = Math.floor(rnd() * SRC);
    const y = Math.floor(rnd() * (SRC - 2));
    px(ctx, x, y + 1, palette.shadow);
    px(ctx, x, y, palette.light);
  }
  // Uma pedrinha ocasional, pra o campo não ficar uniforme demais.
  if (rnd() > 0.55) {
    const x = Math.floor(rnd() * (SRC - 2));
    const y = Math.floor(rnd() * (SRC - 2));
    px(ctx, x, y + 1, '#5a5f55', 2, 1);
    px(ctx, x, y, '#818778', 2, 1);
  }
}

// Copa vista de cima: bolhas sobrepostas com aro claro em cima-esquerda e
// sombra embaixo-direita. É a sombra própria que faz ler como volume e não
// como mancha verde.
function paintForest(ctx, palette, seed) {
  paintMottle(ctx, palette, { seed, scale: 0.5, spread: 0.7 });
  const rnd = rngAt(seed, 91, 5);
  const blobs = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < blobs; i++) {
    const cx = 2 + rnd() * (SRC - 4);
    const cy = 2 + rnd() * (SRC - 4);
    const r = 2.2 + rnd() * 1.8;

    ctx.beginPath();
    ctx.arc(cx + 0.6, cy + 0.8, r, 0, Math.PI * 2);
    ctx.fillStyle = palette.shadow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = palette.ramp[3];
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - 0.5, cy - 0.6, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = palette.light;
    ctx.fill();
  }
}

// Areia: ondulações horizontais quebradas + seixos. As linhas seguem uma
// senoide deslocada por ruído, senão viram listras de papel de parede.
function paintSand(ctx, palette, seed) {
  paintMottle(ctx, palette, { seed, scale: 0.3, spread: 0.7 });
  const rnd = rngAt(seed, 41, 11);
  const lines = 2 + Math.floor(rnd() * 2);
  for (let i = 0; i < lines; i++) {
    const baseY = 2 + Math.floor(rnd() * (SRC - 4));
    for (let x = 0; x < SRC; x++) {
      const wobble = Math.round(Math.sin(x * 0.7 + i * 2.1) + (hash2(x, baseY + i, seed) - 0.5) * 1.6);
      const y = baseY + wobble;
      if (y < 0 || y >= SRC) continue;
      if (hash2(x, y, seed + 3) > 0.25) px(ctx, x, y, palette.ramp[1]);
    }
  }
  const pebbles = Math.floor(rnd() * 3);
  for (let i = 0; i < pebbles; i++) {
    const x = Math.floor(rnd() * (SRC - 2));
    const y = Math.floor(rnd() * (SRC - 2));
    px(ctx, x, y + 1, palette.shadow, 2, 1);
    px(ctx, x, y, palette.light, 2, 1);
  }
}

// Água: bandas horizontais suaves + poucos brilhos. `frame` desloca os
// brilhos pra animação lenta, sem redesenhar a base.
function paintWater(ctx, palette, seed, frame = 0) {
  // Ruído ALONGADO na horizontal e com amplitude curta. A primeira versão
  // usava ruído isotrópico com a rampa inteira, e a quantização em 5 tons
  // criava manchas angulares que liam como detrito boiando, não como
  // superfície de água. Água tem estrutura horizontal (a onda corre) e
  // pouquíssimo contraste — os dois juntos é o que a faz parecer líquido.
  paintMottle(ctx, palette, { seed, scale: 0.5, spread: 0.35, stretchX: 0.3, stretchY: 1.6 });
  const rnd = rngAt(seed, 7, 23);
  // Brilhos: traços horizontais curtos, poucos e sem o pixel claro solto em
  // cima que a primeira versão tinha — aquilo lia como sujeira/marquinha
  // flutuando, não como luz na superfície. Reflexo de água é horizontal.
  const glints = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < glints; i++) {
    const x = Math.floor(rnd() * (SRC - 5));
    const y = (Math.floor(rnd() * SRC) + frame * 4) % SRC;
    const len = 3 + Math.floor(rnd() * 2);
    px(ctx, x, y, palette.ramp[4], len, 1);
  }
}

// Rocha: facetas angulares com luz consistente + fissuras. As facetas são
// triângulos irregulares, não círculos — pedra tem quina, e é isso que a
// distingue de terra ou de copa de árvore de relance.
function paintMountain(ctx, palette, seed) {
  paintMottle(ctx, palette, { seed, scale: 0.45, spread: 1 });
  const rnd = rngAt(seed, 55, 29);
  const facets = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < facets; i++) {
    const cx = rnd() * SRC;
    const cy = rnd() * SRC;
    const r = 3 + rnd() * 4;
    const pts = [];
    const corners = 3 + Math.floor(rnd() * 2);
    for (let k = 0; k < corners; k++) {
      const a = (k / corners) * Math.PI * 2 + rnd() * 0.8;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = rnd() > 0.5 ? palette.ramp[3] : palette.ramp[1];
    ctx.fill();
    // Aresta iluminada só no lado voltado pra luz (cima-esquerda).
    ctx.strokeStyle = palette.light;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.stroke();
  }
  // Fissuras
  const cracks = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < cracks; i++) {
    let x = Math.floor(rnd() * SRC);
    let y = Math.floor(rnd() * SRC);
    const steps = 3 + Math.floor(rnd() * 4);
    for (let s = 0; s < steps; s++) {
      px(ctx, x, y, palette.shadow);
      x += rnd() > 0.5 ? 1 : 0;
      y += rnd() > 0.35 ? 1 : -1;
      if (x >= SRC || y < 0 || y >= SRC) break;
    }
  }
}

const PAINTERS = {
  grass: paintGrass,
  forest: paintForest,
  sand: paintSand,
  mountain: paintMountain,
};

export const WATER_FRAMES = 3;

// Constrói todas as variantes de todos os tipos. Água tem WATER_FRAMES
// quadros por variante (ondulação lenta); o resto é estático.
export function buildTerrainTextures() {
  const textures = {}; // type -> canvas[] (água: canvas[variant][frame] achatado)

  for (const [type, palette] of Object.entries(TERRAIN_PALETTE)) {
    const list = [];
    if (type === 'water') {
      for (let v = 0; v < VARIANTS; v++) {
        const frames = [];
        for (let f = 0; f < WATER_FRAMES; f++) {
          const canvas = makeCanvas();
          paintWater(canvas.getContext('2d'), palette, v * 101 + 7, f);
          frames.push(canvas);
        }
        list.push(frames);
      }
    } else {
      const paint = PAINTERS[type];
      for (let v = 0; v < VARIANTS; v++) {
        const canvas = makeCanvas();
        paint(canvas.getContext('2d'), palette, v * 101 + 7);
        list.push(canvas);
      }
    }
    textures[type] = list;
  }

  return textures;
}
