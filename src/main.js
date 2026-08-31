import { createWorld, findSpawnTile, findWalkableNear } from './world/world.js';
import { createVillage, addResident } from './village/village.js';
import { computeDemand } from './village/stock.js';
import { createAgent } from './agent/agent.js';
import { updateNeeds } from './agent/needs.js';
import { scanPerception } from './agent/perception.js';
import { remember, decayMemory } from './agent/memory.js';
import { updateDecision } from './agent/decision.js';
import { createTimeState } from './core/time.js';
import { createGameLoop } from './core/gameLoop.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { attachInputHandlers } from './input/inputHandler.js';
import { createHud } from './ui/hud.js';
import { tileToWorld } from './utils/mathUtils.js';
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE, AGENT_COUNT } from './utils/constants.js';

const canvas = document.getElementById('game-canvas');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const seed = String(Date.now());
const world = createWorld({ seed, width: WORLD_WIDTH, height: WORLD_HEIGHT });

const villageSpawn = findSpawnTile(world);
const village = createVillage({
  id: 'village-1',
  name: 'Vila',
  center: tileToWorld(villageSpawn.tx, villageSpawn.ty, TILE_SIZE),
});
world.villages.push(village);

for (let i = 0; i < AGENT_COUNT; i++) {
  const offsetTx = villageSpawn.tx + world.rng.int(-3, 3);
  const offsetTy = villageSpawn.ty + world.rng.int(-3, 3);
  const spot = findWalkableNear(world, offsetTx, offsetTy, 5);

  const agent = createAgent({
    id: `agent-${i + 1}`,
    position: tileToWorld(spot.tx, spot.ty, TILE_SIZE),
    villageId: village.id,
    decisionTimer: world.rng.range(0, 0.5),
  });

  world.agents.push(agent);
  addResident(village, agent.id);
}

const camera = createCamera({
  x: village.center.x,
  y: village.center.y,
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
      updateDecision(agent, world, dt);
    }
  },
  render() {
    renderer.render(world, debugState);
    hud.updateAgentStatus(world.agents[0]);
  },
});

loop.start();
