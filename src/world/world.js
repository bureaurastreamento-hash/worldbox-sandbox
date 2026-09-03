import { generateTerrain } from './terrain.js';
import { isWalkable } from './tile.js';
import { createRng } from '../utils/rng.js';
import { createClaims } from './claims.js';

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
    // Rng própria pro sorteio de rumo de expedição (village/expedition.js),
    // mesmo padrão de world/decorations.js e predator/predator.js. Não é
    // preciosismo: sem ela, ligar ou desligar exploração desvia a sequência
    // de `rng` inteira, e duas partidas com a MESMA seed deixam de ser
    // comparáveis — reprodução, postura de clã e tudo o mais divergem. Foi o
    // que invalidou a primeira rodada de medição A/B desta feature.
    expeditionRng: createRng(`${seed}-expeditions`),
    events: [], // feed de eventos institucionais, ver world/eventLog.js
    claims: createClaims(), // reserva de tile de recurso, ver world/claims.js
    elapsedSeconds: 0, // tempo simulado total, incrementado em main.js — só usado pra registrar quando um evento aconteceu
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
