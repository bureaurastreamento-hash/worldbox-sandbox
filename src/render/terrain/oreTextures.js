// Depósitos de minério desenhados COMO PARTE DA ROCHA, não como ícone.
//
// Antes, um tile de montanha com minério recebia um ícone centralizado do
// tileset — um objeto flutuando no meio do quadrado, que junto com a cor
// chapada da rocha era metade do motivo de a montanha parecer um tabuleiro.
// Aqui o minério é um punhado de pedras incrustadas, espalhadas fora do
// centro, com a mesma direção de luz (cima-esquerda clara, baixo-direita
// escura) do resto do terreno.

import { rngAt } from './noise.js';
import { ORE_PALETTE } from './palette.js';
import { SRC, VARIANTS } from './tileTextures.js';

function makeCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = SRC;
  canvas.height = SRC;
  return canvas;
}

// Uma pedra: bloco de 2-3px com face clara em cima-esquerda e sombra
// projetada embaixo-direita, encaixada na rocha.
function drawNugget(ctx, x, y, size, ore) {
  ctx.fillStyle = ore.dark;
  ctx.fillRect(x, y + 1, size, size);
  ctx.fillStyle = ore.core;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = ore.light;
  ctx.fillRect(x, y, Math.max(1, size - 1), 1);
  ctx.fillRect(x, y, 1, Math.max(1, size - 1));
}

function paintDeposit(ctx, oreKey, seed) {
  const ore = ORE_PALETTE[oreKey];
  const rnd = rngAt(seed, 63, 13);

  // Um punhado pequeno: o depósito precisa ser legível de relance mas não
  // pode virar o assunto do tile — a rocha ainda é o terreno.
  const count = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < count; i++) {
    const size = 2 + Math.floor(rnd() * 2);
    const x = 2 + Math.floor(rnd() * (SRC - 4 - size));
    const y = 2 + Math.floor(rnd() * (SRC - 4 - size));
    drawNugget(ctx, x, y, size, ore);
  }

  // Ouro ganha um brilho isolado — é o único que deve dar vontade de olhar
  // duas vezes, e o pack antigo já tratava ouro como o achado raro.
  if (oreKey === 'gold' && rnd() > 0.4) {
    const x = 3 + Math.floor(rnd() * (SRC - 6));
    const y = 3 + Math.floor(rnd() * (SRC - 6));
    ctx.fillStyle = ore.light;
    ctx.fillRect(x, y, 1, 1);
  }
}

let deposits = null;

// oreKey -> canvas[VARIANTS], transparente fora das pedras (desenhado por
// cima do tile de rocha já pronto).
export function buildOreTextures() {
  if (deposits) return deposits;
  deposits = {};
  for (const oreKey of Object.keys(ORE_PALETTE)) {
    const list = [];
    for (let v = 0; v < VARIANTS; v++) {
      const canvas = makeCanvas();
      paintDeposit(canvas.getContext('2d'), oreKey, v * 197 + 11);
      list.push(canvas);
    }
    deposits[oreKey] = list;
  }
  return deposits;
}
