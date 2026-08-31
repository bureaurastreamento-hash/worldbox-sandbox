// Buckets de grid pra consulta de proximidade rápida — sem isso, achar
// "agentes por perto" é O(n) por agente (O(n²) no total), o que não escala
// além de algumas dezenas de agentes. Reconstruído a cada tick em main.js.

import { SPATIAL_CELL_SIZE } from '../utils/constants.js';

function cellKey(cx, cy) {
  return `${cx},${cy}`;
}

export function buildSpatialIndex(agents, cellSize = SPATIAL_CELL_SIZE) {
  const cells = new Map();

  for (const agent of agents) {
    if (!agent.alive) continue;
    const cx = Math.floor(agent.position.x / cellSize);
    const cy = Math.floor(agent.position.y / cellSize);
    const key = cellKey(cx, cy);

    let bucket = cells.get(key);
    if (!bucket) {
      bucket = [];
      cells.set(key, bucket);
    }
    bucket.push(agent);
  }

  return { cells, cellSize };
}

// Retorna um superconjunto (bounding box, não círculo exato) dos agentes a
// até `radius` de position — quem chama ainda precisa filtrar por distância
// real se precisar do círculo exato (ver agent/perception.js).
export function queryNearby(index, position, radius) {
  const { cells, cellSize } = index;
  const minCx = Math.floor((position.x - radius) / cellSize);
  const maxCx = Math.floor((position.x + radius) / cellSize);
  const minCy = Math.floor((position.y - radius) / cellSize);
  const maxCy = Math.floor((position.y + radius) / cellSize);

  const result = [];
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const bucket = cells.get(cellKey(cx, cy));
      if (bucket) result.push(...bucket);
    }
  }
  return result;
}
