// IA de decisão institucional: cada clã reavalia periodicamente sua relação
// com cada outro clã do mundo, reagindo à pressão econômica real da própria
// vila (village.distress, ver village/stock.js). Espelha agent/decision.js
// no espírito (candidatas avaliadas, decisão baseada em pressão sustentada,
// não script fixo), mas em escala institucional: um clã mantém várias
// relações simultâneas, não uma ação corrente só, então cada par (clã, outro
// clã) é reavaliado de forma independente a cada reconsideração.
//
// Assume 1 vila por clã (verdade em todo o world-gen atual, main.js) — se
// isso mudar, getClanVillage precisa virar getClanVillages (agregando).

import { getStance, setStance } from './clan.js';
import { getAgent } from '../world/world.js';
import { proposeTreaty, signTreaty, hasTreaty, breakTreaty } from './diplomacy.js';
import { pushEvent } from '../world/eventLog.js';
import {
  CLAN_RECONSIDER_INTERVAL_MIN,
  CLAN_RECONSIDER_INTERVAL_MAX,
  DISTRESS_WAR_THRESHOLD_SECONDS,
  TRADE_SURPLUS_DEMAND_MAX,
  PARTNER_SWITCH_MARGIN,
  WARRIOR_ROLE_FRACTION,
  WARRIOR_GARRISON_FRACTION,
} from '../utils/constants.js';

function getClanVillage(world, clan) {
  return world.villages.find((v) => v.clanId === clan.id) ?? null;
}

function isClanAtWar(clan) {
  return Object.values(clan.stanceByClan).includes('war');
}

// Atribui/revoga agent.role = 'warrior' pra uma fração dos adultos elegíveis
// da vila. Chamado a cada reconsideração do clã, em guerra ou em paz.
//
// EM PAZ TAMBÉM EXISTE GUERREIRO, e isso é uma correção, não uma feature
// nova. Antes, a paz revertia TODO mundo pra 'civilian', então o mundo
// passava a maior parte do tempo com zero guerreiros. Duas consequências,
// nenhuma delas intencional:
//   - o jogador simplesmente nunca via um soldado (reportado jogando);
//   - NINGUÉM NUNCA ENFRENTAVA PREDADOR. agent/actions/fightPredator.js
//     exige role === 'warrior'; civil só tem fleePredator. Sem guerra de
//     clã, os 24 predadores do mapa eram literalmente incontestados — matavam
//     moradores e nada respondia. Efeito colateral de amarrar o papel só à
//     guerra, não uma decisão de design (DESIGN.md §9 descreve o papel como
//     emergente pela "demanda de defesa da vila", e predador é demanda de
//     defesa).
//
// A guarnição de paz é pequena (WARRIOR_GARRISON_FRACTION, com piso de 1) e
// custa quase nada em economia: `role` não impede ninguém de colher ou
// construir — muda o bônus de score em fight/raid, o sprite, e a reação a
// predador. Em guerra a fração sobe pra WARRIOR_ROLE_FRACTION.
function updateWarriorRoles(village, world, atWar) {
  const members = village.population.map((id) => getAgent(world, id)).filter((a) => a?.alive);
  const eligible = members.filter((a) => a.lifeStage !== 'child');

  // Criança nunca é guerreiro, nem que tenha sido promovida antes de crescer
  // ao contrário (não acontece hoje, mas o invariante é barato de manter).
  for (const agent of members) {
    if (agent.lifeStage === 'child') agent.role = 'civilian';
  }

  const fraction = atWar ? WARRIOR_ROLE_FRACTION : WARRIOR_GARRISON_FRACTION;
  const target = eligible.length === 0 ? 0 : Math.max(1, Math.round(eligible.length * fraction));

  const warriors = eligible.filter((a) => a.role === 'warrior');

  // Desmobiliza o excedente ao voltar da guerra: a guarnição de paz é menor
  // que o efetivo de guerra, então sobra gente. Sem isso, uma vila que
  // guerreou uma vez ficaria com efetivo de guerra pra sempre.
  if (warriors.length > target) {
    for (const agent of warriors.slice(target)) agent.role = 'civilian';
    return;
  }

  // Não mexe em quem já é guerreiro (evita flicker de papel a cada chamada);
  // só completa o efetivo com quem cresceu ou nasceu desde a última vez.
  const candidates = world.rng.shuffle(eligible.filter((a) => a.role !== 'warrior'));
  for (let i = 0; i < candidates.length && warriors.length + i < target; i++) {
    candidates[i].role = 'warrior';
  }
}

