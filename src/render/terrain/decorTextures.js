// Arte procedural das decorações (árvore, planta, casa, baú), no mesmo
// estilo e na mesma direção de luz do terreno de render/terrain/.
//
// Antes: o triângulo verde de placeholder em cima da copa texturizada era o
// que mais destoava no mapa — o terreno tinha passado a ter volume e a
// decoração continuava sendo geometria chapada.
//
// Cada painter desenha na resolução de AUTORIA (px de arte), e o renderer
// multiplica por DECOR_ART_SCALE na hora de desenhar. Mesma lógica de
// agentRenderer/predatorRenderer: a densidade de pixel do cenário tem que
// bater com a dos personagens, senão o jogo parece colado de fontes
// diferentes.

import { rngAt } from './noise.js';

export const DECOR_ART_SCALE = 2;

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Tronco comum a todas as árvores: faixa escura com a aresta esquerda
// clara, porque a luz vem de cima-esquerda em todo o jogo.
function drawTrunk(ctx, cx, baseY, height, width, dark, light) {
  rect(ctx, cx - Math.floor(width / 2), baseY - height, width, height, dark);
  rect(ctx, cx - Math.floor(width / 2), baseY - height, 1, height, light);
}

function blob(ctx, cx, cy, r, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// Árvore frondosa: copa de bolhas sobrepostas com sombra própria embaixo-
// direita e aro claro em cima-esquerda.
function paintBroadleaf(ctx, w, h, tone) {
  const rnd = rngAt(tone.seed, 3, 7);
  const cx = Math.floor(w / 2);
  drawTrunk(ctx, cx, h, Math.floor(h * 0.35), 3, '#4a3524', '#65482f');

  const canopyY = h * 0.38;
  const r = w * 0.3;
  const spots = [
    [cx, canopyY - r * 0.2, r * 1.05],
    [cx - r * 0.75, canopyY + r * 0.35, r * 0.85],
    [cx + r * 0.75, canopyY + r * 0.3, r * 0.85],
    [cx - r * 0.3, canopyY - r * 0.8, r * 0.75],
    [cx + r * 0.4, canopyY - r * 0.7, r * 0.7],
  ];
  for (const [x, y, rad] of spots) blob(ctx, x + 1, y + 1.5, rad, tone.shadow);
  for (const [x, y, rad] of spots) blob(ctx, x, y, rad, tone.mid);
  for (const [x, y, rad] of spots) {
    if (rnd() > 0.35) blob(ctx, x - rad * 0.3, y - rad * 0.35, rad * 0.5, tone.light);
  }
}

// Pinheiro: camadas triangulares, cada uma com a aresta esquerda iluminada.
function paintPine(ctx, w, h, tone) {
  const cx = Math.floor(w / 2);
  drawTrunk(ctx, cx, h, Math.floor(h * 0.28), 3, '#40301f', '#584028');

  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const halfW = (w * 0.5) * (0.45 + t * 0.55);
    const yTop = h * (0.06 + t * 0.26);
    const yBottom = yTop + h * 0.3;

    ctx.beginPath();
    ctx.moveTo(cx + 1, yTop + 1);
    ctx.lineTo(cx + halfW + 1, yBottom + 1);
    ctx.lineTo(cx - halfW + 1, yBottom + 1);
    ctx.closePath();
    ctx.fillStyle = tone.shadow;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, yTop);
    ctx.lineTo(cx + halfW, yBottom);
    ctx.lineTo(cx - halfW, yBottom);
    ctx.closePath();
    ctx.fillStyle = tone.mid;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, yTop);
    ctx.lineTo(cx - halfW, yBottom);
    ctx.lineTo(cx - halfW * 0.45, yBottom);
    ctx.closePath();
    ctx.fillStyle = tone.light;
    ctx.fill();
  }
}

const TREE_TONES = {
  ArvoreComum: { mid: '#4e7040', light: '#6f9257', shadow: '#2e4526', seed: 11 },
  Pinheiro: { mid: '#3b5a42', light: '#547a56', shadow: '#233626', seed: 23 },
  ArvoreAzulada: { mid: '#7a7b3f', light: '#9d9c58', shadow: '#4c4d26', seed: 37 },
};

