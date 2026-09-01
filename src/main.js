import { createWorld, findSpawnTile, findWalkableNear } from './world/world.js';
import { buildSpatialIndex } from './world/spatialIndex.js';
import { createVillage, addResident } from './village/village.js';
import { computeDemand } from './village/stock.js';
import { updateTrade } from './village/trade.js';
import { createClan, addVillage as addVillageToClan, setStance } from './clan/clan.js';
import { proposeTreaty, signTreaty } from './clan/diplomacy.js';
import { createAgent } from './agent/agent.js';
import { updateNeeds } from './agent/needs.js';
import { scanPerception } from './agent/perception.js';
import { remember, decayMemory } from './agent/memory.js';
import { updateDecision } from './agent/decision.js';
import { classifyAgents, stepBackgroundAgent } from './simulation/lod.js';
import { ageAgent, checkDeath, updateVillageReproduction, pruneDead } from './lifecycle/lifecycle.js';
import { createTimeState } from './core/time.js';
import { createGameLoop } from './core/gameLoop.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { attachInputHandlers } from './input/inputHandler.js';
import { createHud } from './ui/hud.js';
import { clamp, tileToWorld } from './utils/mathUtils.js';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_SIZE,
  AGENT_COUNT,
  FOUNDER_AGE,
  SECOND_VILLAGE_MIN_DIST,
  SECOND_VILLAGE_MAX_DIST,
  WAR_VILLAGE_MIN_DIST,
  WAR_VILLAGE_MAX_DIST,
  INITIAL_STANCE_WEIGHTS,
  NEUTRAL_TRADE_TREATY_CHANCE,
} from './utils/constants.js';

const canvas = document.getElementById('game-canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const seed = String(Date.now());
const world = createWorld({ seed, width: WORLD_WIDTH, height: WORLD_HEIGHT });

function spawnVillage({ id, name, tx, ty }) {
  const spot = findWalkableNear(world, tx, ty, 10);
  const village = createVillage({ id, name, center: tileToWorld(spot.tx, spot.ty, TILE_SIZE) });
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
      age: FOUNDER_AGE,
      skinTone: world.rng.next() < 0.5 ? 'light' : 'dark',
      gender: world.rng.next() < 0.5 ? 'man' : 'woman',
    });

    world.agents.push(agent);
    addResident(village, agent.id);
  }

  return village;
}

const homeSpawn = findSpawnTile(world);
const homeVillage = spawnVillage({ id: 'village-1', name: 'Vila', tx: homeSpawn.tx, ty: homeSpawn.ty });

// Sorteia a postura ANTES de posicionar a 2ª vila: se vai dar guerra, ela
// nasce bem mais perto — territórios/rondas precisam ter chance real de se
// cruzar na fronteira, senão as duas nunca se encontrariam pra lutar.
const initialStance = world.rng.weighted(INITIAL_STANCE_WEIGHTS);
const [minDist, maxDist] =
  initialStance === 'war' ? [WAR_VILLAGE_MIN_DIST, WAR_VILLAGE_MAX_DIST] : [SECOND_VILLAGE_MIN_DIST, SECOND_VILLAGE_MAX_DIST];

const angle = world.rng.range(0, Math.PI * 2);
const dist = world.rng.range(minDist, maxDist);
const rivalTx = clamp(Math.round(homeSpawn.tx + Math.cos(angle) * dist), 8, world.width - 9);
const rivalTy = clamp(Math.round(homeSpawn.ty + Math.sin(angle) * dist), 8, world.height - 9);
const rivalVillage = spawnVillage({ id: 'village-2', name: 'Vila Vizinha', tx: rivalTx, ty: rivalTy });

const homeClan = createClan({ id: 'clan-1', name: 'Clã de Vila', color: '#4a7fd9' });
const rivalClan = createClan({ id: 'clan-2', name: 'Clã de Vila Vizinha', color: '#c9432b' });
addVillageToClan(homeClan, homeVillage);
addVillageToClan(rivalClan, rivalVillage);
world.clans.push(homeClan, rivalClan);

if (initialStance === 'allied') {
  // demonstra o fluxo de tratado de verdade no caso amistoso; guerra/tensão/
  // neutro nascem como o estado padrão, sem documento nenhum assinado.
  const treaty = proposeTreaty(homeClan, rivalClan, 'alliance');
  signTreaty(treaty, homeClan, rivalClan);
} else {
  setStance(homeClan, rivalClan, initialStance);
  if (initialStance === 'neutral' && world.rng.next() < NEUTRAL_TRADE_TREATY_CHANCE) {
    // vínculo econômico sem aliança militar completa — habilita comércio
    // (village/trade.js) sem mudar a postura neutra.
    const tradeTreaty = proposeTreaty(homeClan, rivalClan, 'trade');
    signTreaty(tradeTreaty, homeClan, rivalClan);
  }
}

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
const uiState = { selectedAgentId: null };

attachInputHandlers(canvas, { camera, timeState, debugState, world, uiState });
const hud = createHud(document.getElementById('hud'), timeState);

const loop = createGameLoop({
  timeState,
  update(dt) {
    if (dt <= 0) return;

    for (const v of world.villages) {
      computeDemand(v);
    }

    updateTrade(world, dt);

    world.spatialIndex = buildSpatialIndex(world.agents);
    const { active, background } = classifyAgents(world, camera);

    for (const agent of active) {
      scanPerception(agent, world);
      for (const tile of agent.perception.tiles) {
        remember(agent.memory, tile);
      }
      decayMemory(agent.memory, dt);

      updateNeeds(agent.needs, dt);
      ageAgent(agent, dt);
      checkDeath(agent, world, dt);
      if (!agent.alive) continue;

      updateDecision(agent, world, dt);
    }

    for (const agent of background) {
      stepBackgroundAgent(agent, dt);
      ageAgent(agent, dt);
      checkDeath(agent, world, dt);
    }

    for (const v of world.villages) {
      updateVillageReproduction(v, world, dt);
    }

    pruneDead(world);
  },
  render() {
    renderer.render(world, debugState, uiState.selectedAgentId);

    let selectionState = 'none';
    let selectedAgent = null;
    if (uiState.selectedAgentId) {
      selectedAgent = world.agents.find((a) => a.id === uiState.selectedAgentId) ?? null;
      selectionState = selectedAgent ? 'alive' : 'dead';
    }
    hud.updateAgentStatus(selectedAgent, selectionState);
  },
});

loop.start();
