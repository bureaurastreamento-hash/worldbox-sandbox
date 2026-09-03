import { createWorld, findWalkableNear, getVillage, rebuildAgentIndex, rebuildStaticIndexes } from './world/world.js';
import { generateDecorations } from './world/decorations.js';
import { spawnPredators } from './predator/predator.js';
import { updatePredator } from './predator/predatorAI.js';
import { buildSpatialIndex } from './world/spatialIndex.js';
import { createVillage, addResident, foundVillageBuildings } from './village/village.js';
import { computeDemand, updateDistress, updateChaos, countDevelopmentWorkers } from './village/stock.js';
import { updateTrade } from './village/trade.js';
import { updateExpedition } from './village/expedition.js';
import { createClan, addVillage as addVillageToClan, setStance } from './clan/clan.js';
import { proposeTreaty, signTreaty } from './clan/diplomacy.js';
import { updateClanDecision } from './clan/clanDecision.js';
import { createAgent } from './agent/agent.js';
import { updateNeeds } from './agent/needs.js';
import { scanPerception } from './agent/perception.js';
import { remember, decayMemory } from './agent/memory.js';
import { reconsider, stepAction } from './agent/decision.js';
import { createCognitionBudget, dueForCognition } from './simulation/scheduler.js';
import { applySeparation } from './agent/separation.js';
import { updateStuck } from './agent/stuck.js';
import { ageAgent, checkDeath, updateVillageReproduction, updateHungerWarning, pruneDead } from './lifecycle/lifecycle.js';
import { createTimeState } from './core/time.js';
import { createGameLoop } from './core/gameLoop.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { attachInputHandlers } from './input/inputHandler.js';
import { createHud } from './ui/hud.js';
import { createInspector } from './ui/inspector.js';
import { createEventFeed } from './ui/eventFeed.js';
import { clamp, tileToWorld } from './utils/mathUtils.js';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  TILE_SIZE,
  AGENT_COUNT,
  FOUNDER_AGE,
  VILLAGE_COUNT,
  CLAN_COLORS,
  INITIAL_STANCE_WEIGHTS,
  NEUTRAL_TRADE_TREATY_CHANCE,
  CLAN_RECONSIDER_INTERVAL_MAX,
  CHAOS_NEEDS_DECAY_MULTIPLIER,
  FOUNDER_HUNGER_MIN,
  FOUNDER_HUNGER_MAX,
} from './utils/constants.js';