function paintBush(ctx, w, h) {
  const tone = { mid: '#59763f', light: '#7c9a58', shadow: '#3a4f2a' };
  const cx = w / 2;
  const cy = h * 0.55;
  const spots = [
    [cx, cy, w * 0.34],
    [cx - w * 0.24, cy + h * 0.12, w * 0.26],
    [cx + w * 0.24, cy + h * 0.1, w * 0.26],
  ];
  for (const [x, y, r] of spots) blob(ctx, x + 0.8, y + 1, r, tone.shadow);
  for (const [x, y, r] of spots) blob(ctx, x, y, r, tone.mid);
  blob(ctx, cx - w * 0.1, cy - h * 0.14, w * 0.16, tone.light);
}

function paintFern(ctx, w, h) {
  const cx = Math.floor(w / 2);
  const blades = 5;
  for (let i = 0; i < blades; i++) {
    const t = i / (blades - 1) - 0.5;
    const tipX = cx + t * w * 0.8;
    const tipY = h * (0.15 + Math.abs(t) * 0.35);
    ctx.strokeStyle = i % 2 ? '#4b6633' : '#5d7c42';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, h - 1);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  }
  rect(ctx, cx - 1, h - 2, 2, 2, '#3d5029');
}

// Casa: parede com prumos de madeira e telhado de duas águas, com a água
// esquerda mais clara (luz de cima-esquerda) e uma linha de beiral escura
// separando telhado de parede.
function paintHouse(ctx, w, h) {
  const wallTop = Math.floor(h * 0.45);
  const wallH = h - wallTop;

  rect(ctx, 1, wallTop, w - 2, wallH, '#a98a5f');
  rect(ctx, 1, wallTop, 1, wallH, '#c2a377'); // aresta iluminada
  rect(ctx, w - 2, wallTop, 1, wallH, '#7d6544'); // aresta na sombra
  for (let x = 3; x < w - 3; x += 4) rect(ctx, x, wallTop + 1, 1, wallH - 2, '#94764f');

  // Porta
  const doorW = Math.max(3, Math.floor(w * 0.22));
  const doorX = Math.floor((w - doorW) / 2);
  rect(ctx, doorX, h - Math.floor(wallH * 0.62), doorW, Math.floor(wallH * 0.62), '#5d4229');
  rect(ctx, doorX, h - Math.floor(wallH * 0.62), 1, Math.floor(wallH * 0.62), '#75543a');

  // Telhado
  const peakX = w / 2;
  ctx.beginPath();
  ctx.moveTo(peakX, 0);
  ctx.lineTo(w, wallTop);
  ctx.lineTo(0, wallTop);
  ctx.closePath();
  ctx.fillStyle = '#8a4636';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(peakX, 0);
  ctx.lineTo(0, wallTop);
  ctx.lineTo(peakX, wallTop);
  ctx.closePath();
  ctx.fillStyle = '#a55a44'; // água iluminada
  ctx.fill();

  rect(ctx, 0, wallTop - 1, w, 1, '#5e2f24'); // beiral
}

function paintChest(ctx, w, h) {
  const lidH = Math.floor(h * 0.4);
  rect(ctx, 0, lidH, w, h - lidH, '#7a552f');
  rect(ctx, 0, lidH, 1, h - lidH, '#96693a');
  rect(ctx, 0, 0, w, lidH, '#8d6436');
  rect(ctx, 0, 0, w, 1, '#a87a45');
  rect(ctx, 0, lidH - 1, w, 1, '#4e3620');
  const bandX = Math.floor(w / 2) - 1;
  rect(ctx, bandX, 0, 2, h, '#c9a94f');
  rect(ctx, bandX, lidH - 1, 2, 2, '#e6cd7a');
}

let cache = null;

// Nome de variante -> canvas. Os nomes são os mesmos que
// decorationRenderer.js já usava pros arquivos, pra a troca não mexer na
// lógica de escolha de variante por posição.
export function buildDecorTextures() {
  if (cache) return cache;
  cache = {};

  for (const [name, tone] of Object.entries(TREE_TONES)) {
    const canvas = makeCanvas(16, 20);
    const ctx = canvas.getContext('2d');
    if (name === 'Pinheiro') paintPine(ctx, 16, 20, tone);
    else paintBroadleaf(ctx, 16, 20, tone);
    cache[name] = canvas;
  }

  const bush = makeCanvas(11, 9);
  paintBush(bush.getContext('2d'), 11, 9);
  cache.Arbusto = bush;

  const fern = makeCanvas(11, 9);
  paintFern(fern.getContext('2d'), 11, 9);
  cache.Sebe = fern;

  const house = makeCanvas(18, 16);
  paintHouse(house.getContext('2d'), 18, 16);
  cache.Casa = house;

  const chest = makeCanvas(10, 9);
  paintChest(chest.getContext('2d'), 10, 9);
  cache.Bau = chest;

  return cache;
}
