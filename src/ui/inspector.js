// Fatia 11: painel de inspeção — mostra o score de cada ação candidata do
// agente selecionado (por que a decisão de utilidade escolheu a ação
// atual) e o estoque/demanda/postura/tratados da vila e do clã dele. Clicar
// numa vila sem um agente selecionado (input/inputHandler.js) mostra só a
// vila/clã, sem seção de agente.

import { getStance } from '../clan/clan.js';
import { getPopulationCap } from '../village/village.js';

// Ícone por recurso mineral — sem sprite, o estoque aparecia como texto puro
// (`stone`, `coal`...) na lista; food/wood já tinham 🌾/🪵 no label da vila
// (render/villageRenderer.js), minério não tinha nada equivalente.
const MINERAL_ICON_FILE = { stone: 'Pedra1', coal: 'Carvao', iron: 'Ferro', gold: 'Ouro' };
const RESOURCE_ICON_DIR = 'assets/Assets-testes-para-o-claude-testar';

const ACTION_LABELS = {
  wander: 'vagando',
  eat: 'comendo',
  sleep: 'dormindo',
  gather: 'colhendo',
  gatherWood: 'colhendo madeira',
  fish: 'pescando',
  mine: 'minerando',
  build: 'construindo',
  deliver: 'entregando',
  fight: 'lutando',
  flee: 'fugindo',
};

const SPECIALIZATION_LABELS = { food: 'agrícola', wood: 'guerreira' };
const STANCE_LABELS = { war: 'guerra', tense: 'tensão', neutral: 'neutro', allied: 'aliado' };
const TREATY_LABELS = { alliance: 'aliança', defense_pact: 'pacto de defesa', nonaggression: 'não-agressão', trade: 'comércio' };