// Recurso mais desesperado da vila agora ({ resource, seconds }), ou null
// se nada está em déficit sustentado.
function mostDistressedResource(village) {
  let best = null;
  for (const [resource, seconds] of Object.entries(village.distress)) {
    if (seconds > 0 && (!best || seconds > best.seconds)) best = { resource, seconds };
  }
  return best;
}

function surplusResources(village) {
  return Object.keys(village.demand).filter((r) => (village.demand[r] ?? 0) <= TRADE_SURPLUS_DEMAND_MAX);
}

// Entre os clãs com quem `clan` ainda não comercia (e não está em clima
// hostil), o mais desesperado pelo `resource` que `clan` tem de sobra —
// só conta se superar a demanda do parceiro atual por uma margem, pra não
// trocar de parceiro por uma diferença mínima a cada reconsideração.
function findBetterPartner(world, clan, currentPartnerId, resource, currentDemand) {
  let best = null;
  let bestDemand = currentDemand + PARTNER_SWITCH_MARGIN;

  for (const other of world.clans) {
    if (other.id === clan.id || other.id === currentPartnerId) continue;
    const stance = getStance(clan, other);
    if (stance === 'war' || stance === 'tense') continue;
    if (hasTreaty(clan, other, 'trade') || stance === 'allied') continue; // já tem o recurso garantido

    const otherVillage = getClanVillage(world, other);
    if (!otherVillage || otherVillage.population.length === 0) continue; // vila extinta não é parceiro de comércio

    const theirDemand = otherVillage.demand[resource] ?? 0;
    if (theirDemand > bestDemand) {
      bestDemand = theirDemand;
      best = other;
    }
  }

  return best;
}

