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
import { COMBAT_DAMAGE_PER_SEC, PERCEPTION_RADIUS, TILE_SIZE } from '../utils/constants.js';

// Alcance padrão de "percebi um predador": o mesmo raio de visão que o
// agente usa pra qualquer outra coisa (agent/perception.js). Predador não
// entra em `agent.perception.tiles` (que só cobre tiles), então a varredura
// é direta em world.predators — lista pequena, barato —, mas o corte de
// distância tem que existir aqui, já que não existe em nenhum outro lugar.
const DEFAULT_SIGHT_RANGE = PERCEPTION_RADIUS * TILE_SIZE;

// Mais próximo entre os predadores vivos DENTRO DO ALCANCE DE VISÃO.
//
// O limite de distância é o ponto inteiro desta função. Sem ele (como era
// até aqui), ela devolvia o predador mais próximo do mundo inteiro, a 200
// tiles se fosse o caso — e como `FLEE_PREDATOR_SCORE` (0.9) é o score mais
// alto do jogo, todo civil entrava em fuga permanente enquanto existisse um
// único predador vivo em qualquer canto do mapa. Ninguém colhia, ninguém
// entregava, ninguém comia: as quatro vilas morriam de fome em ~100s
// simulados, sem um só agente ter sido tocado por um predador. O mesmo
// descuido travava a regeneração de vida em `lifecycle.js:checkDeath`, que
// usa esta função pra decidir se há ameaça por perto.
export function findNearestPredator(agent, world, maxDistance = DEFAULT_SIGHT_RANGE) {
  let nearest = null;
  let nearestDist = maxDistance;

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
