// Página de validação do SpriteManager (sprite-lab.html). Não faz parte do
// jogo — existe pra conferir a olho que o recorte, a contagem de quadros, o
// ritmo e as direções estão certos antes de ligar isso em qualquer renderer.

import { SpriteManager } from './spriteManager.js';
import { createAnimator, DIRECTION } from './animator.js';
import { FORMAT } from './sheetFormats.js';
import { STRIP_SHEETS, GRID_SHEETS } from './packManifest.js';

const STATES = ['idle', 'walking', 'attacking', 'hurt', 'dead'];
const DIRECTIONS = [
  ['Baixo', DIRECTION.DOWN],
  ['Esq', DIRECTION.LEFT],
  ['Dir', DIRECTION.RIGHT],
  ['Cima', DIRECTION.UP],
];

const CELL = 108;

const manager = new SpriteManager();
const entries = []; // { animator, ctx }
let currentState = 'walking';
let currentDirection = DIRECTION.DOWN;

function makeCell(parent, actor) {
  const cell = document.createElement('div');
  cell.className = 'cell';

  const canvas = document.createElement('canvas');
  canvas.width = CELL;
  canvas.height = CELL;

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = actor.id;

  const meta = document.createElement('div');
  meta.className = 'meta';
  const clips = [...actor.clips.values()];
  meta.textContent = clips.map((c) => `${c.name}:${c.frames.length}`).join(' ');

  cell.append(canvas, name, meta);
  parent.appendChild(cell);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

function render() {
  for (const { animator, ctx } of entries) {
    ctx.clearRect(0, 0, CELL, CELL);
    const rect = animator.currentFrame(manager);
    if (!rect) continue;
    // Altura fixa por célula, ancorado no pé — mesma convenção do jogo.
    manager.draw(ctx, rect, CELL / 2, CELL - 8, CELL - 24);
  }
}

let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  for (const { animator } of entries) animator.update(dt);
  render();
  requestAnimationFrame(tick);
}

function applyState() {
  for (const { animator } of entries) {
    animator.setState(currentState, { force: true });
    animator.setDirection(currentDirection);
  }
}

function buildButtons(container, items, isActive, onPick) {
  container.innerHTML = '';
  for (const [label, value] of items) {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = isActive(value) ? 'on' : '';
    button.onclick = () => {
      onPick(value);
      buildButtons(container, items, isActive, onPick);
    };
    container.appendChild(button);
  }
}

async function main() {
  const result = await manager.load([...STRIP_SHEETS, ...GRID_SHEETS]);

  const stripHost = document.getElementById('strips');
  const gridHost = document.getElementById('grids');
  let strips = 0;
  let grids = 0;

  for (const actor of manager.listActors()) {
    const host = actor.format === FORMAT.STRIP ? stripHost : gridHost;
    if (actor.format === FORMAT.STRIP) strips++;
    else grids++;
    const ctx = makeCell(host, actor);
    entries.push({ animator: createAnimator(actor, { state: currentState }), ctx });
  }

  document.getElementById('stripTitle').textContent = `Formato 1 — tiras horizontais (${strips} atores)`;
  document.getElementById('gridTitle').textContent = `Formato 2 — grade RPG 3x4 (${grids} atores)`;
  document.getElementById('stats').textContent =
    `${result.loadedCount} folhas carregadas · ${manager.actors.size} atores · ${result.failed.length} falhas`;

  if (result.failed.length) {
    document.getElementById('errors').textContent =
      'Falhas:\n' + result.failed.map((f) => `  ${f.path} — ${f.reason}`).join('\n');
  }

  buildButtons(
    document.getElementById('stateButtons'),
    STATES.map((s) => [s, s]),
    (v) => v === currentState,
    (v) => {
      currentState = v;
      applyState();
    }
  );
  buildButtons(
    document.getElementById('dirButtons'),
    DIRECTIONS,
    (v) => v === currentDirection,
    (v) => {
      currentDirection = v;
      applyState();
    }
  );

  applyState();
  requestAnimationFrame(tick);

  // Deixa o manager acessível pro console — inspeção manual durante o teste.
  window.spriteManager = manager;
}

main();
