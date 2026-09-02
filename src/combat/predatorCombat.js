// Combate agente-vs-predador — paralelo a combat.js (agente-vs-agente), não
// reaproveitado dali de propósito: um predador não tem clã (isEnemy não se
// aplica) e o dano não é simétrico por natureza (espécies diferentes batem
// diferente; o agente sempre bate o mesmo tanto, ver COMBAT_DAMAGE_PER_SEC).
// Módulo próprio evita arriscar a combat.js:resolveEngagement que já
// funciona pra guerra entre clãs.
//
// O predador já causa dano no agente sozinho, na própria IA
// (predator/predatorAI.js:stepChaseOrAttack, roda independente do que o
// agente decide fazer — foge ou não, se alcançado, apanha). Este módulo só
// cobre o outro sentido: o agente batendo de volta, só quando ele mesmo
// escolhe `fightPredator` (ver agent/actions/fightPredator.js).

import { distance, clamp } from '../utils/mathUtils.js';
import { COMBAT_DAMAGE_PER_SEC } from '../utils/constants.js';

// Mais próximo entre os predadores vivos percebidos (agent.perception.tiles
// não cobre entidades; predador ainda não tem "percepção" própria do
// agente, então varre world.predators direto — lista pequena, barato).
export function findNearestPredator(agent, world) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const predator of world.predators ?? []) {
    if (!predator.alive) continue;
    const d = distance(agent.position, predator.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = predator;
    }
  }

  return nearest;
}

export function resolvePredatorEngagement(agent, predator, dt, world) {
  const damage = COMBAT_DAMAGE_PER_SEC * dt;
  predator.health = clamp(predator.health - damage, 0, predator.maxHealth);
  if (world) predator.hitFlashAt = world.elapsedSeconds;
  if (predator.health <= 0) {
    predator.alive = false;
    // Tremor de câmera (render/camera.js:triggerShake, consumido em
    // main.js) — momento decisivo, não todo tick de dano (senão sacudiria
    // o jogo inteiro durante toda a luta).
    if (world) world.pendingShake = { intensity: 6, duration: 0.25 };
  }
}