const canvas = document.getElementById('game-canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Seed do mundo. `?seed=x` na URL fixa o mundo, pra poder rodar a mesma
// partida duas vezes e comparar o efeito de uma mudança — sem isso, cada
// reload gera um mapa diferente e qualquer medição A/B compara duas coisas
// que não são a mesma. Sem o parâmetro, mundo novo a cada carregamento.
const seed = new URLSearchParams(location.search).get('seed') ?? String(Date.now());
const world = createWorld({ seed, width: WORLD_WIDTH, height: WORLD_HEIGHT });

function spawnVillage({ id, name, tx, ty, specialization }) {
  const spot = findWalkableNear(world, tx, ty, 10);
  const village = createVillage({ id, name, center: tileToWorld(spot.tx, spot.ty, TILE_SIZE), specialization });
  world.villages.push(village);

  for (let i = 0; i < AGENT_COUNT; i++) {
    const offsetTx = spot.tx + world.rng.int(-3, 3);
    const offsetTy = spot.ty + world.rng.int(-3, 3);
    const agentSpot = findWalkableNear(world, offsetTx, offsetTy, 5);

    const agent = createAgent({
      id: `${id}-agent-${i + 1}`,
      position: tileToWorld(agentSpot.tx, agentSpot.ty, TILE_SIZE),
      villageId: village.id,
      decisionTimer: world.rng.range(0, 0.5),
      // Jitter pequeno na idade: só pra fundadores não baterem MAX_AGE no
      // exato mesmo tick uns dos outros. Uma faixa grande aqui piora as
      // coisas (fundador nascido perto do topo da faixa já nasce com pouco
      // tempo de vida) — a causa real de população zerar era MAX_AGE curto
      // demais pra reprodução acompanhar, corrigido lá (utils/constants.js).
      age: FOUNDER_AGE + world.rng.range(0, 15),
      rng: world.rng,
    });
    // Dessincroniza a fome inicial (ver FOUNDER_HUNGER_MIN/MAX,
    // utils/constants.js) — sem isso, todos os fundadores cruzam o limiar de
    // "comer" praticamente juntos e esvaziam o estoque da vila numa rajada só.
    agent.needs.hunger = world.rng.range(FOUNDER_HUNGER_MIN, FOUNDER_HUNGER_MAX);

    world.agents.push(agent);
    addResident(village, agent.id);
  }

  return village;
}

// Especialização sempre balanceada (metade comida, metade madeira,
// embaralhado) — garante que a interdependência do pilar 4 do design (vila
// sem comida própria depende de comércio) sempre exista nesse mundo, em vez
// de arriscar um sorteio 50/50 puro dar todo mundo igual por acaso.
const specializations = [];
for (let i = 0; i < VILLAGE_COUNT; i++) specializations.push(i % 2 === 0 ? 'food' : 'wood');
world.rng.shuffle(specializations);

// Vilas distribuídas numa GRADE com jitter, cobrindo o mapa inteiro.
//
// Substituiu o anel: as vilas nasciam todas num raio de 70-100 tiles em volta
// da primeira, o que funcionava pra 4 mas não tem onde colocar 36 — e deixava
// o resto do mapa permanentemente vazio. A grade escala com VILLAGE_COUNT
// sozinha, mantém um espaçamento previsível (o lado da célula) e ainda parece
// orgânica por causa do jitter dentro de cada célula.
//
// A 1ª vila continua a mais próxima do centro do mapa: é onde a câmera abre.
const cols = Math.ceil(Math.sqrt(VILLAGE_COUNT));
const rows = Math.ceil(VILLAGE_COUNT / cols);
const cellW = world.width / cols;
const cellH = world.height / rows;

const slots = [];
for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    if (slots.length >= VILLAGE_COUNT) break;
    // Jitter só no miolo da célula (20%-80%): encostar na borda aproximaria
    // duas vilas vizinhas mais do que o espaçamento da grade promete.
    const tx = Math.round((col + world.rng.range(0.2, 0.8)) * cellW);
    const ty = Math.round((row + world.rng.range(0.2, 0.8)) * cellH);
    slots.push({
      tx: clamp(tx, 8, world.width - 9),
      ty: clamp(ty, 8, world.height - 9),
    });
  }
}

// Ordena pela distância ao centro só pra decidir quem é a "Vila 1" (a que a
// câmera enquadra na abertura) — a posição de cada uma já está sorteada.
const centerTx = world.width / 2;
const centerTy = world.height / 2;
slots.sort(
  (a, b) => (a.tx - centerTx) ** 2 + (a.ty - centerTy) ** 2 - ((b.tx - centerTx) ** 2 + (b.ty - centerTy) ** 2),
);

const villages = [];
const clans = [];

for (let i = 0; i < VILLAGE_COUNT; i++) {
  const { tx, ty } = slots[i];

  const village = spawnVillage({
    id: `village-${i + 1}`,
    name: `Vila ${i + 1}`,
    tx,
    ty,
    specialization: specializations[i],
  });
  villages.push(village);

  const clan = createClan({
    id: `clan-${i + 1}`,
    name: `Clã da Vila ${i + 1}`,
    color: CLAN_COLORS[i % CLAN_COLORS.length],
    decisionTimer: world.rng.range(0, CLAN_RECONSIDER_INTERVAL_MAX),
  });
  addVillageToClan(clan, village);
  clans.push(clan);
}
world.clans.push(...clans);
rebuildStaticIndexes(world); // vilas/clãs são estáticos daqui pra frente

