// Fauna predadora: entidade separada de Agent, bem mais simples (sem
// needs/perception/memory/utility completo) — ver predatorAI.js pra decisão.
// Substitui a versão puramente decorativa que existia antes (mesmos
// arquivos de sprite Urso/Lobo/Cobra/Besouro, ver render/predatorRenderer.js).

import { tileToWorld, distance } from '../utils/mathUtils.js';
import { getTileAt, findWalkableNear } from '../world/world.js';
import { TILE_TYPES } from '../world/tile.js';
import { createRng } from '../utils/rng.js';
import {
  TILE_SIZE,
  PREDATOR_COUNT_PER_SPECIES,
  PREDATOR_MIN_DISTANCE_FROM_VILLAGE_TILES,
  PREDATOR_SPECIES_STATS,
} from '../utils/constants.js';

// Rótulo em português pro feed de eventos (predatorAI.js, lifecycle.js).
export const SPECIES_LABEL = { bear: 'um urso', wolf: 'um lobo', snake: 'uma cobra', beatle: 'um besouro' };

export function createPredator({ id, species, position }) {
  const stats = PREDATOR_SPECIES_STATS[species];
  return {
    id,
    species,
    position: { x: position.x, y: position.y },
    spawnAnchor: { x: position.x, y: position.y },
    health: stats.health,
    maxHealth: stats.health,
    state: 'patrolling', // 'patrolling' | 'chasing' | 'attacking' | 'fleeing'
    targetAgentId: null,
    target: null, // ponto de movimento atual (mesmo espírito de agent.target)
    decisionTimer: 0,
    alive: true,
  };
}

// Espalha PREDATOR_COUNT_PER_SPECIES de cada espécie pelo mapa, em tile
// andável (grama/floresta — não água/montanha), longe de qualquer vila
// (PREDATOR_MIN_DISTANCE_FROM_VILLAGE_TILES). Determinístico pela seed do
// mundo, mesma rng de decoração (não consome a sequência de gameplay).
export function spawnPredators(world) {
  const rng = createRng(`${world.seed}-predators`); // stream próprio, não consome a rng de gameplay
  const predators = [];
  const minDistPx = PREDATOR_MIN_DISTANCE_FROM_VILLAGE_TILES * TILE_SIZE;
  const species = Object.keys(PREDATOR_SPECIES_STATS);
  let counter = 0;

  for (const sp of species) {
    for (let i = 0; i < PREDATOR_COUNT_PER_SPECIES; i++) {
      let pos = null;
      for (let attempt = 0; attempt < 30 && !pos; attempt++) {
        const tx = rng.int(0, world.width - 1);
        const ty = rng.int(0, world.height - 1);
        const tile = getTileAt(world, tx, ty);
        if (!tile || (tile.type !== TILE_TYPES.GRASS && tile.type !== TILE_TYPES.FOREST)) continue;

        const candidate = tileToWorld(tx, ty, TILE_SIZE);
        const farEnough = world.villages.every((v) => distance(candidate, v.center) >= minDistPx);
        if (!farEnough) continue;

        const spot = findWalkableNear(world, tx, ty, 3);
        pos = tileToWorld(spot.tx, spot.ty, TILE_SIZE);
      }
      if (!pos) continue; // mundo pequeno demais pra achar um spot livre; só pula esse

      counter += 1;
      predators.push(createPredator({ id: `predator-${counter}`, species: sp, position: pos }));
    }
  }

  return predators;
}
