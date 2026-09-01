import { MIN_ZOOM, MAX_ZOOM } from '../utils/constants.js';
import { clamp } from '../utils/mathUtils.js';

export function createCamera({ x = 0, y = 0, zoom = 1, worldPxWidth = 0, worldPxHeight = 0 } = {}) {
  const camera = { x, y, zoom, worldPxWidth, worldPxHeight };

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
    camera.x -= dxScreen / camera.zoom;
    camera.y -= dyScreen / camera.zoom;
    clampToBounds(viewW, viewH);
  };

  camera.worldToScreen = (wx, wy, viewW, viewH) => ({
    x: (wx - camera.x) * camera.zoom + viewW / 2,
    y: (wy - camera.y) * camera.zoom + viewH / 2,
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

  return camera;
}
