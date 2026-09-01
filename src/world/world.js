import { generateTerrain } from './terrain.js';
import { isWalkable } from './tile.js';
import { createRng } from '../utils/rng.js';

export function createWorld({ seed, width, height }) {
  const tiles = generateTerrain({ seed, width, height });
  const rng = createRng(`${seed}-gameplay`);

  return {
    seed,
    width,
    height,
    tiles,
    agents: [],
    villages: [],
    clans: [],
    decorations: [], // preenchido por world/decorations.js depois de as vilas existirem
    rng,
  };
}

export function getTileAt(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return null;
  return world.tiles[ty][tx];
}

export function getVillage(world, villageId) {
  return world.villages.find((v) => v.id === villageId) ?? null;
}

export function getClan(world, clanId) {
  return world.clans.find((c) => c.id === clanId) ?? null;
}

// Espirala a partir de (centerTx, centerTy) até achar um tile andável.
export function findWalkableNear(world, centerTx, centerTy, maxRadius = Math.max(world.width, world.height)) {
  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tile = getTileAt(world, centerTx + dx, centerTy + dy);
        if (tile && isWalkable(tile.type)) return { tx: centerTx + dx, ty: centerTy + dy };
      }
    }
  }
  return { tx: centerTx, ty: centerTy };
}

export function findSpawnTile(world) {
  return findWalkableNear(world, Math.floor(world.width / 2), Math.floor(world.height / 2));
}
