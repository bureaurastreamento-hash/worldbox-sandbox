// A* simples no grid de tiles. Usado por agent/movement.js pra todo
// deslocamento de agente — sem isso, a movimentação em linha reta cortava
// direto por água e montanha sempre que o alvo estava do outro lado.

import { TILE_SIZE } from '../utils/constants.js';
import { getTileAt } from './world.js';
import { isWalkable } from './tile.js';
import { worldToTile, tileToWorld } from '../utils/mathUtils.js';

const MAX_VISITED = 3000; // orçamento de busca; estourar = desiste (inalcançável ou longe demais)

// Fila de prioridade (min-heap binário) para o conjunto aberto.
//
// Era um array com `open.sort((a,b) => a.f - b.f)` A CADA ITERAÇÃO do laço —
// ou seja, reordenar a lista inteira ~3000 vezes por busca. Enquanto quase
// todo alvo era vizinho (o wander antigo sorteava um tile do próprio raio de
// percepção), a lista ficava curta e o custo passava despercebido. Assim que
// alvos distantes ou inalcançáveis viraram comuns, uma única busca que
// estoura o orçamento passou a ordenar milhares de elementos milhares de
// vezes: medido em 33x o tempo total de simulação. Com o heap, inserir e
// remover são O(log n) e o pior caso da busca volta a ser proporcional ao
// orçamento, não ao seu quadrado vezes o log.
function createHeap() {
  const items = [];

  function up(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].f <= items[i].f) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  function down(i) {
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let best = i;
      if (l < items.length && items[l].f < items[best].f) best = l;
      if (r < items.length && items[r].f < items[best].f) best = r;
      if (best === i) break;
      [items[best], items[i]] = [items[i], items[best]];
      i = best;
    }
  }

  return {
    get size() {
      return items.length;
    },
    push(node) {
      items.push(node);
      up(items.length - 1);
    },
    pop() {
      const top = items[0];
      const last = items.pop();
      if (items.length > 0) {
        items[0] = last;
        down(0);
      }
      return top;
    },
  };
}

const NEIGHBOR_OFFSETS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function heuristic(a, b) {
  return Math.hypot(a.tx - b.tx, a.ty - b.ty);
}

function key(tx, ty) {
  return `${tx},${ty}`;
}

function reconstructPath(cameFrom, endNode) {
  const tiles = [];
  let node = endNode;
  while (node) {
    tiles.push(node);
    node = cameFrom.get(key(node.tx, node.ty));
  }
  tiles.reverse();
  tiles.shift(); // remove o tile inicial — o agente já está lá
  return tiles.map((t) => tileToWorld(t.tx, t.ty, TILE_SIZE));
}

// Retorna waypoints (em px de mundo) do tile atual até o tile de destino,
// sem incluir o ponto de partida. [] se já está no tile de destino.
// null se inalcançável (ou fora do orçamento de busca).
export function findPath(world, fromWorldPos, toWorldPos) {
  const start = worldToTile(fromWorldPos.x, fromWorldPos.y, TILE_SIZE);
  const goal = worldToTile(toWorldPos.x, toWorldPos.y, TILE_SIZE);

  if (start.tx === goal.tx && start.ty === goal.ty) return [];

  const goalTile = getTileAt(world, goal.tx, goal.ty);
  if (!goalTile || !isWalkable(goalTile.type)) return null;

  const open = createHeap();
  open.push({ tx: start.tx, ty: start.ty, g: 0, f: heuristic(start, goal) });
  const cameFrom = new Map();
  const gScore = new Map([[key(start.tx, start.ty), 0]]);
  const closed = new Set();
  let visited = 0;

  while (open.size > 0) {
    const current = open.pop();
    const currentKey = key(current.tx, current.ty);
    if (closed.has(currentKey)) continue; // entrada obsoleta: já fechamos este tile por um caminho melhor
    closed.add(currentKey);

    // Conta tiles EXPANDIDOS, não desenfileiramentos. Antes o contador subia
    // também nas entradas obsoletas descartadas acima, então o orçamento real
    // era menor (e variável) do que MAX_VISITED anuncia.
    if (++visited > MAX_VISITED) return null;

    if (current.tx === goal.tx && current.ty === goal.ty) {
      return reconstructPath(cameFrom, current);
    }

    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const ntx = current.tx + dx;
      const nty = current.ty + dy;
      const nKey = key(ntx, nty);
      if (closed.has(nKey)) continue;

      const tile = getTileAt(world, ntx, nty);
      if (!tile || !isWalkable(tile.type)) continue;

      // não corta diagonal "na quina" entre dois obstáculos
      if (dx !== 0 && dy !== 0) {
        const sideA = getTileAt(world, current.tx + dx, current.ty);
        const sideB = getTileAt(world, current.tx, current.ty + dy);
        if (!sideA || !isWalkable(sideA.type) || !sideB || !isWalkable(sideB.type)) continue;
      }

      const stepCost = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
      const tentativeG = current.g + stepCost;
      const known = gScore.get(nKey);
      if (known !== undefined && tentativeG >= known) continue;

      gScore.set(nKey, tentativeG);
      cameFrom.set(nKey, current);
      open.push({ tx: ntx, ty: nty, g: tentativeG, f: tentativeG + heuristic({ tx: ntx, ty: nty }, goal) });

    }
  }

  return null;
}
