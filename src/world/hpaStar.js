// HPA* — A* hierárquico sobre o grafo de portais (world/chunks.js).
//
// Duas camadas, e a economia está em nunca misturar as duas:
//
//   ALTO NÍVEL  A* sobre portais. São algumas centenas de nós no mapa
//               inteiro, contra ~48 mil células. É aqui que se decide "por
//               quais chunks eu passo".
//   BAIXO NÍVEL A* comum, mas com `bounds` limitado a um par de chunks
//               vizinhos, resolvendo só um trecho por vez.
//
// O A* plano custava 8ms numa travessia longa porque o espaço de busca cresce
// com a distância. Aqui o custo passa a crescer com o NÚMERO DE CHUNKS
// atravessados, e cada trecho é uma busca pequena de tamanho fixo — é a
// diferença entre uma busca gigante e sete buscas minúsculas.
//
// O caminho refinado é montado inteiro na consulta (em vez de o agente
// refinar trecho a trecho enquanto anda). Fica mais simples: `findPath`
// mantém o contrato de sempre (devolve waypoints em px de mundo), e
// agent/movement.js não precisa saber que HPA* existe. O custo é resolver
// todos os trechos de uma vez, mas cada um é barato e o total continua ordens
// de grandeza abaixo da busca plana.

import { TILE_SIZE, HPA_TEMP_LINKS } from '../utils/constants.js';
import { tileToWorld } from '../utils/mathUtils.js';
import { chunkIndexAt, chunkBounds, boundsOfChunks } from './chunks.js';
import { findTilePath, tilePathCost, LOCAL_MAX_VISITED } from './pathfinding.js';

function heuristic(a, b) {
  return Math.hypot(a.tx - b.tx, a.ty - b.ty);
}

// Nós temporários: o começo e o fim de uma viagem quase nunca caem exatamente
// em cima de um portal, então eles entram no grafo como nós efêmeros ligados
// aos portais do próprio chunk. Ligar SÓ aos portais do próprio chunk é o que
// mantém a inserção barata — são poucas buscas locais, todas dentro de um
// chunk.
function connectTemp(world, graph, node, chunkIndex) {
  const all = graph.portalsByChunk.get(chunkIndex) ?? [];
  if (all.length === 0) return [];

  // Só os HPA_TEMP_LINKS portais mais próximos em linha reta, não todos.
  //
  // Este era o custo dominante da consulta: um A* local por portal do chunk,
  // duas vezes (começo e fim). Um chunk com 8 portais custava 16 buscas só
  // pra INSERIR os dois nós temporários no grafo — mais caro que a busca
  // abstrata em si.
  //
  // Cortar pelos mais próximos é a aproximação clássica do HPA*: entrar no
  // grafo pelo portal mais distante quase nunca é o caminho ótimo, e quando
  // é, a perda de qualidade é de alguns tiles. A completude não sofre: se
  // nenhum dos candidatos conectar, a consulta devolve null e
  // agent/movement.js cai no A* plano.
  const candidates = all.length <= HPA_TEMP_LINKS
    ? all
    : [...all]
        .sort((a, b) => (a.tx - node.tx) ** 2 + (a.ty - node.ty) ** 2 - ((b.tx - node.tx) ** 2 + (b.ty - node.ty) ** 2))
        .slice(0, HPA_TEMP_LINKS);

  const bounds = chunkBounds(graph, chunkIndex);
  const edges = [];
  for (const portal of candidates) {
    const cost = tilePathCost(world, node, portal, bounds);
    if (cost !== null) edges.push({ to: portal.id, cost });
  }
  return edges;
}

