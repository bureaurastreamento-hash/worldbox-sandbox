// Grafo de chunks e portais — a camada de abstração que o HPA*
// (world/hpaStar.js) navega.
//
// POR QUE EXISTE. O A* plano custava **8ms por busca** numa travessia longa,
// medido: o espaço de busca cresce com a distância, e uma viagem de ponta a
// ponta do mapa estourava o orçamento de 3000 nós explorando meio mundo. Com
// centenas de agentes, isso dominava o tick inteiro e era o único item
// separando ~390 agentes de milhares.
//
// A IDEIA. O mapa é cortado em chunks. Nas fronteiras entre chunks vizinhos,
// onde há passagem, nascem PORTAIS. Dentro de um chunk, a distância entre
// cada par de portais dele é pré-calculada uma vez. Navegar o mapa vira
// então um A* sobre algumas centenas de portais em vez de dezenas de milhares
// de células — e o caminho fino só é resolvido chunk a chunk, cada busca
// limitada à área de um chunk.
//
// ESTRUTURA DE DADOS (documentada porque é o que mais confunde depois):
//
//   world.chunkGraph = {
//     cols, rows,          -- quantos chunks em cada eixo
//     size,                -- lado do chunk em tiles
//     portals: Portal[],   -- TODOS os portais do mapa, indexados por id
//   }
//
//   Portal = {
//     id,                  -- índice em `portals`
//     tx, ty,              -- célula que o portal ocupa (sempre andável)
//     chunk,               -- índice do chunk a que pertence (cy*cols + cx)
//     edges: [{ to, cost }] -- vizinhos no grafo abstrato
//   }
//
// Um portal tem DUAS espécies de aresta, e a diferença importa:
//
//   - TRAVESSIA (custo 1): liga o portal ao seu gêmeo do outro lado da
//     fronteira. É um passo de célula, literalmente.
//   - INTERNA (custo = caminho real): liga dois portais DO MESMO chunk, com
//     o custo do A* local entre eles. É esta que carrega a informação de
//     "dá pra atravessar este chunk por dentro, e por quanto" — e é ela que
//     permite o grafo abstrato saber que um chunto partido ao meio por um
//     lago não é atravessável, sem nunca olhar célula nenhuma na hora da
//     consulta.

import { CHUNK_SIZE } from '../utils/constants.js';
import { getTileAt } from './world.js';
import { isWalkable } from './tile.js';
import { findTilePath, LOCAL_MAX_VISITED } from './pathfinding.js';
import { tileToWorld } from '../utils/mathUtils.js';
import { TILE_SIZE } from '../utils/constants.js';

function walkableAt(world, tx, ty) {
  const tile = getTileAt(world, tx, ty);
  return !!tile && isWalkable(tile.type);
}

export function chunkBounds(graph, chunkIndex) {
  const cx = chunkIndex % graph.cols;
  const cy = Math.floor(chunkIndex / graph.cols);
  return {
    minTx: cx * graph.size,
    minTy: cy * graph.size,
    maxTx: Math.min((cx + 1) * graph.size - 1, graph.width - 1),
    maxTy: Math.min((cy + 1) * graph.size - 1, graph.height - 1),
  };
}

export function chunkIndexAt(graph, tx, ty) {
  const cx = Math.floor(tx / graph.size);
  const cy = Math.floor(ty / graph.size);
  if (cx < 0 || cy < 0 || cx >= graph.cols || cy >= graph.rows) return -1;
  return cy * graph.cols + cx;
}

// União dos retângulos de dois chunks. Usada como `bounds` do A* local: o
// caminho entre dois portais de chunks vizinhos pode legitimamente encostar
// no chunk do lado ao contornar um obstáculo na fronteira.
export function boundsOfChunks(graph, a, b) {
  const ba = chunkBounds(graph, a);
  if (a === b) return ba;
  const bb = chunkBounds(graph, b);
  return {
    minTx: Math.min(ba.minTx, bb.minTx),
    minTy: Math.min(ba.minTy, bb.minTy),
    maxTx: Math.max(ba.maxTx, bb.maxTx),
    maxTy: Math.max(ba.maxTy, bb.maxTy),
  };
}

// A aresta guarda o CAMINHO, não só o custo.
//
// Guardar só o custo era metade do trabalho: na hora da consulta o HPA*
// precisava rodar um A* local de novo pra cada trecho, refazendo exatamente a
// busca que já tinha sido feita aqui na construção. Medido, era o que mantinha
// a consulta em ~2ms. Com o caminho em cache, atravessar um chunk vira uma
// concatenação de array.
//
// O sentido inverso é derivado, não recalculado: o caminho A->B termina em B
// e omite A (contrato de findTilePath), então B->A é o mesmo invertido, sem o
// último ponto, mais a posição de A no fim.
function reversePath(path, fromWorld) {
  const out = path.slice(0, -1).reverse();
  out.push(fromWorld);
  return out;
}

