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
    rng,
  };
}

export function getTileAt(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return null;
  return world.tiles[ty][tx];
}

// Espirala a partir do centro do mundo até achar um tile andável, para
// posicionar o agente inicial sem depender de o centro cair em água.
export function findSpawnTile(world) {
  const cx = Math.floor(world.width / 2);
  const cy = Math.floor(world.height / 2);
  const maxRadius = Math.max(world.width, world.height);

  for (let r = 0; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tile = getTileAt(world, cx + dx, cy + dy);
        if (tile && isWalkable(tile.type)) return { tx: cx + dx, ty: cy + dy };
      }
    }
  }
  return { tx: cx, ty: cy };
}
