// Decisão do predador: FSM simples (não utility AI completo como o do
// agente) reconsiderada periodicamente, igual em espírito ao loop de
// reconsideração do agente (decision.js) mas bem mais barata — sem
// perception/memory, só olha world.agents direto a cada reconsideração.
//
// patrolling -> chasing -> attacking -> fleeing, com leash (ver
// PREDATOR_LEASH_RADIUS_TILES) medido a partir do spawnAnchor, não da
// posição atual do predador — evita "perseguição infinita" se o agente
// foge pra longe.
//
// Movimento é linha reta até o alvo (sem pathfinding real) — simplificação
// deliberada, mesmo espírito da observação já registrada em
// agent/separation.js sobre não checar terreno: previsto revisitar se
// incomodar jogando (ex.: predador atravessando água raso).

import { distance, clamp } from '../utils/mathUtils.js';
import {
  TILE_SIZE,
  PREDATOR_SPECIES_STATS,
  PREDATOR_LEASH_RADIUS_TILES,
  PREDATOR_PATROL_RADIUS_TILES,
  PREDATOR_SPEED,
  PREDATOR_RECONSIDER_INTERVAL,
  PREDATOR_FLEE_HEALTH_FRACTION,
  PREDATOR_FLEE_RECOVER_FRACTION,
  PREDATOR_HEALTH_REGEN_PER_SEC,
} from '../utils/constants.js';
import { pushEvent } from '../world/eventLog.js';
import { getVillage, getAgent } from '../world/world.js';
import { SPECIES_LABEL } from './predator.js';

const LEASH_RADIUS_PX = PREDATOR_LEASH_RADIUS_TILES * TILE_SIZE;

function moveDirectlyToward(position, target, speed, dt) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return true; // já chegou
  const move = Math.min(speed * dt, d);
  position.x += (dx / d) * move;
  position.y += (dy / d) * move;
  return move >= d;
}

function pickPatrolTarget(predator, world) {
  const radiusPx = PREDATOR_PATROL_RADIUS_TILES * TILE_SIZE;
  const angle = world.rng.range(0, Math.PI * 2);
  const dist = world.rng.range(0, radiusPx);
  return {
    x: predator.spawnAnchor.x + Math.cos(angle) * dist,
    y: predator.spawnAnchor.y + Math.sin(angle) * dist,
  };
}

function pickTarget(predator, world, stats) {
  // já tem alvo? mantém se ainda vivo e o alvo continua dentro da leash
  // (medida a partir do spawnAnchor do predador, não da posição dele agora).
  if (predator.targetAgentId) {
    const current = ((t) => (t?.alive ? t : null))(getAgent(world, predator.targetAgentId));
    if (current && distance(current.position, predator.spawnAnchor) <= LEASH_RADIUS_PX) return current;
  }

  const detectionPx = stats.detectionRadiusTiles * TILE_SIZE;
  let nearest = null;
  let nearestDist = detectionPx;
  for (const agent of world.agents) {
    if (!agent.alive) continue;
    if (distance(agent.position, predator.spawnAnchor) > LEASH_RADIUS_PX) continue;
    const d = distance(predator.position, agent.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = agent;
    }
  }
  return nearest;
}

function reconsider(predator, world) {
  const stats = PREDATOR_SPECIES_STATS[predator.species];

  if (predator.state === 'fleeing') {
    if (predator.health >= predator.maxHealth * PREDATOR_FLEE_RECOVER_FRACTION) {
      predator.state = 'patrolling';
      predator.targetAgentId = null;
      predator.target = null;
    }
    return; // continua fugindo até recuperar
  }

  if (predator.health <= predator.maxHealth * PREDATOR_FLEE_HEALTH_FRACTION) {
    predator.state = 'fleeing';
    predator.targetAgentId = null;
    predator.target = null;
    return;
  }

  const target = pickTarget(predator, world, stats);
  if (!target) {
    predator.targetAgentId = null;
    predator.state = 'patrolling';
    return;
  }

  const wasChasingSomeoneElse = predator.targetAgentId && predator.targetAgentId !== target.id;
  predator.targetAgentId = target.id;
  if (wasChasingSomeoneElse) predator.target = null; // alvo novo: descarta destino de movimento antigo

  const d = distance(predator.position, target.position);
  if (d <= stats.attackRange) {
    if (predator.state !== 'attacking') pushEvent(world, `${describePredator(predator)} atacou alguém perto de ${villageNameFor(world, target)}`);
    predator.state = 'attacking';
  } else {
    predator.state = 'chasing';
  }
}

function describePredator(predator) {
  return SPECIES_LABEL[predator.species] ?? 'um animal';
}
function villageNameFor(world, agent) {
  return getVillage(world, agent.villageId)?.name ?? 'algum lugar';
}

// Velocidade é por espécie desde que a fauna caiu pra 2 espécies (demônio
// lento e pesado vs. monstro de sangue rápido e frágil) — PREDATOR_SPEED
// virou só o valor de referência pra quem não declarar o próprio.
function speedOf(predator) {
  return PREDATOR_SPECIES_STATS[predator.species]?.speed ?? PREDATOR_SPEED;
}

function stepPatrol(predator, world, dt) {
  if (!predator.target) predator.target = pickPatrolTarget(predator, world);
  const arrived = moveDirectlyToward(predator.position, predator.target, speedOf(predator), dt);
  if (arrived) predator.target = null;
}

function stepFlee(predator, world, dt) {
  if (!predator.target) predator.target = { ...predator.spawnAnchor };
  moveDirectlyToward(predator.position, predator.target, speedOf(predator), dt);
  if (!world.agents.some((a) => a.alive && distance(a.position, predator.position) < TILE_SIZE * 3)) {
    predator.health = clamp(predator.health + PREDATOR_HEALTH_REGEN_PER_SEC * dt, 0, predator.maxHealth);
  }
}

function stepChaseOrAttack(predator, world, dt, stats) {
  const target = ((t) => (t?.alive ? t : null))(getAgent(world, predator.targetAgentId));
  if (!target) return; // sumiu; próxima reconsideração resolve

  const d = distance(predator.position, target.position);
  if (predator.state === 'chasing') {
    if (d <= stats.attackRange) {
      predator.state = 'attacking';
      return;
    }
    moveDirectlyToward(predator.position, target.position, speedOf(predator), dt);
    return;
  }

  // attacking
  if (d > stats.attackRange) {
    predator.state = 'chasing';
    return;
  }
  const damage = stats.attackDamage * dt;
  target.health = clamp(target.health - damage, 0, 100);
  target.lastDamageSource = 'predator';
  target.lastDamagePredatorSpecies = predator.species;
  target.hitFlashAt = world.elapsedSeconds; // render/agentRenderer.js:HIT_FLASH_SECONDS
}

export function updatePredator(predator, world, dt) {
  if (!predator.alive) return;

  predator.decisionTimer -= dt;
  if (predator.decisionTimer <= 0) {
    predator.decisionTimer += PREDATOR_RECONSIDER_INTERVAL + world.rng.range(0, 0.2);
    reconsider(predator, world);
  }

  const stats = PREDATOR_SPECIES_STATS[predator.species];
  if (predator.state === 'patrolling') stepPatrol(predator, world, dt);
  else if (predator.state === 'fleeing') stepFlee(predator, world, dt);
  else stepChaseOrAttack(predator, world, dt, stats);

  if (predator.health <= 0) predator.alive = false;
}
