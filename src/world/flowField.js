// Campo de fluxo: uma busca só, lida por N unidades.
//
// Quando muitas unidades vão para O MESMO destino (exército, saque, migração),
// calcular um caminho por unidade é desperdício puro — são N buscas para
// responder à mesma pergunta. Aqui a pergunta é respondida uma vez, de trás
// pra frente: uma busca em largura a partir do DESTINO preenche o mapa com
// "quantos passos daqui até lá", e cada unidade só lê a direção da célula em
// que está.
//
// Custo por unidade: uma leitura de array. Não há busca nenhuma no caminho
// quente, que é exatamente o ponto.
//
// A busca em largura é feita sobre a grade inteira (~48 mil células), o que
// custa poucos milissegundos UMA vez — e vale a pena a partir de uma dúzia de
// unidades, já que uma única travessia longa de A* plano custava 8ms sozinha.
//
// Dois detalhes que não são óbvios:
//
//   - Usa custo uniforme (BFS) e não Dijkstra: todo tile andável custa o
//     mesmo neste jogo, então a fila simples já dá o resultado ótimo, sem
//     heap. Se um dia houver terreno lento, isto vira Dijkstra.
//   - O campo é de DIREÇÕES, não de caminhos. Uma unidade que for empurrada
//     pra fora da rota (agent/separation.js) simplesmente lê a direção nova
//     da célula onde caiu — não existe caminho a recalcular, o que é a
//     segunda vantagem grande sobre pathfinding individual.

import { TILE_SIZE, FLOW_FIELD_TTL_SECONDS } from '../utils/constants.js';
import { getTileAt } from './world.js';
import { isWalkable } from './tile.js';

const NEIGHBORS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const UNREACHABLE = 0xffff;

function buildField(world, goalTx, goalTy) {
  const { width, height } = world;
  const dist = new Uint16Array(width * height).fill(UNREACHABLE);

  const goalTile = getTileAt(world, goalTx, goalTy);
  if (!goalTile || !isWalkable(goalTile.type)) return null;

  // Fila circular sobre um array pré-alocado — sem `shift()`, que é O(n) num
  // array de dezenas de milhares e transformaria a BFS em O(n²).
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const goalIndex = goalTy * width + goalTx;
  dist[goalIndex] = 0;
  queue[tail++] = goalIndex;

  while (head < tail) {
    const index = queue[head++];
    const tx = index % width;
    const ty = (index / width) | 0;
    const next = dist[index] + 1;

    for (const [dx, dy] of NEIGHBORS) {
      const ntx = tx + dx;
      const nty = ty + dy;
      if (ntx < 0 || nty < 0 || ntx >= width || nty >= height) continue;

      const nIndex = nty * width + ntx;
      if (dist[nIndex] !== UNREACHABLE) continue;

      const tile = getTileAt(world, ntx, nty);
      if (!tile || !isWalkable(tile.type)) continue;

      dist[nIndex] = next;
      queue[tail++] = nIndex;
    }
  }

  return { dist, width, height, goalTx, goalTy, createdAt: world.elapsedSeconds };
}

// Direção normalizada a seguir a partir de (tx, ty), ou null se a célula não
// alcança o destino. Escolhe a vizinha de menor distância — o gradiente.
export function sampleFlow(field, tx, ty) {
  const { dist, width, height } = field;
  if (tx < 0 || ty < 0 || tx >= width || ty >= height) return null;

  const here = dist[ty * width + tx];
  if (here === UNREACHABLE) return null;
  if (here === 0) return { dx: 0, dy: 0, arrived: true };

  let bestDx = 0;
  let bestDy = 0;
  let best = here;

  for (const [dx, dy] of NEIGHBORS) {
    const ntx = tx + dx;
    const nty = ty + dy;
    if (ntx < 0 || nty < 0 || ntx >= width || nty >= height) continue;
    const d = dist[nty * width + ntx];
    if (d < best) {
      best = d;
      bestDx = dx;
      bestDy = dy;
    }
  }

  if (bestDx === 0 && bestDy === 0) return null;
  const len = Math.hypot(bestDx, bestDy);
  return { dx: bestDx / len, dy: bestDy / len, arrived: false };
}

// Campo para um destino, reaproveitado enquanto não envelhecer. O cache é por
// TILE de destino: é o que faz 50 unidades indo pro mesmo lugar
// compartilharem uma busca só.
export function getFlowField(world, goalWorldPos) {
  if (!world.flowFields) world.flowFields = new Map();

  const goalTx = Math.floor(goalWorldPos.x / TILE_SIZE);
  const goalTy = Math.floor(goalWorldPos.y / TILE_SIZE);
  const key = `${goalTx},${goalTy}`;

  const cached = world.flowFields.get(key);
  // O terreno não muda, então o TTL não é sobre o campo ficar errado — é só
  // pra o cache não crescer sem limite numa partida longa.
  if (cached && world.elapsedSeconds - cached.createdAt < FLOW_FIELD_TTL_SECONDS) return cached;

  const field = buildField(world, goalTx, goalTy);
  if (field) world.flowFields.set(key, field);
  return field;
}

export function pruneFlowFields(world) {
  if (!world.flowFields) return;
  for (const [key, field] of world.flowFields) {
    if (world.elapsedSeconds - field.createdAt >= FLOW_FIELD_TTL_SECONDS) world.flowFields.delete(key);
  }
}
