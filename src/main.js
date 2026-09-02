import { createWorld, findSpawnTile, findWalkableNear, getVillage } from './world/world.js';
import { generateDecorations } from './world/decorations.js';
import { spawnPredators } from './predator/predator.js';
import { updatePredator } from './predator/predatorAI.js';
import { buildSpatialIndex } from './world/spatialIndex.js';
import { createVillage, addResident } from './village/village.js';
import { computeDemand, updateDistress, updateChaos } from './village/stock.js';
import { updateTrade } from './village/trade.js';
import { createClan, addVillage as addVillageToClan, setStance } from './clan/clan.js';
import { proposeTreaty, signTreaty } from './clan/diplomacy.js';
import { updateClanDecision } from './clan/clanDecision.js';
import { createAgent } from './agent/agent.js';
import { updateNeeds } from './agent/needs.js';
import { scanPerception } from './agent/perception.js';
import { remember, decayMemory } from './agent/memory.js';
import { updateDecision } from './agent/decision.js';
import { classifyAgents, stepBackgroundAgent, feedBackgroundVillage } from './simulation/lod.js';
import { applySeparation } from './agent/separation.js';
import { ageAgent, checkDeath, updateVillageReproduction, updateHungerWarning, pruneDead } from './lifecycle/lifecycle.js';
import { createTimeState } from './core/time.js';
import { createGameLoop } from './core/gameLoop.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { attachInputHandlers } from './input/inputHandler.js';
import { createHud } from './ui/hud.js';
import { createInspector } from './ui/inspector.js';
import { createEventFeed } from './ui/eventFeed.js';
import { clamp, tileToWorld } from './utils/mathUtils.js';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_SIZE,
  AGENT_COUNT,
  FOUNDER_AGE,
  VILLAGE_COUNT,
  SECOND_VILLAGE_MIN_DIST,
  SECOND_VILLAGE_MAX_DIST,
  CLAN_COLORS,
  INITIAL_STANCE_WEIGHTS,
  NEUTRAL_TRADE_TREATY_CHANCE,
  CLAN_RECONSIDER_INTERVAL_MAX,
  CHAOS_NEEDS_DECAY_MULTIPLIER,
  FOUNDER_HUNGER_MIN,
  FOUNDER_HUNGER_MAX,
} from './utils/constants.js';

