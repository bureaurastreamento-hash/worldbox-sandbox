// Máscaras de borda irregular para as transições entre tipos de terreno.
//
// Este é o pedaço que mais tira o aspecto "cartoon", e não é sobre detalhe:
// enquanto cada tile é um quadrado perfeito de um tipo só, o mapa lê como um
// tabuleiro, por mais bonita que seja a textura dentro do quadrado. Com a
// transição, a grama invade a areia com uma borda mordida, a praia entra na
// água, e a silhueta do mapa passa a parecer desenhada em vez de montada.
//
// Uma máscara é indexada por um bitmask de 4 bits dos lados que fazem
// fronteira com um terreno de prioridade MENOR (ver palette.js:
// TERRAIN_PRIORITY): N=1, L=2, S=4, O=8. Onde a máscara é opaca, o tipo de
// cima aparece; onde é transparente, o fundo passa.

import { hash2 } from './noise.js';
import { SRC } from './tileTextures.js';

export const SIDE = { N: 1, E: 2, S: 4, W: 8 };
export const MASK_COUNT = 16;

// Profundidade máxima que a borda come pra dentro do tile. 4px de 16 é o
// suficiente pra ler como irregular sem apagar a identidade do tile.
const MAX_BITE = 4;

// Perfil de mordida ao longo de uma aresta: valores 1..MAX_BITE variando
// suavemente, pra a borda ondular em vez de serrilhar aleatoriamente.
function bite(i, seed) {
  const a = hash2(i, 0, seed);
  const b = hash2(i + 1, 0, seed);
  const smooth = (a + b) / 2;
  return 1 + Math.floor(smooth * MAX_BITE);
}

function buildMask(mask) {
  const canvas = document.createElement('canvas');
  canvas.width = SRC;
  canvas.height = SRC;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SRC, SRC);

  // Cada lado marcado é corroído a partir da própria aresta. O `seed` deriva
  // do bitmask, então a mesma configuração de vizinhos sempre produz a mesma
  // borda — dois tiles iguais lado a lado casam.
  if (mask & SIDE.N) for (let x = 0; x < SRC; x++) ctx.clearRect(x, 0, 1, bite(x, mask * 31 + 1));
  if (mask & SIDE.S) for (let x = 0; x < SRC; x++) {
    const d = bite(x, mask * 31 + 2);
    ctx.clearRect(x, SRC - d, 1, d);
  }
  if (mask & SIDE.W) for (let y = 0; y < SRC; y++) ctx.clearRect(0, y, bite(y, mask * 31 + 3), 1);
  if (mask & SIDE.E) for (let y = 0; y < SRC; y++) {
    const d = bite(y, mask * 31 + 4);
    ctx.clearRect(SRC - d, y, d, 1);
  }

  return canvas;
}

let masks = null;

export function getEdgeMasks() {
  if (!masks) {
    masks = [];
    for (let m = 0; m < MASK_COUNT; m++) masks.push(buildMask(m));
  }
  return masks;
}
