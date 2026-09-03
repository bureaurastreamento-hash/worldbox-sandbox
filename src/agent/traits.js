// Traços: o que faz dois agentes na mesma situação decidirem diferente.
//
// Um traço é um PACOTE DE MODIFICADORES, não um comportamento. Ele não sabe
// lutar nem colher — ele muda o quanto lutar ou colher pesa na cabeça de quem
// o carrega, e quanto valem os atributos dessa pessoa. Toda a lógica continua
// nos módulos de ação; o traço só inclina a balança.
//
// Três eixos de influência, e a diferença entre eles importa:
//
//   attributes    — números do personagem (inteligência, diplomacia, guerra,
//                   administração). Ainda quase não são lidos pelo jogo: são
//                   a base das Fases F/G (liderança, lealdade, sucessão), e
//                   entram agora porque é o traço que os define.
//   neuronWeight  — multiplica o peso de um neurônio. É o eixo mais visível:
//                   um agente agressivo não ganha uma ação nova, ele passa a
//                   pontuar lutar mais alto que os vizinhos.
//   neuronPriority— muda a FAIXA de um neurônio. É a influência mais forte
//                   que um traço pode ter, porque faixa vence peso: um traço
//                   que promove `fight` a IMMEDIATE faz o agente largar o que
//                   estiver fazendo pra brigar.
//
// Permanentes vs temporários: `agent.traits` são os permanentes (sorteados no
// nascimento hoje; herdados na Fase D). `agent.tempTraits` têm prazo e são
// removidos por `updateTraits` — é o gancho pros efeitos de status (queimando,
// confuso, envenenado) que a pesquisa descreve.

import { TRAIT_COUNT_MAX, TRAIT_CHANCE } from '../utils/constants.js';
import { PRIORITY_BY_NAME } from './priorityNames.js';

export const TRAIT_CATEGORY = {
  COGNITIVE: 'cognitive',
  MENTAL: 'mental',
  PHYSICAL: 'physical',
};

// Os valores de atributo seguem a tabela da pesquisa (pesquisawolrd.md §3) —
// não foram inventados, pra o dia em que lealdade e sucessão os consumirem
// (Fases F/G) já baterem com a referência.
export const TRAITS = {
  genius: {
    id: 'genius',
    label: 'Gênio',
    category: TRAIT_CATEGORY.COGNITIVE,
    attributes: { intelligence: 10, diplomacy: 5, stewardship: 7, warfare: 5 },
    neuronWeight: { explore: 1.4, build: 1.3, mine: 1.2 },
  },
  idiot: {
    id: 'idiot',
    label: 'Idiota',
    category: TRAIT_CATEGORY.COGNITIVE,
    attributes: { intelligence: -5, diplomacy: -2, loyalty: -15 },
    neuronWeight: { explore: 0.5, build: 0.6, fight: 1.2 },
  },
  ambitious: {
    id: 'ambitious',
    label: 'Ambicioso',
    category: TRAIT_CATEGORY.MENTAL,
    attributes: { warfare: 4, diplomacy: 2, stewardship: 1, loyalty: -15 },
    neuronWeight: { raid: 1.6, fight: 1.4, build: 1.2 },
    // Promover a faixa é o modificador mais forte do sistema: um ambicioso
    // larga o trabalho pra brigar, não só briga um pouco mais.
    neuronPriority: { raid: 'SURVIVAL' },
  },
  honest: {
    id: 'honest',
    label: 'Honesto',
    category: TRAIT_CATEGORY.MENTAL,
    attributes: { loyalty: 5, stewardship: 3, diplomacy: 2, warfare: -2 },
    neuronWeight: { deliver: 1.3, raid: 0.5 },
  },
  coward: {
    id: 'coward',
    label: 'Covarde',
    category: TRAIT_CATEGORY.MENTAL,
    attributes: { warfare: -4 },
    neuronWeight: { flee: 1.5, fleePredator: 1.5, fight: 0.4, raid: 0.4 },
  },
  hardy: {
    id: 'hardy',
    label: 'Resistente',
    category: TRAIT_CATEGORY.PHYSICAL,
    attributes: { strength: 5 },
    neuronWeight: { gather: 1.25, gatherWood: 1.25, mine: 1.25, fish: 1.25 },
  },
  restless: {
    id: 'restless',
    label: 'Inquieto',
    category: TRAIT_CATEGORY.MENTAL,
    attributes: {},
    neuronWeight: { explore: 1.8, patrol: 1.4, wander: 1.5, sleep: 0.8 },
  },
};

