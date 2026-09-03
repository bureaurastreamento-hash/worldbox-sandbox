import { clamp } from '../utils/mathUtils.js';
import { getAgent } from '../world/world.js';
import {
  TRADE_DEFICIT_DEMAND_MIN,
  DISTRESS_CHAOS_THRESHOLD_SECONDS,
  CRITICAL_RESOURCES,
  DEVELOPMENT_MIN_FOOD_FRACTION,
  DEVELOPMENT_LABOR_FRACTION,
} from '../utils/constants.js';

export function addStock(village, type, amount) {
  const cap = village.capacity[type] ?? Infinity;
  village.stock[type] = clamp((village.stock[type] ?? 0) + amount, 0, cap);
}

// Estoque baixo -> demanda alta -> puxa o score de ações que suprem o
// recurso pra cima, pra todos os moradores (ver agent/actions/gather.js).
// A vila está alimentada o bastante pra gastar mão de obra em DESENVOLVIMENTO
// (explorar, minerar, construir) em vez de em sobrevivência?
//
// Esta é a regra mais aprendida na marra deste projeto, e por isso mora num
// lugar só: toda ação que não produz comida e ganha peso alto o bastante pra
// vencer `gather`/`fish` acaba matando de fome as vilas madeireiras, que não
// têm produção própria de comida. Aconteceu três vezes seguidas, com três
// ações diferentes (explore, mine, build), cada uma medida como extinção de
// vila antes de ser corrigida. Em vez de repetir a trava em cada módulo, a
// condição é declarada aqui e consultada pelos três.
//
// É sobre ESTOQUE, não sobre `distress`: distress só acumula depois do
// déficit se firmar e leva muito tempo pra zerar, então usá-lo desligava o
// desenvolvimento permanentemente (medido — as quatro vilas ficavam em
// distress leve e crônico ao mesmo tempo, e a mineração nunca mais ligava).
// O estoque volta a subir assim que alguém colhe, que é o sinal certo.
export function hasFoodSurplus(village, minFraction = DEVELOPMENT_MIN_FOOD_FRACTION) {
  const capacity = village.capacity?.food ?? 0;
  if (capacity <= 0) return false;
  return (village.stock.food ?? 0) >= capacity * minFraction;
}

// Ações que consomem tempo de agente sem produzir comida. É esta lista que
// `countDevelopmentWorkers` conta e que `canDevelop` limita.
export const DEVELOPMENT_ACTIONS = ['explore', 'mine', 'build', 'patrol'];

// Chamada uma vez por vila por tick (main.js) — cacheia quantos moradores
// estão AGORA em atividade de desenvolvimento, pra `canDevelop` responder em
// O(1) em vez de varrer a população dentro de cada `score`.
export function countDevelopmentWorkers(village, world) {
  let n = 0;
  for (const id of village.population) {
    const agent = getAgent(world, id);
    if (agent?.alive && DEVELOPMENT_ACTIONS.includes(agent.currentAction)) n++;
  }
  village.devWorkers = n;
  return n;
}

// A vila pode colocar MAIS UM morador em atividade de desenvolvimento agora?
//
// Esta é a trava que faltava, e é sobre QUANTIDADE DE GENTE, não sobre um
// limiar de estoque. Travas por limiar (`distress`, fração de comida) oscilam:
// assim que o estoque sobe um pouco, TODO MUNDO fica liberado de uma vez,
// justamente no pico populacional — e a vila desaba. Medido em 600s
// simulados, uma a uma: explorar, minerar, construir e patrulhar levaram as
// vilas à extinção, cada uma com uma trava de limiar nova e insuficiente.
//
// Pior, a economia é HOMEOSTÁTICA: `gather.js` pontua por `village.demand`,
// que cai quando o estoque sobe, então produzir mais comida ABAIXA o score de
// colher e converte o excedente em atividade não-alimentar antes que ele vire
// margem. Aumentar a produção (testado, GATHER_SECONDS 8->6) piorou.
//
// Um teto de CABEÇAS não tem esse problema: não importa o quão farto o
// celeiro fique, no máximo esta fração da vila está longe da comida ao mesmo
// tempo. É o mesmo princípio que village/expedition.js já usava pro tamanho
// da expedição — aqui generalizado pras quatro ações.
//
// O agente que JÁ está desenvolvendo sempre passa: senão ele seria expulso da
// própria ação no tick seguinte por outro ter entrado, e ninguém terminaria
// nada.
export function canDevelop(village, agent, minFraction = DEVELOPMENT_MIN_FOOD_FRACTION) {
  if (!hasFoodSurplus(village, minFraction)) return false;
  if (DEVELOPMENT_ACTIONS.includes(agent.currentAction)) return true;
  const cap = Math.max(1, Math.floor(village.population.length * DEVELOPMENT_LABOR_FRACTION));
  return (village.devWorkers ?? 0) < cap;
}

export function computeDemand(village) {
  for (const type of Object.keys(village.capacity)) {
    const cap = village.capacity[type];
    const stock = village.stock[type] ?? 0;
    village.demand[type] = cap > 0 ? clamp(1 - stock / cap, 0, 1) : 0;
  }
  return village.demand;
}

// Segundos consecutivos com demanda em nível de déficit — sinal de
// "desespero" pra clan/clanDecision.js decidir propor comércio ou escalar
// pra guerra. Reseta assim que a demanda cai abaixo do limiar (não decai
// aos poucos): a semântica é "há quanto tempo isso está sem alívio agora".
// Só considera CRITICAL_RESOURCES (food/wood) — minério (universal, não
// travado por especialização) nunca deveria puxar pra guerra/colapso.
export function updateDistress(village, dt) {
  for (const type of CRITICAL_RESOURCES) {
    const inDeficit = (village.demand[type] ?? 0) >= TRADE_DEFICIT_DEMAND_MIN;
    village.distress[type] = inDeficit ? (village.distress[type] ?? 0) + dt : 0;
  }
}

// Colapso interno: nenhum recurso crítico resolveu o déficit por tempo longo
// o bastante, apesar de comércio/guerra já terem tido chance de agir — ver
// lifecycle.js (bloqueia reprodução) e main.js (acelera decaimento de needs).
export function updateChaos(village) {
  village.inChaos = CRITICAL_RESOURCES.some((type) => (village.distress[type] ?? 0) >= DISTRESS_CHAOS_THRESHOLD_SECONDS);
}
