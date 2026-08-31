import { TIME_SPEEDS } from '../utils/constants.js';

export function attachInputHandlers(canvas, camera, timeState) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    camera.pan(dx, dy);
  });

  window.addEventListener('mouseup', () => {
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
    }
  });
}