function reconsiderRelationship(world, clan, other, village, otherVillage) {
  // Vila extinta (população zerada, mas nunca removida — ver lifecycle.js)
  // não participa da diplomacia como se tivesse gente: não declara nem sofre
  // guerra, não propõe nem recebe comércio. Ela continua existindo como
  // entidade com estoque só pra efeito de saque (agent/actions/raid.js já
  // saqueia villages sem checar população — permanece de propósito, ver
  // DESIGN.md §7).
  if (otherVillage.population.length === 0) return;

  const stance = getStance(clan, other);
  const distress = mostDistressedResource(village);

  // 1. Desespero sustentado por um recurso que essa vila não produz, sem
  //    alívio, e o outro clã tem sobra dele — escala pra guerra.
  if (
    distress &&
    distress.seconds >= DISTRESS_WAR_THRESHOLD_SECONDS &&
    stance !== 'war' &&
    stance !== 'allied' &&
    (otherVillage.stock[distress.resource] ?? 0) > 0 &&
    (otherVillage.demand[distress.resource] ?? 0) <= TRADE_SURPLUS_DEMAND_MAX
  ) {
    setStance(clan, other, 'war');
    village.raidTargetVillageId = otherVillage.id; // dá efeito prático à guerra, ver agent/actions/raid.js
    updateWarriorRoles(village, world, true);
    pushEvent(world, `${clan.name} declarou guerra a ${other.name}`);
    return;
  }

  // 2. Guerra que não é mais alimentada por desespero — propõe paz de volta.
  if (stance === 'war' && (!distress || distress.seconds < DISTRESS_WAR_THRESHOLD_SECONDS / 2)) {
    setStance(clan, other, 'neutral');
    if (village.raidTargetVillageId === otherVillage.id) village.raidTargetVillageId = null;
    // Postura com ESSE clã virou paz, mas o clã pode seguir em guerra com um
    // terceiro — só desmobiliza de vez se não sobrou nenhuma guerra.
    updateWarriorRoles(village, world, isClanAtWar(clan));
    pushEvent(world, `${clan.name} fez as pazes com ${other.name}`);
    return;
  }

  // Guerra que continua (não escalou nem esfriou agora): garante que exista
  // um alvo de saque, mesmo se este par não foi quem acabou de declará-la
  // (ex.: guerra reativada em outra reconsideração). Simplificação: só um
  // alvo por vez, mesmo se em guerra com mais de um clã (mundo tem N vilas/
  // clãs, mas raidTargetVillageId é singular, mesmo espírito de "1 vila por
  // clã" já assumido no resto deste arquivo).
  if (stance === 'war') {
    if (!village.raidTargetVillageId) village.raidTargetVillageId = otherVillage.id;
    updateWarriorRoles(village, world, true); // topa quem cresceu virou adulto desde a última vez
    return;
  }

  // 'allied' já comercia livremente sem tratado (canTrade, diplomacy.js) —
  // nada a propor. 'tense' continua elegível pra propor comércio abaixo:
  // achado ao vivo nesta sessão — uma vila podia nascer "tensa" com o único
  // outro clã que produz o recurso que ela não produz, e presa nisso pra
  // sempre (proposta de comércio pulada aqui, guerra só escala se o outro
  // lado tiver sobra — nem sempre verdade), morrendo de fome individual sem
  // nenhum caminho institucional de saída. canTrade não bloqueia por tensão,
  // só decisão de propor — motivo nenhum real pra recusar aqui.
  if (stance === 'allied') return;

  // 3. Ainda não comercia com esse clã, precisa de um recurso que ele tem
  //    de sobra — propõe comércio.
  if (!hasTreaty(clan, other, 'trade') && distress && (otherVillage.demand[distress.resource] ?? 0) <= TRADE_SURPLUS_DEMAND_MAX) {
    const treaty = proposeTreaty(clan, other, 'trade');
    signTreaty(treaty, clan, other, world.tick ?? 0);
    pushEvent(world, `${clan.name} assinou um tratado de comércio com ${other.name}`);
    return;
  }

  // 4. Já exporta um recurso de sobra pra esse clã, mas existe um 3º bem
  //    mais desesperado por ele — rompe e assina com quem precisa mais
  //    ("achou um parceiro melhor", sem precisar de sistema de pagamento).
  if (hasTreaty(clan, other, 'trade')) {
    for (const resource of surplusResources(village)) {
      const currentDemand = otherVillage.demand[resource] ?? 0;
      const betterPartner = findBetterPartner(world, clan, other.id, resource, currentDemand);
      if (betterPartner) {
        const oldTreaty = clan.treaties.find(
          (t) => t.type === 'trade' && t.status === 'signed' && (t.clanA === other.id || t.clanB === other.id),
        );
        if (oldTreaty) breakTreaty(oldTreaty);
        const treaty = proposeTreaty(clan, betterPartner, 'trade');
        signTreaty(treaty, clan, betterPartner, world.tick ?? 0);
        return;
      }
    }
  }
}

export function updateClanDecision(clan, world, dt) {
  clan.decisionTimer -= dt;
  if (clan.decisionTimer > 0) return;
  clan.decisionTimer = world.rng.range(CLAN_RECONSIDER_INTERVAL_MIN, CLAN_RECONSIDER_INTERVAL_MAX);

  const village = getClanVillage(world, clan);
  if (!village || village.population.length === 0) return; // vila extinta não decide nada (ver reconsiderRelationship)

  // Efetivo militar é reavaliado SEMPRE, não só nas transições de postura —
  // é o que mantém a guarnição de paz existindo e absorve quem nasceu ou
  // virou adulto desde a última reconsideração.
  updateWarriorRoles(village, world, isClanAtWar(clan));

  for (const other of world.clans) {
    if (other.id === clan.id) continue;
    const otherVillage = getClanVillage(world, other);
    if (!otherVillage) continue;
    reconsiderRelationship(world, clan, other, village, otherVillage);
  }
}
