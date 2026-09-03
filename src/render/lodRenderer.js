// LOD de RENDERIZAÇÃO por zoom — e só de renderização.
//
// A simulação é 100% independente disto: todo agente decide, anda, come e
// morre igual, esteja ele desenhado como sprite animado, como um ponto de
// 2px, ou fora da tela. Quem escalona a simulação é simulation/scheduler.js,
// pelo relógio simulado, sem olhar a câmera uma única vez. Este módulo é
// LEITURA PURA do estado — nunca escreve em `world`.
//
// O problema que ele resolve: o jogo desenhava todo agente com sprite
// completo em qualquer zoom. Com ~450 agentes a simulação cabia no orçamento
// (13.3ms de 16.7ms) mas a renderização não deixava sobrar nada, e a aba
// ficava sem resposta. Em zoom aberto, porém, um agente ocupa poucos pixels:
// pagar animação, espelhamento, sombra, anel de seleção e partícula por
// agente ali é gastar tudo pra produzir uma mancha de 2px.
//
// Três níveis, não um contínuo — a própria referência (pesquisawolrd.md)
// recomenda poucos degraus a um sistema perfeito e complicado:
//
//   FULL   (zoom alto)  sprites animados, partículas, decoração — o de sempre
//   SIMPLE (zoom médio) sprites sem partícula e sem decoração miúda
//   DOTS   (zoom baixo) um retângulo por agente, agrupado por cor de clã
//
// No DOTS o desenho é agrupado por cor: o análogo em Canvas 2D do instanced
// rendering que a referência descreve pra GPU. Trocar `fillStyle` é a
// operação cara aqui, então N agentes de C clãs custam C trocas de estado em
// vez de N.

import { LOD_SIMPLE_ZOOM, LOD_DOTS_ZOOM, LOD_DOT_MIN_PX } from '../utils/constants.js';

export const LOD = { FULL: 'full', SIMPLE: 'simple', DOTS: 'dots' };

export function lodForZoom(zoom) {
  if (zoom < LOD_DOTS_ZOOM) return LOD.DOTS;
  if (zoom < LOD_SIMPLE_ZOOM) return LOD.SIMPLE;
  return LOD.FULL;
}

// Reutilizados entre frames de propósito: este caminho roda a cada frame com
// centenas de entidades, e alocar um Map e arrays novos toda vez é
// exatamente o lixo por frame que utils/objectPool.js existe pra evitar.
const byColor = new Map();
const DEFAULT_COLOR = '#d8d8d8';

function bucket(color) {
  let list = byColor.get(color);
  if (!list) {
    list = [];
    byColor.set(color, list);
  }
  return list;
}

// Desenha agentes e predadores como pontos coloridos por facção.
//
// A margem de culling é pequena e em pixels de TELA (não de mundo): em zoom
// aberto, um tile tem poucos pixels, então uma margem generosa em px de mundo
// viraria centenas de entidades desenhadas fora da vista.
// vilaId -> cor do clã, remontado uma vez por frame. Procurar a vila e depois
// o clã DENTRO do laço por agente seria O(agentes x vilas) — com 500 agentes
// e 40 vilas, 20 mil buscas por frame só pra escolher uma cor. É o mesmo erro
// que foi eliminado da simulação (world/world.js:rebuildAgentIndex); num
// caminho que roda todo frame ele custaria ainda mais caro.
const colorByVillage = new Map();

function refreshVillageColors(world) {
  colorByVillage.clear();
  for (const village of world.villages) {
    const clan = world.clans.find((c) => c.id === village.clanId);
    colorByVillage.set(village.id, clan?.color ?? DEFAULT_COLOR);
  }
}

export function drawEntityDots(ctx, world, camera, viewW, viewH) {
  for (const list of byColor.values()) list.length = 0;
  refreshVillageColors(world);

  const size = Math.max(LOD_DOT_MIN_PX, Math.round(2 * camera.zoom));
  const half = size / 2;
  const margin = size + 2;

  for (const agent of world.agents) {
    if (!agent.alive) continue;
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);
    if (pos.x < -margin || pos.x > viewW + margin || pos.y < -margin || pos.y > viewH + margin) continue;

    bucket(colorByVillage.get(agent.villageId) ?? DEFAULT_COLOR).push(pos.x - half, pos.y - half);
  }

  for (const predator of world.predators) {
    if (!predator.alive) continue;
    const pos = camera.worldToScreen(predator.position.x, predator.position.y, viewW, viewH);
    if (pos.x < -margin || pos.x > viewW + margin || pos.y < -margin || pos.y > viewH + margin) continue;
    bucket(PREDATOR_DOT_COLOR).push(pos.x - half, pos.y - half);
  }

  // Uma troca de fillStyle por cor, não por entidade.
  for (const [color, coords] of byColor) {
    if (coords.length === 0) continue;
    ctx.fillStyle = color;
    for (let i = 0; i < coords.length; i += 2) {
      ctx.fillRect(coords[i], coords[i + 1], size, size);
    }
  }
}

const PREDATOR_DOT_COLOR = '#c0392b';
