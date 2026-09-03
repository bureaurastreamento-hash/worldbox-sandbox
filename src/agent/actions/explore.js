// Sair para descobrir mapa — a ação que faltava para o agente ter um MOTIVO
// de ir longe e um ALVO além do que enxerga.
//
// `wander.js` não é isto: ele só escolhe entre tiles do raio de percepção
// atual, então mesmo com rumo persistente o agente nunca decide ir a um lugar
// que ainda não vê. `explore` escolhe um ponto a EXPLORE_DISTANCE_TILES da
// vila — muito além da percepção — e o trata como destino de verdade.
//
// Pontua por CARÊNCIA INSTITUCIONAL, não por necessidade do agente: a vila
// precisa de um minério (demanda) e o quadro de descobertas
// (village/knowledge.js) não conhece nenhum depósito dele. É o pilar 3 do
// design (pressão econômica enviesando o utility score) aplicado a
// território: ninguém "decide mandar um batedor" — a carência simplesmente
// faz explorar pontuar mais alto para todos os moradores, e alguém vai.
//
// Isso é o que fecha a cadeia que travava construção: montanha é gerada como
// cordilheira, não pedrinha espalhada, então uma vila que não nasce colada
// numa cadeia jamais achava pedra por acaso. O gargalo nunca foi o custo da
// casa (STATUS.md o registrava como "calibrar HOUSE_STONE_COST"), foi a
// descoberta.

import {
  EXPLORE_BASE_SCORE,
  EXPLORE_SCORE_WEIGHT,
  EXPEDITION_COMMITTED_SCORE,
  MINING_RESOURCES,
  FLEE_HEALTH_THRESHOLD,
} from '../../utils/constants.js';
import { getVillage } from '../../world/world.js';
import { knowsResource } from '../../village/knowledge.js';
import { joinOrStart, leaveExpedition, destinationFrom, canJoin } from '../../village/expedition.js';
import { moveToward, clearMovement } from '../movement.js';

// Mesmo gate de elegibilidade de fight.js/raid.js: criança não vai, e quem
// está machucado demais não se afasta da vila.
function eligible(agent) {
  return agent.lifeStage !== 'child' && agent.health >= FLEE_HEALTH_THRESHOLD;
}

// Quanto a vila precisa de um minério que ela não sabe onde achar: 0 se
// conhece um depósito de tudo que quer, perto de 1 se está com demanda alta
// por algo totalmente desconhecido.
function ignoranceGap(village) {
  let worst = 0;
  for (const resource of MINING_RESOURCES) {
    if (knowsResource(village, resource)) continue;
    worst = Math.max(worst, village.demand[resource] ?? 0);
  }
  return Math.min(1, worst);
}

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // entrega o que está na mão antes de sumir no mapa
  if (!eligible(agent)) return 0;

  const village = getVillage(world, agent.villageId);
  if (!village) return 0;

  // Vila com fome sustentada não manda ninguém explorar, e chama de volta
  // quem já saiu (o score cai a 0, o agente escolhe outra coisa, e
  // village/expedition.js:prune o tira do grupo sozinho). Exploração é por
  // MINÉRIO, que está fora de CRITICAL_RESOURCES de propósito — não pode
  // custar a sobrevivência da vila. Sem esta trava, as duas vilas
  // madeireiras de um teste foram à extinção: elas não produzem comida
  // própria e dependem de pescar, e mandar gente pro mapa era exatamente o
  // que elas não podiam pagar.
  if ((village.distress?.food ?? 0) > 0) return 0;

  // Já está numa expedição em andamento: mantém-se nela com prioridade acima
  // do trabalho comum, senão o agente a abandonaria ao passar perto da
  // primeira árvore e nenhuma expedição jamais chegaria ao destino. Fome,
  // predador e guerra continuam vencendo — e aí village/expedition.js:prune
  // o tira do grupo sozinho.
  if (agent.expeditionVillageId === village.id && village.expedition) {
    return EXPEDITION_COMMITTED_SCORE;
  }

  // Sem vaga na expedição corrente (cheia, já voltando, ou o agente está
  // longe demais da vila pra alcançar o grupo): não é candidata viável.
  if (!canJoin(village, agent)) return 0;

  return EXPLORE_BASE_SCORE + ignoranceGap(village) * EXPLORE_SCORE_WEIGHT;
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  const exp = joinOrStart(world, village, agent);
  if (!exp) {
    // Grupo cheio ou longe demais pra entrar: não vira exploração solo, só
    // não faz nada neste tick. Na próxima reconsideração outra ação vence
    // (explore continua acima só de wander), então ninguém trava aqui.
    clearMovement(agent, world);
    return;
  }

  const destination = destinationFrom(exp, village, agent);
  // Recalcula o alvo quando a expedição troca de fase (ida -> volta): sem
  // isso o agente continuaria marchando pro ponto de ida depois da virada.
  if (!agent.target || agent.exploreState !== exp.state) {
    agent.exploreState = exp.state;
    clearMovement(agent, world);
    agent.target = destination;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    // Sem caminho até lá. Sair do grupo é o certo: village/expedition.js
    // dissolve sozinha quando esvazia, e o timeout cobre quem ficou.
    clearMovement(agent, world);
    leaveExpedition(world, agent);
    return;
  }
  if (status === 'arrived') clearMovement(agent, world); // chegou; updateExpedition vira a fase
}