const homeVillage = villages[0];

// Postura inicial sorteada independente pra cada par de clãs.
for (let i = 0; i < clans.length; i++) {
  for (let j = i + 1; j < clans.length; j++) {
    const clanA = clans[i];
    const clanB = clans[j];
    const initialStance = world.rng.weighted(INITIAL_STANCE_WEIGHTS);

    if (initialStance === 'allied') {
      // demonstra o fluxo de tratado de verdade no caso amistoso; guerra/
      // tensão/neutro nascem como estado padrão, sem documento assinado.
      const treaty = proposeTreaty(clanA, clanB, 'alliance');
      signTreaty(treaty, clanA, clanB);
    } else {
      setStance(clanA, clanB, initialStance);
      if (initialStance === 'neutral' && world.rng.next() < NEUTRAL_TRADE_TREATY_CHANCE) {
        // vínculo econômico sem aliança militar completa — habilita
        // comércio (village/trade.js) sem mudar a postura neutra.
        const tradeTreaty = proposeTreaty(clanA, clanB, 'trade');
        signTreaty(tradeTreaty, clanA, clanB);
      }
    }
  }
}

// Prédios fundacionais (prefeitura + celeiro) antes da decoração, pra a
// decoração já poder evitar o espaço deles se um dia precisar.
for (const village of world.villages) {
  foundVillageBuildings(world, village, world.rng);
}

world.decorations = generateDecorations(world);
world.predators = spawnPredators(world);

const camera = createCamera({
  x: homeVillage.center.x,
  y: homeVillage.center.y,
  zoom: 1,
  worldPxWidth: world.width * TILE_SIZE,
  worldPxHeight: world.height * TILE_SIZE,
});
camera.clampToViewport(canvas.width, canvas.height);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.clampToViewport(canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);

const renderer = createRenderer(canvas, camera);
const timeState = createTimeState({ speed: 1 });
const debugState = { showPerception: false };
const uiState = { selectedAgentId: null, selectedVillageId: null };

attachInputHandlers(canvas, { camera, timeState, debugState, world, uiState });
const hud = createHud(document.getElementById('hud'), timeState);
const inspector = createInspector(document.getElementById('inspector'));
const eventFeed = createEventFeed(document.getElementById('event-feed'));

let lastSelectedAgentId = null;
let lastSelectedVillageId = null;

function simulationUpdate(dt) {
  {
    if (dt <= 0) return;
    world.elapsedSeconds += dt;

    // Antes de qualquer laço por vila/clã: eles procuram agentes por id, e sem
    // índice isso é O(n) dentro de O(n). Ver world/world.js:rebuildAgentIndex.
    rebuildAgentIndex(world);

    for (const v of world.villages) {
      computeDemand(v);
      updateDistress(v, dt);
      updateChaos(v);
      // Cacheia quantos moradores estão em atividade de desenvolvimento, pra
      // village/stock.js:canDevelop responder em O(1) dentro de cada `score`
      // em vez de varrer a população por agente por ação.
      countDevelopmentWorkers(v, world);
    }

    for (const c of world.clans) {
      updateClanDecision(c, world, dt);
    }

    updateTrade(world, dt);

    world.spatialIndex = buildSpatialIndex(world.agents);

    // UM laço, sobre TODO agente vivo — a câmera não decide mais quem existe.
    // O que era caro (percepção, memória, pontuar as ações) acontece só
    // quando o agente reconsidera; o resto é todo frame pra todo mundo. Ver
    // simulation/scheduler.js.
    const budget = createCognitionBudget(world.agents.length, dt);
    const alive = [];

    for (const agent of world.agents) {
      if (!agent.alive) continue;

      const village = getVillage(world, agent.villageId);
      updateNeeds(agent.needs, village?.inChaos ? dt * CHAOS_NEEDS_DECAY_MULTIPLIER : dt);
      ageAgent(agent, dt);
      checkDeath(agent, world, dt);
      if (!agent.alive) continue;

      if (dueForCognition(agent, dt, budget)) {
        scanPerception(agent, world);
        for (const tile of agent.perception.tiles) {
          remember(agent.memory, tile);
        }
        // Recebe o tempo acumulado desde a última cognição, não o `dt` do
        // frame: o decaimento tem que depender do tempo passado, não da
        // frequência com que este bloco é chamado.
        decayMemory(agent.memory, agent.timeSinceCognition);
        agent.timeSinceCognition = 0;
        reconsider(agent, world);
      }

      stepAction(agent, world, dt);
      // Depois da ação, não antes: mede o resultado do passo que acabou de
      // rodar. Cancela o alvo e marca o tile como sem-saída se o agente ficar
      // parado sem progredir em nada (ver agent/stuck.js).
      updateStuck(agent, world, dt);
      alive.push(agent);
    }

    applySeparation(alive, dt);

    for (const predator of world.predators) {
      updatePredator(predator, world, dt);
    }

    for (const v of world.villages) {
      updateExpedition(world, v, dt);
      updateVillageReproduction(v, world, dt);
      updateHungerWarning(v, world);
    }

    pruneDead(world, dt);
  }
}

