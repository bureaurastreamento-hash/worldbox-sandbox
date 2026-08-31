import { createWorld, findSpawnTile } from './world/world.js';
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
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from './utils/constants.js';

const canvas = document.getElementById('game-canvas');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const seed = String(Date.now());
const world = createWorld({ seed, width: WORLD_WIDTH, height: WORLD_HEIGHT });

const spawn = findSpawnTile(world);
world.agents.push(
  createAgent({
    id: 'agent-1',
    position: tileToWorld(spawn.tx, spawn.ty, TILE_SIZE),
    decisionTimer: world.rng.range(0, 0.5),
  }),
);

const camera = createCamera({
  x: (world.width * TILE_SIZE) / 2,
  y: (world.height * TILE_SIZE) / 2,
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