// Sequência de portais a atravessar, do começo ao fim. `null` se o grafo
// abstrato não conhece caminho — o que é uma resposta legítima e barata
// ("essas duas regiões não se conectam"), não uma falha.
function findPortalRoute(world, graph, start, goal, startChunk, goalChunk) {
  const startEdges = connectTemp(world, graph, start, startChunk);
  if (startEdges.length === 0) return null;

  const goalEdges = connectTemp(world, graph, goal, goalChunk);
  if (goalEdges.length === 0) return null;
  // Custo de cada portal do chunk final até o destino, consultado ao expandir.
  const goalCostByPortal = new Map(goalEdges.map((e) => [e.to, e.cost]));

  const open = [];
  const gScore = new Map();
  const cameFrom = new Map();

  for (const edge of startEdges) {
    gScore.set(edge.to, edge.cost);
    open.push({ id: edge.to, f: edge.cost + heuristic(graph.portals[edge.to], goal) });
  }

  const closed = new Set();
  let bestGoal = null;
  let bestGoalCost = Infinity;

  while (open.length > 0) {
    // Lista de abertos pequena (dezenas de portais), então ordenar é barato e
    // dispensa a estrutura de heap que o A* de células precisa.
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (closed.has(current.id)) continue;
    closed.add(current.id);

    const g = gScore.get(current.id);
    if (g >= bestGoalCost) break; // nada mais pode melhorar o melhor já achado

    const toGoal = goalCostByPortal.get(current.id);
    if (toGoal !== undefined && g + toGoal < bestGoalCost) {
      bestGoalCost = g + toGoal;
      bestGoal = current.id;
    }

    for (const edge of graph.portals[current.id].edges) {
      if (closed.has(edge.to)) continue;
      const tentative = g + edge.cost;
      const known = gScore.get(edge.to);
      if (known !== undefined && tentative >= known) continue;
      gScore.set(edge.to, tentative);
      cameFrom.set(edge.to, current.id);
      open.push({ id: edge.to, f: tentative + heuristic(graph.portals[edge.to], goal) });
    }
  }

  if (bestGoal === null) return null;

  const route = [];
  for (let id = bestGoal; id !== undefined; id = cameFrom.get(id)) route.push(graph.portals[id]);
  route.reverse();
  return route;
}

// Caminho completo em waypoints de px de mundo, ou null.
//
// Devolver null aqui NÃO significa "inalcançável": significa "o HPA* não
// resolveu". Quem chama (agent/movement.js) cai no A* plano nesse caso — é o
// que garante que nenhum comportamento existente quebre por causa de uma
// lacuna do grafo abstrato.
export function findHierarchicalPath(world, start, goal) {
  const graph = world.chunkGraph;
  if (!graph) return null;

  const startChunk = chunkIndexAt(graph, start.tx, start.ty);
  const goalChunk = chunkIndexAt(graph, goal.tx, goal.ty);
  if (startChunk < 0 || goalChunk < 0) return null;
  if (startChunk === goalChunk) return null; // mesma vizinhança: A* plano já é ótimo e mais curto

  const route = findPortalRoute(world, graph, start, goal, startChunk, goalChunk);
  if (!route) return null;

  // Refina trecho a trecho. Entre dois portais consecutivos o caminho já foi
  // calculado na construção do grafo (world/chunks.js) e é só concatenado —
  // nenhuma busca. Só o primeiro trecho (posição do agente até o primeiro
  // portal) precisa de A* de verdade, e ele é limitado a um chunk.
  const waypoints = [];
  let fromPortal = null;
  let from = start;
  let fromChunk = startChunk;

  for (const portal of route) {
    if (fromPortal) {
      const edge = fromPortal.edges.find((e) => e.to === portal.id);
      if (edge) {
        waypoints.push(...edge.path);
        fromPortal = portal;
        from = portal;
        fromChunk = portal.chunk;
        continue;
      }
    }

    if (from.tx === portal.tx && from.ty === portal.ty) {
      fromPortal = portal;
      fromChunk = portal.chunk;
      continue;
    }

    const segment = findTilePath(world, from, portal, {
      bounds: boundsOfChunks(graph, fromChunk, portal.chunk),
      maxVisited: LOCAL_MAX_VISITED,
    });
    if (segment === null) return null; // deixa o A* plano tentar
    waypoints.push(...segment);
    fromPortal = portal;
    from = portal;
    fromChunk = portal.chunk;
  }

  const last = findTilePath(world, from, goal, {
    bounds: boundsOfChunks(graph, fromChunk, goalChunk),
    maxVisited: LOCAL_MAX_VISITED,
  });
  if (last === null) return null;
  waypoints.push(...last);

  return waypoints;
}

export { TILE_SIZE, tileToWorld };
