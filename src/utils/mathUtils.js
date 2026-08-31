export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function tileToWorld(tx, ty, tileSize) {
  return { x: (tx + 0.5) * tileSize, y: (ty + 0.5) * tileSize };
}

export function worldToTile(wx, wy, tileSize) {
  return { tx: Math.floor(wx / tileSize), ty: Math.floor(wy / tileSize) };
}
