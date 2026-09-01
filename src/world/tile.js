export const TILE_TYPES = {
  WATER: 'water',
  SAND: 'sand',
  GRASS: 'grass',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
};

// `resource` é opcional — só tiles de montanha ganham um (stone/coal/iron/
// gold), atribuído por world/terrain.js:resourceForMountain na geração.
export function createTile(type) {
  return { type };
}

export function isWalkable(type) {
  return type !== TILE_TYPES.WATER && type !== TILE_TYPES.MOUNTAIN;
}
