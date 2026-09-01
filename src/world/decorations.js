// Decoração do mapa: árvores, plantas e casas puramente visuais, sem lógica
// nem colisão — não afetam pathfinding, percepção ou qualquer sistema de
// jogo. Geradas uma vez, depois de o terreno e as vilas existirem, com uma
// rng própria (`${seed}-decorations`) pra ser determinística pela seed sem
// consumir a sequência da rng de gameplay do mundo.

import { createRng } from '../utils/rng.js';
import { TILE_TYPES } from './tile.js';
import { tileToWorld, distance } from '../utils/mathUtils.js';
import {
  TILE_SIZE,
  DECORATION_TREE_CHANCE,
  DECORATION_PLANT_CHANCE,
  DECORATION_HOUSES_PER_VILLAGE,
  DECORATION_VILLAGE_CLEARING_RADIUS,
} from '../utils/constants.js';

function isInsideAnyVillageClearing(pos, villages) {
  const clearingPx = DECORATION_VILLAGE_CLEARING_RADIUS * TILE_SIZE;
  return villages.some((village) => distance(pos, village.center) < clearingPx);
}

export function generateDecorations(world) {
  const rng = createRng(`${world.seed}-decorations`);
  const decorations = [];

  for (let ty = 0; ty < world.height; ty++) {
    for (let tx = 0; tx < world.width; tx++) {
      const tile = world.tiles[ty][tx];
      const chance =
        tile.type === TILE_TYPES.FOREST
          ? DECORATION_TREE_CHANCE
          : tile.type === TILE_TYPES.GRASS
            ? DECORATION_PLANT_CHANCE
            : 0;
      if (chance === 0 || rng.next() >= chance) continue;

      const pos = tileToWorld(tx, ty, TILE_SIZE);
      if (isInsideAnyVillageClearing(pos, world.villages)) continue;

      decorations.push({ type: tile.type === TILE_TYPES.FOREST ? 'tree' : 'plant', x: pos.x, y: pos.y });
    }
  }

  for (const village of world.villages) {
    const clearingPx = DECORATION_VILLAGE_CLEARING_RADIUS * TILE_SIZE;
    for (let i = 0; i < DECORATION_HOUSES_PER_VILLAGE; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = rng.range(0, clearingPx * 0.8);
      decorations.push({
        type: 'house',
        x: village.center.x + Math.cos(angle) * dist,
        y: village.center.y + Math.sin(angle) * dist,
      });
    }
  }

  return decorations;
}
