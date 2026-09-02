import { MIN_ZOOM, MAX_ZOOM } from '../utils/constants.js';
import { clamp } from '../utils/mathUtils.js';

// Velocidade do easing de câmera (panToTarget) — fração da distância
// restante percorrida por segundo; não é linear por tempo fixo de propósito,
// pra parecer suave tanto pra uma seleção pertinho quanto uma do outro lado
// do mapa (sempre "alcança" numa sensação de tempo parecida).
const PAN_EASE_PER_SEC = 4;
const PAN_ARRIVE_EPSILON = 2; // px de mundo; abaixo disso, encerra o easing

export function createCamera({ x = 0, y = 0, zoom = 1, worldPxWidth = 0, worldPxHeight = 0 } = {}) {
  const camera = { x, y, zoom, worldPxWidth, worldPxHeight };
  let followTarget = null; // { x, y } | null — alvo do easing de panToTarget
  let shakeTime = 0;
  let shakeDuration = 0;
  let shakeIntensity = 0;
  let shakeX = 0;
  let shakeY = 0;

  // Zoom mínimo que ainda cabe o mapa inteiro na tela ("contain": encolhe até
  // a maior dimensão do mapa caber, sobra espaço na outra — clampToBounds
  // centraliza esse espaço sobrando). Não confundir com "cover" (max em vez
  // de min), que força mostrar sempre a tela cheia de mapa mas nunca deixa
  // ver o mapa inteiro de uma vez se a proporção da janela não bater com a
  // do mundo — era o comportamento antigo, e o motivo do mapa "não caber"
  // mesmo no menor zoom.
  function minZoomForViewport(viewW, viewH) {
    if (!camera.worldPxWidth || !camera.worldPxHeight) return MIN_ZOOM;
    return Math.max(MIN_ZOOM, Math.min(viewW / camera.worldPxWidth, viewH / camera.worldPxHeight));
  }

  function clampToBounds(viewW, viewH) {
    if (!camera.worldPxWidth || !camera.worldPxHeight || !viewW || !viewH) return;

    const minZoom = minZoomForViewport(viewW, viewH);
    if (camera.zoom < minZoom) camera.zoom = minZoom;

    const halfViewW = viewW / 2 / camera.zoom;
    const halfViewH = viewH / 2 / camera.zoom;

    camera.x =
      halfViewW * 2 >= camera.worldPxWidth
        ? camera.worldPxWidth / 2
        : clamp(camera.x, halfViewW, camera.worldPxWidth - halfViewW);

    camera.y =
      halfViewH * 2 >= camera.worldPxHeight
        ? camera.worldPxHeight / 2
        : clamp(camera.y, halfViewH, camera.worldPxHeight - halfViewH);
  }

  camera.pan = (dxScreen, dyScreen, viewW, viewH) => {
    followTarget = null; // arrastar na mão cancela qualquer easing programático em andamento
    camera.x -= dxScreen / camera.zoom;
    camera.y -= dyScreen / camera.zoom;
    clampToBounds(viewW, viewH);
  };

  camera.worldToScreen = (wx, wy, viewW, viewH) => ({
    x: (wx - camera.x) * camera.zoom + viewW / 2 + shakeX,
    y: (wy - camera.y) * camera.zoom + viewH / 2 + shakeY,
  });

  camera.screenToWorld = (sx, sy, viewW, viewH) => ({
    x: (sx - viewW / 2) / camera.zoom + camera.x,
    y: (sy - viewH / 2) / camera.zoom + camera.y,
  });

  camera.zoomBy = (factor, screenX, screenY, viewW, viewH) => {
    const before = camera.screenToWorld(screenX, screenY, viewW, viewH);
    camera.zoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const after = camera.screenToWorld(screenX, screenY, viewW, viewH);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
    clampToBounds(viewW, viewH);
  };

  // Chamar em resize: viewport mudou de tamanho, então o zoom mínimo e o
  // clamp de posição podem ter mudado mesmo sem o usuário mexer em nada.
  camera.clampToViewport = (viewW, viewH) => clampToBounds(viewW, viewH);

  // Ease suave até (worldX, worldY) em vez de corte seco — usado ao trocar a
  // seleção de agente/vila (main.js). Um pan de arrasto do usuário
  // (camera.pan) cancela o easing em andamento (mexer a câmera na mão deve
  // ganhar de qualquer alvo programático).
  camera.panToTarget = (worldX, worldY) => {
    followTarget = { x: worldX, y: worldY };
  };
  camera.stopFollowing = () => {
    followTarget = null;
  };

  // Tremor leve de câmera num golpe forte (combat.js/predatorCombat.js) —
  // decai linearmente até zero ao longo de `durationSec`. Intensidade em px
  // de tela, independente de zoom (sempre a mesma sacudida visual).
  camera.triggerShake = (intensity, durationSec) => {
    shakeIntensity = Math.max(shakeIntensity, intensity);
    shakeDuration = Math.max(shakeDuration, durationSec);
    shakeTime = shakeDuration;
  };

  // Chamado uma vez por frame (main.js) — avança o easing de panToTarget e o
  // decaimento do shake. Nenhum dos dois depende de dt do jogo (timeState);
  // usa tempo real, pra não ficar em câmera lenta/ausente quando o jogo está
  // pausado ou em velocidade baixa — feedback de UI, não simulação.
  camera.tick = (realDtSeconds, viewW, viewH) => {
    if (followTarget) {
      const dx = followTarget.x - camera.x;
      const dy = followTarget.y - camera.y;
      const dist = Math.hypot(dx, dy);
      if (dist < PAN_ARRIVE_EPSILON) {
        camera.x = followTarget.x;
        camera.y = followTarget.y;
        followTarget = null;
      } else {
        const t = Math.min(1, PAN_EASE_PER_SEC * realDtSeconds);
        camera.x += dx * t;
        camera.y += dy * t;
      }
      if (viewW && viewH) clampToBounds(viewW, viewH);
    }

    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - realDtSeconds);
      const falloff = shakeDuration > 0 ? shakeTime / shakeDuration : 0;
      const mag = shakeIntensity * falloff;
      shakeX = (Math.random() * 2 - 1) * mag;
      shakeY = (Math.random() * 2 - 1) * mag;
      if (shakeTime === 0) {
        shakeX = 0;
        shakeY = 0;
        shakeIntensity = 0;
      }
    }
  };

  return camera;
}