const loop = createGameLoop({
  timeState,
  update: simulationUpdate,
  render(realDt) {
    let selectionState = 'none';
    let selectedAgent = null;
    if (uiState.selectedAgentId) {
      // Agente morto continua em world.agents durante o "linger" da animação
      // de morte (lifecycle.js:pruneDead) — sem o `a.alive`, o inspetor/HUD
      // achava que ele ainda tava vivo até o corpo sumir de vez.
      selectedAgent = world.agents.find((a) => a.id === uiState.selectedAgentId && a.alive) ?? null;
      selectionState = selectedAgent ? 'alive' : 'dead';
    }
    const selectedVillage = uiState.selectedVillageId
      ? (world.villages.find((v) => v.id === uiState.selectedVillageId) ?? null)
      : null;

    // Câmera segue a seleção nova com easing (render/camera.js:panToTarget)
    // em vez de corte seco — só dispara na TROCA de seleção, não a cada
    // frame (senão nunca deixaria o jogador arrastar livremente depois).
    if (uiState.selectedAgentId !== lastSelectedAgentId || uiState.selectedVillageId !== lastSelectedVillageId) {
      lastSelectedAgentId = uiState.selectedAgentId;
      lastSelectedVillageId = uiState.selectedVillageId;
      const target = selectedAgent?.position ?? selectedVillage?.center;
      if (target) camera.panToTarget(target.x, target.y);
    }

    if (world.pendingShake) {
      camera.triggerShake(world.pendingShake.intensity, world.pendingShake.duration);
      world.pendingShake = null;
    }
    camera.tick(realDt ?? 0, canvas.width, canvas.height);

    renderer.render(world, debugState, uiState.selectedAgentId, uiState.selectedVillageId, realDt ?? 0);

    hud.updateAgentStatus(selectedAgent, selectionState);
    inspector.update({ agent: selectedAgent, selectionState, village: selectedVillage }, world);
    eventFeed.update(world.events);
  },
});

// Alça de diagnóstico. O rAF é throttlado numa aba de automação
// (visibilityState "hidden"), então a única forma confiável de confirmar
// comportamento ao vivo é pausar o loop e avançar `update(dt)` na mão, com o
// tempo simulado que se quiser — técnica já usada em sessões anteriores, aqui
// só exposta em vez de recolada a cada vez. Não é lida por nenhum módulo de
// jogo: só existe pra inspeção externa.
window.__wb = { world, camera, timeState, loop, uiState, update: simulationUpdate };

loop.start();
