import { TIME_SPEEDS, TILE_SIZE } from '../utils/constants.js';

const CLICK_MOVE_TOLERANCE = 5; // px de tela; abaixo disso um mouseup é clique, não arrasto
const SELECT_RADIUS = 14; // px de tela

// Agente tem prioridade (clique mais específico); sem agente por perto,
// clicar dentro do círculo de território de uma vila a seleciona — dá pra
// inspecionar a vila/clã (ui/inspector.js) sem precisar de um agente vivo
// selecionado. Os dois tipos de seleção são mutuamente exclusivos.
function selectAt(screenX, screenY, canvas, camera, world, uiState) {
  let closestAgent = null;
  let closestDist = SELECT_RADIUS;

  for (const agent of world.agents) {
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, canvas.width, canvas.height);
    const d = Math.hypot(pos.x - screenX, pos.y - screenY);
    if (d < closestDist) {
      closestDist = d;
      closestAgent = agent;
    }
  }

  if (closestAgent) {
    uiState.selectedAgentId = closestAgent.id;
    uiState.selectedVillageId = null;
    return;
  }

  for (const village of world.villages) {
    const pos = camera.worldToScreen(village.center.x, village.center.y, canvas.width, canvas.height);
    const screenRadius = village.territory.radius * TILE_SIZE * camera.zoom;
    if (Math.hypot(pos.x - screenX, pos.y - screenY) < screenRadius) {
      uiState.selectedVillageId = village.id;
      uiState.selectedAgentId = null;
      return;
    }
  }

  uiState.selectedAgentId = null;
  uiState.selectedVillageId = null;
}

// context: { camera, timeState, debugState, world, uiState }
export function attachInputHandlers(canvas, context) {
  const { camera, timeState, debugState, world, uiState } = context;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let movedSinceDown = 0;

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    movedSinceDown = 0;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    movedSinceDown += Math.abs(dx) + Math.abs(dy);
    camera.pan(dx, dy, canvas.width, canvas.height);
  });

  window.addEventListener('mouseup', (e) => {
    if (dragging && movedSinceDown < CLICK_MOVE_TOLERANCE && world && uiState) {
      const rect = canvas.getBoundingClientRect();
      selectAt(e.clientX - rect.left, e.clientY - rect.top, canvas, camera, world, uiState);
    }
    dragging = false;
  });
  canvas.addEventListener('mouseleave', () => {
    dragging = false;
  });

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      camera.zoomBy(factor, screenX, screenY, canvas.width, canvas.height);
    },
    { passive: false },
  );

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      timeState.togglePause();
    } else if (e.key >= '1' && e.key <= String(TIME_SPEEDS.length)) {
      timeState.setSpeed(TIME_SPEEDS[Number(e.key) - 1]);
    } else if (e.code === 'KeyD' && debugState) {
      debugState.showPerception = !debugState.showPerception;
    }
  });
}