export function createInspector(container) {
  container.innerHTML = `
    <div class="inspector-empty" data-field="empty">clique num personagem ou numa vila pra inspecionar</div>
    <div class="inspector-body" data-field="body" hidden>
      <div class="inspector-section" data-field="agent-section">
        <div class="inspector-title">Agente — scores de decisão</div>
        <ul class="inspector-list" data-field="scores"></ul>
      </div>
      <div class="inspector-section">
        <div class="inspector-title" data-field="village-title">Vila</div>
        <div class="inspector-row"><span>população</span><span data-field="village-pop">–</span></div>
        <ul class="inspector-list" data-field="village-stock"></ul>
      </div>
      <div class="inspector-section">
        <div class="inspector-title" data-field="clan-title">Clã</div>
        <ul class="inspector-list" data-field="clan-stances"></ul>
        <ul class="inspector-list" data-field="clan-treaties"></ul>
      </div>
    </div>
  `;

  const emptyEl = container.querySelector('[data-field="empty"]');
  const bodyEl = container.querySelector('[data-field="body"]');
  const agentSectionEl = container.querySelector('[data-field="agent-section"]');
  const scoresEl = container.querySelector('[data-field="scores"]');
  const villageTitleEl = container.querySelector('[data-field="village-title"]');
  const villagePopEl = container.querySelector('[data-field="village-pop"]');
  const villageStockEl = container.querySelector('[data-field="village-stock"]');
  const clanTitleEl = container.querySelector('[data-field="clan-title"]');
  const clanStancesEl = container.querySelector('[data-field="clan-stances"]');
  const clanTreatiesEl = container.querySelector('[data-field="clan-treaties"]');

  function renderScores(agent) {
    scoresEl.innerHTML = '';
    if (!agent.lastScores) {
      scoresEl.innerHTML = '<li class="inspector-muted">sem dados ainda</li>';
      return;
    }

    const entries = Object.entries(agent.lastScores).sort((a, b) => b[1] - a[1]);
    for (const [type, score] of entries) {
      const li = document.createElement('li');
      li.className = 'inspector-score-row';
      if (type === agent.currentAction) li.classList.add('current');
      li.innerHTML = `<span>${ACTION_LABELS[type] ?? type}</span><span>${score.toFixed(2)}</span>`;
      scoresEl.appendChild(li);
    }
  }

  function renderVillage(village) {
    if (!village) {
      villageTitleEl.textContent = 'Vila — nenhuma';
      villagePopEl.textContent = '–';
      villageStockEl.innerHTML = '';
      return;
    }

    const roleLabel = SPECIALIZATION_LABELS[village.specialization] ?? village.specialization;
    const chaosLabel = village.inChaos ? ' — EM COLAPSO INTERNO' : '';
    villageTitleEl.textContent = `Vila — ${village.name} (${roleLabel})${chaosLabel}`;
    villagePopEl.textContent = `${village.population.length} / ${getPopulationCap(village)} (${village.buildings.length} casa${village.buildings.length === 1 ? '' : 's'})`;
    villageStockEl.innerHTML = '';
    for (const type of Object.keys(village.capacity)) {
      const stock = Math.floor(village.stock[type] ?? 0);
      const cap = village.capacity[type];
      const demandPct = Math.round((village.demand[type] ?? 0) * 100);
      const distressSec = Math.floor(village.distress?.[type] ?? 0);
      const distressLabel = distressSec > 0 ? ` · desespero há ${distressSec}s` : '';
      const iconFile = MINERAL_ICON_FILE[type];
      const label = iconFile
        ? `<img class="resource-icon" src="${RESOURCE_ICON_DIR}/${iconFile}.png" alt="">${type}`
        : type;
      const li = document.createElement('li');
      li.innerHTML = `<span>${label}</span><span>${stock}/${cap} · demanda ${demandPct}%${distressLabel}</span>`;
      villageStockEl.appendChild(li);
    }
  }

  function renderClan(clan, world) {
    if (!clan) {
      clanTitleEl.textContent = 'Clã — nenhum';
      clanStancesEl.innerHTML = '';
      clanTreatiesEl.innerHTML = '';
      return;
    }

    clanTitleEl.textContent = `Clã — ${clan.name}`;

    clanStancesEl.innerHTML = '';
    const others = world.clans.filter((c) => c.id !== clan.id);
    if (others.length === 0) {
      clanStancesEl.innerHTML = '<li class="inspector-muted">nenhum outro clã no mundo</li>';
    }
    for (const other of others) {
      const li = document.createElement('li');
      li.innerHTML = `<span>${other.name}</span><span>${STANCE_LABELS[getStance(clan, other)] ?? '–'}</span>`;
      clanStancesEl.appendChild(li);
    }

    clanTreatiesEl.innerHTML = '';
    const signed = clan.treaties.filter((t) => t.status === 'signed');
    if (signed.length === 0) {
      clanTreatiesEl.innerHTML = '<li class="inspector-muted">nenhum tratado assinado</li>';
    }
    for (const treaty of signed) {
      const otherId = treaty.clanA === clan.id ? treaty.clanB : treaty.clanA;
      const other = world.clans.find((c) => c.id === otherId);
      const li = document.createElement('li');
      li.innerHTML = `<span>${TREATY_LABELS[treaty.type] ?? treaty.type}</span><span>com ${other?.name ?? '–'}</span>`;
      clanTreatiesEl.appendChild(li);
    }
  }

  // selection: { agent, selectionState, village } — selectionState ('none' |
  // 'alive' | 'dead') é sobre `agent`, o mesmo estado que hud.js usa;
  // `village` vem de clique direto na vila (input/inputHandler.js), só
  // preenchido quando não há agente selecionado (mutuamente exclusivos).
  function update({ agent, selectionState, village: directVillage }, world) {
    const hasAliveAgent = selectionState === 'alive' && !!agent;

    if (!hasAliveAgent && !directVillage) {
      emptyEl.hidden = false;
      emptyEl.textContent =
        selectionState === 'dead' ? 'personagem selecionado morreu' : 'clique num personagem ou numa vila pra inspecionar';
      bodyEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    bodyEl.hidden = false;
    agentSectionEl.hidden = !hasAliveAgent;

    const village = hasAliveAgent ? (world.villages.find((v) => v.id === agent.villageId) ?? null) : directVillage;
    const clan = village ? (world.clans.find((c) => c.id === village.clanId) ?? null) : null;

    if (hasAliveAgent) renderScores(agent);
    renderVillage(village);
    renderClan(clan, world);
  }

  return { update };
}
