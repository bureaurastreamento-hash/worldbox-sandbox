import { TIME_SPEEDS } from '../utils/constants.js';

const ACTION_LABELS = { wander: 'vagando', eat: 'comendo', sleep: 'dormindo' };

export function createHud(container, timeState) {
  container.innerHTML = '';

  const bar = document.createElement('div');
  bar.className = 'hud-bar';

  const pauseBtn = document.createElement('button');
  pauseBtn.textContent = timeState.paused ? '▶' : '⏸';
  pauseBtn.addEventListener('click', () => {
    timeState.togglePause();
    pauseBtn.textContent = timeState.paused ? '▶' : '⏸';
  });
  bar.appendChild(pauseBtn);

  const speedButtons = TIME_SPEEDS.map((speed) => {
    const btn = document.createElement('button');
    btn.textContent = `${speed}x`;
    if (speed === timeState.speed) btn.classList.add('active');
    btn.addEventListener('click', () => {
      timeState.setSpeed(speed);
      speedButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
    bar.appendChild(btn);
    return btn;
  });

  container.appendChild(bar);

  const hint = document.createElement('div');
  hint.className = 'hud-hint';
  hint.textContent = '[D] raio de percepção';
  container.appendChild(hint);

  const status = document.createElement('div');
  status.className = 'hud-status';
  status.innerHTML = `
    <div class="hud-status-row">
      <span class="hud-status-label">ação</span>
      <span data-field="action">–</span>
    </div>
    <div class="hud-status-row">
      <span class="hud-status-label">fome</span>
      <div class="stat-bar"><div class="stat-bar-fill hunger" data-field="hunger"></div></div>
    </div>
    <div class="hud-status-row">
      <span class="hud-status-label">sono</span>
      <div class="stat-bar"><div class="stat-bar-fill sleep" data-field="sleep"></div></div>
    </div>
  `;
  container.appendChild(status);

  const actionEl = status.querySelector('[data-field="action"]');
  const hungerFill = status.querySelector('[data-field="hunger"]');
  const sleepFill = status.querySelector('[data-field="sleep"]');

  function updateAgentStatus(agent) {
    if (!agent) return;
    actionEl.textContent = ACTION_LABELS[agent.currentAction] ?? '–';
    hungerFill.style.width = `${agent.needs.hunger}%`;
    sleepFill.style.width = `${agent.needs.sleep}%`;
  }

  return { updateAgentStatus };
}