const TRAIT_IDS = Object.keys(TRAITS);

export const BASE_ATTRIBUTES = {
  intelligence: 0,
  diplomacy: 0,
  warfare: 0,
  stewardship: 0,
  strength: 0,
  loyalty: 0,
};

// Sorteia os traços permanentes de um agente. Na Fase D isto passa a ser
// herança genética; por ora é sorteio, e o formato (lista de ids) já é o que
// a herança vai produzir.
export function rollTraits(rng) {
  const chosen = [];
  for (let i = 0; i < TRAIT_COUNT_MAX; i++) {
    if (rng.next() >= TRAIT_CHANCE) continue;
    const id = TRAIT_IDS[rng.int(0, TRAIT_IDS.length - 1)];
    if (!chosen.includes(id)) chosen.push(id);
  }
  return chosen;
}

// Consolida traços permanentes + temporários num só objeto de efeitos, e
// guarda no agente.
//
// É CACHE, e é o que torna o sistema barato: sem ele, cada pontuação de cada
// neurônio teria que percorrer a lista de traços do agente — dentro de um
// laço que já roda 16 vezes por reconsideração. Recalcular só quando a lista
// muda transforma isso numa leitura de mapa.
export function refreshTraitEffects(agent) {
  const attributes = { ...BASE_ATTRIBUTES };
  const weight = new Map();
  const priority = new Map();

  const ids = [...(agent.traits ?? []), ...(agent.tempTraits ?? []).map((t) => t.id)];
  for (const id of ids) {
    const trait = TRAITS[id];
    if (!trait) continue;

    for (const [key, value] of Object.entries(trait.attributes ?? {})) {
      attributes[key] = (attributes[key] ?? 0) + value;
    }
    // Multiplicadores de neurônios COMPÕEM (multiplicam entre si) em vez de
    // somar: dois traços que puxam a mesma ação pra cima reforçam um ao
    // outro, e um que puxa pra baixo cancela outro que puxa pra cima, sem
    // nenhum dos dois zerar o peso sozinho.
    for (const [neuronId, factor] of Object.entries(trait.neuronWeight ?? {})) {
      weight.set(neuronId, (weight.get(neuronId) ?? 1) * factor);
    }
    // Em conflito de prioridade, a mais urgente vence.
    for (const [neuronId, name] of Object.entries(trait.neuronPriority ?? {})) {
      const value = PRIORITY_BY_NAME[name];
      if (value === undefined) continue;
      priority.set(neuronId, Math.max(priority.get(neuronId) ?? -1, value));
    }
  }

  agent.attributes = attributes;
  agent.traitEffects = { weight, priority };
  return agent.traitEffects;
}

export function neuronWeightFactor(agent, neuronId) {
  return agent.traitEffects?.weight.get(neuronId) ?? 1;
}

export function neuronPriorityOverride(agent, neuronId) {
  return agent.traitEffects?.priority.get(neuronId);
}

// Expira traços temporários. Chamada junto do resto do ciclo barato do agente
// (main.js), não só na reconsideração: um efeito de status tem que acabar na
// hora certa, não na próxima vez que o agente pensar.
export function updateTraits(agent, dt) {
  const temp = agent.tempTraits;
  if (!temp || temp.length === 0) return;

  let expired = false;
  for (let i = temp.length - 1; i >= 0; i--) {
    temp[i].remaining -= dt;
    if (temp[i].remaining <= 0) {
      temp.splice(i, 1);
      expired = true;
    }
  }
  if (expired) refreshTraitEffects(agent);
}

export function addTempTrait(agent, id, seconds) {
  if (!TRAITS[id]) return;
  if (!agent.tempTraits) agent.tempTraits = [];
  const existing = agent.tempTraits.find((t) => t.id === id);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, seconds);
    return;
  }
  agent.tempTraits.push({ id, remaining: seconds });
  refreshTraitEffects(agent);
}

export function traitLabels(agent) {
  return [...(agent.traits ?? []), ...(agent.tempTraits ?? []).map((t) => t.id)]
    .map((id) => TRAITS[id]?.label ?? id);
}
