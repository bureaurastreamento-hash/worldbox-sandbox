import { MIN_ZOOM, MAX_ZOOM } from '../utils/constants.js';
import { clamp } from '../utils/mathUtils.js';

export function createCamera({ x = 0, y = 0, zoom = 1 } = {}) {
  const camera = { x, y, zoom };

  camera.pan = (dxScreen, dyScreen) => {
    camera.x -= dxScreen / camera.zoom;
    camera.y -= dyScreen / camera.zoom;
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
  };

  return camera;
}