function worldOf(portal) {
  return tileToWorld(portal.tx, portal.ty, TILE_SIZE);
}

function addEdge(a, b, cost, pathAB) {
  a.edges.push({ to: b.id, cost, path: pathAB });
  b.edges.push({ to: a.id, cost, path: reversePath(pathAB, worldOf(a)) });
}

// Uma fronteira entre dois chunks vira UM portal por trecho contínuo
// atravessável, posicionado no meio do trecho — não um portal por célula.
//
// É o que mantém o grafo pequeno: uma fronteira de 32 células totalmente
// aberta vira 1 portal, não 32. Um trecho por abertura também é o que
// preserva a topologia real: dois trechos separados por montanha viram dois
// portais, porque são de fato duas passagens diferentes.
function addBorderPortals(world, graph, chunkA, chunkB, cells) {
  let runStart = -1;

  const closeRun = (endIndex) => {
    if (runStart < 0) return;
    const mid = cells[(runStart + endIndex) >> 1];
    const a = { id: graph.portals.length, tx: mid.ax, ty: mid.ay, chunk: chunkA, edges: [] };
    graph.portals.push(a);
    const b = { id: graph.portals.length, tx: mid.bx, ty: mid.by, chunk: chunkB, edges: [] };
    graph.portals.push(b);
    addEdge(a, b, 1, [worldOf(b)]); // travessia: um passo de célula
    runStart = -1;
  };

  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const open = walkableAt(world, c.ax, c.ay) && walkableAt(world, c.bx, c.by);
    if (open) {
      if (runStart < 0) runStart = i;
    } else {
      closeRun(i - 1);
    }
  }
  closeRun(cells.length - 1);
}

export function buildChunkGraph(world) {
  const size = CHUNK_SIZE;
  const cols = Math.ceil(world.width / size);
  const rows = Math.ceil(world.height / size);
  const graph = { cols, rows, size, width: world.width, height: world.height, portals: [] };

  // 1) Portais nas fronteiras verticais (entre chunk (cx,cy) e (cx+1,cy)).
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx + 1 < cols; cx++) {
      const x = Math.min((cx + 1) * size, world.width) - 1;
      const minTy = cy * size;
      const maxTy = Math.min((cy + 1) * size, world.height) - 1;
      const cells = [];
      for (let ty = minTy; ty <= maxTy; ty++) cells.push({ ax: x, ay: ty, bx: x + 1, by: ty });
      addBorderPortals(world, graph, cy * cols + cx, cy * cols + cx + 1, cells);
    }
  }

  // 2) Portais nas fronteiras horizontais (entre (cx,cy) e (cx,cy+1)).
  for (let cy = 0; cy + 1 < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const y = Math.min((cy + 1) * size, world.height) - 1;
      const minTx = cx * size;
      const maxTx = Math.min((cx + 1) * size, world.width) - 1;
      const cells = [];
      for (let tx = minTx; tx <= maxTx; tx++) cells.push({ ax: tx, ay: y, bx: tx, by: y + 1 });
      addBorderPortals(world, graph, cy * cols + cx, (cy + 1) * cols + cx, cells);
    }
  }

  // 3) Arestas INTERNAS: custo real entre cada par de portais do mesmo chunk.
  //
  // É a parte cara da construção (O(portais_por_chunk^2) buscas locais), e é
  // paga UMA VEZ no carregamento. Em troca, toda consulta posterior atravessa
  // um chunk consultando um número, não rodando A*.
  const byChunk = new Map();
  for (const portal of graph.portals) {
    if (!byChunk.has(portal.chunk)) byChunk.set(portal.chunk, []);
    byChunk.get(portal.chunk).push(portal);
  }

  for (const [chunkIndex, portals] of byChunk) {
    const bounds = chunkBounds(graph, chunkIndex);
    for (let i = 0; i < portals.length; i++) {
      for (let j = i + 1; j < portals.length; j++) {
        const path = findTilePath(world, portals[i], portals[j], { bounds, maxVisited: LOCAL_MAX_VISITED });
        // null = não dá pra ir de um ao outro POR DENTRO deste chunk (um lago
        // no meio, por exemplo). Não criar a aresta é exatamente o que faz o
        // grafo abstrato respeitar a topologia real.
        if (path !== null) addEdge(portals[i], portals[j], path.length, path);
      }
    }
  }

  graph.portalsByChunk = byChunk;
  return graph;
}
