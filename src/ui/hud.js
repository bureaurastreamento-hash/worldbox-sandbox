import { TIME_SPEEDS } from '../utils/constants.js';

const ACTION_LABELS = {
  wander: 'vagando',
  eat: 'comendo',
  sleep: 'dormindo',
  gather: 'colhendo',
  deliver: 'entregando',
  fight: 'lutando',
  flee: 'fugindo',
};

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
  hint.textContent = '[D] raio de percepção · clique num personagem pra selecionar';
  container.appendChild(hint);

  const status = document.createElement('div');
  status.className = 'hud-status';
  status.innerHTML = `
    <div class="hud-status-row">
      <span class="hud-status-label">ação</span>
      <span data-field="action">–</span>
    </div>
    <div class="hud-status-row">
      <span class="hud-status-label">idade</span>
      <span data-field="age">–</span>
    </div>
    <div class="hud-status-row">
      <span class="hud-status-label">fome</span>
      <div class="stat-bar"><div class="stat-bar-fill hunger" data-field="hunger"></div></div>
    </div>
    <div class="hud-status-row">
      <span class="hud-status-label">sono</span>
      <div class="stat-bar"><div class="stat-bar-fill sleep" data-field="sleep"></div></div>
    </div>
    <div class="hud-status-row">
      <span class="hud-status-label">vida</span>
      <div class="stat-bar"><div class="stat-bar-fill health" data-field="health"></div></div>
    </div>
  `;
  container.appendChild(status);

  const actionEl = status.querySelector('[data-field="action"]');
  const ageEl = status.querySelector('[data-field="age"]');
  const hungerFill = status.querySelector('[data-field="hunger"]');
  const sleepFill = status.querySelector('[data-field="sleep"]');
  const healthFill = status.querySelector('[data-field="health"]');

  const STAGE_LABELS = { child: 'criança', adult: 'adulto', elder: 'idoso' };

  // selectionState: 'none' (nada selecionado) | 'alive' | 'dead' (selecionado, mas morreu)
  function updateAgentStatus(agent, selectionState) {
    if (selectionState === 'none' || !agent) {
      actionEl.textContent = '–';
      ageEl.textContent = selectionState === 'dead' ? 'morreu' : 'clique num personagem';
      hungerFill.style.width = '0%';
      sleepFill.style.width = '0%';
      healthFill.style.width = '0%';
      return;
    }

    actionEl.textContent = ACTION_LABELS[agent.currentAction] ?? '–';
    ageEl.textContent = `${Math.floor(agent.age)} (${STAGE_LABELS[agent.lifeStage] ?? '–'})`;
    hungerFill.style.width = `${agent.needs.hunger}%`;
    sleepFill.style.width = `${agent.needs.sleep}%`;
    healthFill.style.width = `${agent.health}%`;
  }

  return { updateAgentStatus };
}
