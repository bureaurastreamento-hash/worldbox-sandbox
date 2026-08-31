import { createWorld, findSpawnTile, findWalkableNear } from './world/world.js';
import { createVillage, addResident, setRelation } from './village/village.js';
import { computeDemand } from './village/stock.js';
import { createAgent } from './agent/agent.js';
import { updateNeeds } from './agent/needs.js';
import { scanPerception } from './agent/perception.js';
import { remember, decayMemory } from './agent/memory.js';
import { updateDecision } from './agent/decision.js';
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
  HOSTILE_CHANCE,
} from './utils/constants.js';

const canvas = document.getElementById('game-canvas');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

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
    });

    world.agents.push(agent);
    addResident(village, agent.id);
  }

  return village;
}

const homeSpawn = findSpawnTile(world);
const homeVillage = spawnVillage({ id: 'village-1', name: 'Vila', tx: homeSpawn.tx, ty: homeSpawn.ty });

const angle = world.rng.range(0, Math.PI * 2);
const dist = world.rng.range(SECOND_VILLAGE_MIN_DIST, SECOND_VILLAGE_MAX_DIST);
const rivalTx = clamp(Math.round(homeSpawn.tx + Math.cos(angle) * dist), 8, world.width - 9);
const rivalTy = clamp(Math.round(homeSpawn.ty + Math.sin(angle) * dist), 8, world.height - 9);
const rivalVillage = spawnVillage({ id: 'village-2', name: 'Vila Vizinha', tx: rivalTx, ty: rivalTy });

setRelation(homeVillage, rivalVillage, world.rng.next() < HOSTILE_CHANCE ? 'hostile' : 'neutral');

const camera = createCamera({
  x: homeVillage.center.x,
  y: homeVillage.center.y,
  zoom: 1,
});

const renderer = createRenderer(canvas, camera);
const timeState = createTimeState({ speed: 1 });
const debugState = { showPerception: false };

attachInputHandlers(canvas, camera, timeState, debugState);
const hud = createHud(document.getElementById('hud'), timeState);

const loop = createGameLoop({
  timeState,
  update(dt) {
    if (dt <= 0) return;

    for (const v of world.villages) {
      computeDemand(v);
    }

    for (const agent of world.agents) {
      scanPerception(agent, world);
      for (const tile of agent.perception.tiles) {
        remember(agent.memory, tile);
      }
      decayMemory(agent.memory, dt);

      updateNeeds(agent.needs, dt);
      ageAgent(agent, dt);
      checkDeath(agent, dt);
      if (!agent.alive) continue;

      updateDecision(agent, world, dt);
    }

    for (const v of world.villages) {
      updateVillageReproduction(v, world, dt);
    }

    pruneDead(world);
  },
  render() {
    renderer.render(world, debugState);
    hud.updateAgentStatus(world.agents[0]);
  },
});

loop.start();
