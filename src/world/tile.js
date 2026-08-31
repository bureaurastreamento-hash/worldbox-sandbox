export const TILE_TYPES = {
  WATER: 'water',
  GRASS: 'grass',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
};

export function createTile(type) {
  return { type };
}

export function isWalkable(type) {
  return type !== TILE_TYPES.WATER && type !== TILE_TYPES.MOUNTAIN;
}
