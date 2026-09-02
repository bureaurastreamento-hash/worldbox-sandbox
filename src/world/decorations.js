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
  DECORATION_CHEST_CHANCE,
  DECORATION_CAMPFIRES_PER_VILLAGE,
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
      const isVegetated = tile.type === TILE_TYPES.FOREST || tile.type === TILE_TYPES.GRASS;
      if (!isVegetated) continue;

      const pos = tileToWorld(tx, ty, TILE_SIZE);
      if (isInsideAnyVillageClearing(pos, world.villages)) continue;

      const chance = tile.type === TILE_TYPES.FOREST ? DECORATION_TREE_CHANCE : DECORATION_PLANT_CHANCE;
      if (rng.next() < chance) {
        decorations.push({ type: tile.type === TILE_TYPES.FOREST ? 'tree' : 'plant', x: pos.x, y: pos.y });
        continue; // um bicho/baú não nasce em cima da árvore/planta que já nasceu aqui
      }

      // Baú: raro, mesma chance pros dois tipos de tile vegetado (ao
      // contrário de árvore/planta, que são exclusivos por tipo). Bicho
      // deixou de ser decoração aqui — virou predador de verdade, ver
      // predator/predatorSpawn.js.
      if (rng.next() < DECORATION_CHEST_CHANCE) {
        decorations.push({ type: 'chest', x: pos.x, y: pos.y });
      }
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
    for (let i = 0; i < DECORATION_CAMPFIRES_PER_VILLAGE; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = rng.range(0, clearingPx * 0.4); // mais perto do centro que as casas
      decorations.push({
        type: 'campfire',
        x: village.center.x + Math.cos(angle) * dist,
        y: village.center.y + Math.sin(angle) * dist,
      });
    }
  }

  return decorations;
}