const canvas = document.getElementById('game-canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const seed = String(Date.now());
const world = createWorld({ seed, width: WORLD_WIDTH, height: WORLD_HEIGHT });

function spawnVillage({ id, name, tx, ty, specialization }) {
  const spot = findWalkableNear(world, tx, ty, 10);
  const village = createVillage({ id, name, center: tileToWorld(spot.tx, spot.ty, TILE_SIZE), specialization });
  world.villages.push(village);

  for (let i = 0; i < AGENT_COUNT; i++) {
    const offsetTx = spot.tx + world.rng.int(-3, 3);
    const offsetTy = spot.ty + world.rng.int(-3, 3);
    const agentSpot = findWalkableNear(world, offsetTx, offsetTy, 5);

    const agent = createAgent({
      id: `${id}-agent-${i + 1}`,
      position: tileToWorld(agentSpot.tx, agentSpot.ty, TILE_SIZE),
      villageId: village.id,
      decisionTimer: world.rng.range(0, 0.5),
      // Jitter pequeno na idade: só pra fundadores não baterem MAX_AGE no
      // exato mesmo tick uns dos outros. Uma faixa grande aqui piora as
      // coisas (fundador nascido perto do topo da faixa já nasce com pouco
      // tempo de vida) — a causa real de população zerar era MAX_AGE curto
      // demais pra reprodução acompanhar, corrigido lá (utils/constants.js).
      age: FOUNDER_AGE + world.rng.range(0, 15),
      rng: world.rng,
    });
    // Dessincroniza a fome inicial (ver FOUNDER_HUNGER_MIN/MAX,
    // utils/constants.js) — sem isso, todos os fundadores cruzam o limiar de
    // "comer" praticamente juntos e esvaziam o estoque da vila numa rajada só.
    agent.needs.hunger = world.rng.range(FOUNDER_HUNGER_MIN, FOUNDER_HUNGER_MAX);

    world.agents.push(agent);
    addResident(village, agent.id);
  }

  return village;
}

// Especialização sempre balanceada (metade comida, metade madeira,
// embaralhado) — garante que a interdependência do pilar 4 do design (vila
// sem comida própria depende de comércio) sempre exista nesse mundo, em vez
// de arriscar um sorteio 50/50 puro dar todo mundo igual por acaso.
const specializations = [];
for (let i = 0; i < VILLAGE_COUNT; i++) specializations.push(i % 2 === 0 ? 'food' : 'wood');
world.rng.shuffle(specializations);

// A 1ª vila nasce perto do centro do mapa; as demais espalhadas em ângulos
// uniformes ao redor dela (com jitter), pra não ficarem todas do mesmo lado.
const firstSpawn = findSpawnTile(world);
const villages = [];
const clans = [];

for (let i = 0; i < VILLAGE_COUNT; i++) {
  let tx, ty;
  if (i === 0) {
    tx = firstSpawn.tx;
    ty = firstSpawn.ty;
  } else {
    const angle = ((i - 1) / (VILLAGE_COUNT - 1)) * Math.PI * 2 + world.rng.range(-0.3, 0.3);
    const dist = world.rng.range(SECOND_VILLAGE_MIN_DIST, SECOND_VILLAGE_MAX_DIST);
    tx = clamp(Math.round(firstSpawn.tx + Math.cos(angle) * dist), 8, world.width - 9);
    ty = clamp(Math.round(firstSpawn.ty + Math.sin(angle) * dist), 8, world.height - 9);
  }

  const village = spawnVillage({
    id: `village-${i + 1}`,
    name: `Vila ${i + 1}`,
    tx,
    ty,
    specialization: specializations[i],
  });
  villages.push(village);

  const clan = createClan({
    id: `clan-${i + 1}`,
    name: `Clã da Vila ${i + 1}`,
    color: CLAN_COLORS[i % CLAN_COLORS.length],
    decisionTimer: world.rng.range(0, CLAN_RECONSIDER_INTERVAL_MAX),
  });
  addVillageToClan(clan, village);
  clans.push(clan);
}
world.clans.push(...clans);

const homeVillage = villages[0];

// Postura inicial sorteada independente pra cada par de clãs.
for (let i = 0; i < clans.length; i++) {
  for (let j = i + 1; j < clans.length; j++) {
    const clanA = clans[i];
    const clanB = clans[j];
    const initialStance = world.rng.weighted(INITIAL_STANCE_WEIGHTS);

    if (initialStance === 'allied') {
      // demonstra o fluxo de tratado de verdade no caso amistoso; guerra/
      // tensão/neutro nascem como estado padrão, sem documento assinado.
      const treaty = proposeTreaty(clanA, clanB, 'alliance');
      signTreaty(treaty, clanA, clanB);
    } else {
      setStance(clanA, clanB, initialStance);
      if (initialStance === 'neutral' && world.rng.next() < NEUTRAL_TRADE_TREATY_CHANCE) {
        // vínculo econômico sem aliança militar completa — habilita
        // comércio (village/trade.js) sem mudar a postura neutra.
        const tradeTreaty = proposeTreaty(clanA, clanB, 'trade');
        signTreaty(tradeTreaty, clanA, clanB);
      }
    }
  }
}

world.decorations = generateDecorations(world);
world.predators = spawnPredators(world);

const camera = createCamera({
  x: homeVillage.center.x,
  y: homeVillage.center.y,
  zoom: 1,
  worldPxWidth: world.width * TILE_SIZE,
  worldPxHeight: world.height * TILE_SIZE,
});
camera.clampToViewport(canvas.width, canvas.height);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.clampToViewport(canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);

const renderer = createRenderer(canvas, camera);
const timeState = createTimeState({ speed: 1 });
const debugState = { showPerception: false };
const uiState = { selectedAgentId: null, selectedVillageId: null };

attachInputHandlers(canvas, { camera, timeState, debugState, world, uiState });
const hud = createHud(document.getElementById('hud'), timeState);
const inspector = createInspector(document.getElementById('inspector'));
const eventFeed = createEventFeed(document.getElementById('event-feed'));

let lastSelectedAgentId = null;
let lastSelectedVillageId = null;

const loop = createGameLoop({
  timeState,
  update(dt) {
    if (dt <= 0) return;
    world.elapsedSeconds += dt;

    for (const v of world.villages) {
      computeDemand(v);
      updateDistress(v, dt);
      updateChaos(v);
    }

    for (const c of world.clans) {
      updateClanDecision(c, world, dt);
    }

    updateTrade(world, dt);

    world.spatialIndex = buildSpatialIndex(world.agents);
    const { active, background } = classifyAgents(world, camera, canvas.width, canvas.height);

    for (const agent of active) {
      scanPerception(agent, world);
      for (const tile of agent.perception.tiles) {
        remember(agent.memory, tile);
      }
      decayMemory(agent.memory, dt);

      const village = getVillage(world, agent.villageId);
      updateNeeds(agent.needs, village?.inChaos ? dt * CHAOS_NEEDS_DECAY_MULTIPLIER : dt);
      ageAgent(agent, dt);
      checkDeath(agent, world, dt);
      if (!agent.alive) continue;

      updateDecision(agent, world, dt);
    }

    applySeparation(
      active.filter((a) => a.alive),
      dt,
    );

    for (const predator of world.predators) {
      updatePredator(predator, world, dt);
    }

    const backgroundByVillage = new Map();
    for (const agent of background) {
      stepBackgroundAgent(agent, dt);
      ageAgent(agent, dt);
      checkDeath(agent, world, dt);
      if (!agent.alive) continue;
      if (!backgroundByVillage.has(agent.villageId)) backgroundByVillage.set(agent.villageId, []);
      backgroundByVillage.get(agent.villageId).push(agent);
    }

    for (const v of world.villages) {
      const residents = backgroundByVillage.get(v.id);
      if (residents) feedBackgroundVillage(v, residents, dt);
      updateVillageReproduction(v, world, dt);
      updateHungerWarning(v, world);
    }

    pruneDead(world, dt);
  },
  render(realDt) {
    let selectionState = 'none';
    let selectedAgent = null;
    if (uiState.selectedAgentId) {
      // Agente morto continua em world.agents durante o "linger" da animação
      // de morte (lifecycle.js:pruneDead) — sem o `a.alive`, o inspetor/HUD
      // achava que ele ainda tava vivo até o corpo sumir de vez.
      selectedAgent = world.agents.find((a) => a.id === uiState.selectedAgentId && a.alive) ?? null;
      selectionState = selectedAgent ? 'alive' : 'dead';
    }
    const selectedVillage = uiState.selectedVillageId
      ? (world.villages.find((v) => v.id === uiState.selectedVillageId) ?? null)
      : null;

    // Câmera segue a seleção nova com easing (render/camera.js:panToTarget)
    // em vez de corte seco — só dispara na TROCA de seleção, não a cada
    // frame (senão nunca deixaria o jogador arrastar livremente depois).
    if (uiState.selectedAgentId !== lastSelectedAgentId || uiState.selectedVillageId !== lastSelectedVillageId) {
      lastSelectedAgentId = uiState.selectedAgentId;
      lastSelectedVillageId = uiState.selectedVillageId;
      const target = selectedAgent?.position ?? selectedVillage?.center;
      if (target) camera.panToTarget(target.x, target.y);
    }

    if (world.pendingShake) {
      camera.triggerShake(world.pendingShake.intensity, world.pendingShake.duration);
      world.pendingShake = null;
    }
    camera.tick(realDt ?? 0, canvas.width, canvas.height);

    renderer.render(world, debugState, uiState.selectedAgentId, uiState.selectedVillageId, realDt ?? 0);

    hud.updateAgentStatus(selectedAgent, selectionState);
    inspector.update({ agent: selectedAgent, selectionState, village: selectedVillage }, world);
    eventFeed.update(world.events);
  },
});

loop.start();
