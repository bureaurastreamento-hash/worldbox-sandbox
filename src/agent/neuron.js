// Neurônios: a camada de PRIORIDADE por cima do utility AI que já existia.
//
// O que já existia e continua: cada ação (agent/actions/*) sabe se pontuar
// entre 0 e ~1 a partir da necessidade do agente e da demanda da vila. Esse
// número é bom e carrega calibragem de muitas sessões — ele vira o PESO do
// neurônio, não é jogado fora.
//
// O que faltava, e é o que este módulo acrescenta:
//
//   1. FAIXAS DE PRIORIDADE. Antes tudo competia num espaço plano de 0 a 1,
//      então "comer" e "colher madeira" eram comparados pelo mesmo número, e
//      só ganhava quem tivesse o peso maior. É por isso que a IA lia como
//      rasa: um agente faminto podia continuar trabalhando porque a madeira
//      estava valendo 0.8 naquele instante. Agora fome é SURVIVAL e madeira é
//      GROWTH — a faixa decide primeiro, o peso decide só o desempate dentro
//      dela.
//
//   2. `canFire` COM LIMIAR DE VERDADE. Sem isso a faixa vira uma armadilha:
//      `eat` pontua acima de zero já com fome 90 (a curva de urgência é
//      contínua), então "SURVIVAL sempre ganha de GROWTH" faria todo agente
//      comer o tempo todo e a economia parar. Cada neurônio declara o peso
//      mínimo abaixo do qual ele nem se candidata.
//
//   3. ESCOLHA COM RUÍDO (80/20). Antes era argmax puro: dado o mesmo estado,
//      sempre a mesma decisão. Agora 80% das vezes o agente escolhe dentro da
//      faixa mais urgente e 20% entre todas as ativas, e dentro do conjunto a
//      escolha é sorteada proporcionalmente ao peso. É o que faz dois
//      moradores na mesma situação não agirem como cópias.

import { ACTION_TYPES } from './actions/actionTypes.js';
import { NEURON_TOP_PRIORITY_CHANCE } from '../utils/constants.js';
import { neuronWeightFactor, neuronPriorityOverride } from './traits.js';

// Ordem crescente de urgência. O número é o que se compara; os nomes existem
// pra o registro abaixo ficar legível.
export const PRIORITY = {
  IDLE: 0,
  GROWTH: 1,
  COGNITIVE: 2,
  SURVIVAL: 3,
  IMMEDIATE: 4,
};

// Registro dos neurônios. Deliberadamente um mapa de DADOS sobre as ações que
// já existem, em vez de reescrever os 16 módulos de ação: a lógica de cada
// ação (como pontuar, como executar) continua sendo dela, e aqui mora só o
// que é novo — em que faixa ela vive e a partir de que peso ela se candidata.
// Acrescentar um neurônio é acrescentar uma linha aqui mais o módulo da ação.
//
// `minWeight` é o `canFire`.
//
// `urgentAbove` é a correção de um erro que custou uma rodada inteira: pôr
// `eat` numa faixa fixa de SURVIVAL fez a fome vencer QUALQUER trabalho
// sempre que ela pudesse disparar. Medido, 46% dos agentes comiam ao mesmo
// tempo e 22 de 24 vilas foram extintas em 135s — todo mundo comendo, ninguém
// produzindo.
//
// O erro conceitual era tratar prioridade como propriedade da AÇÃO. Comer não
// é urgente; comer COM FOME CRÍTICA é. Então a faixa escala com o peso: até
// `urgentAbove` a ação compete pelo peso na faixa normal (que é como o jogo
// sempre funcionou e foi calibrado), e acima disso ela sobe pra SURVIVAL e
// passa a interromper o resto. É o que dá o comportamento pedido — o faminto
// larga a machadaria — sem transformar fome moderada num veto permanente.
export const NEURONS = {
  // Reação a ameaça: interrompe qualquer coisa.
  fleePredator: { priority: PRIORITY.IMMEDIATE, minWeight: 0 },
  flee: { priority: PRIORITY.IMMEDIATE, minWeight: 0 },

  // Sobrevivência do indivíduo e defesa direta.
  // urgentAbove 0.76 = fome ~35 na curva de urgência (x EAT_URGENCY_WEIGHT).
  eat: { priority: PRIORITY.GROWTH, minWeight: 0, urgentAbove: 0.76 },
  // urgentAbove 0.42 = sono ~35.
  sleep: { priority: PRIORITY.GROWTH, minWeight: 0, urgentAbove: 0.42 },
  fightPredator: { priority: PRIORITY.SURVIVAL, minWeight: 0 },
  fight: { priority: PRIORITY.SURVIVAL, minWeight: 0 },

  // Deliberação: sair pra descobrir, rondar o território.
  explore: { priority: PRIORITY.COGNITIVE, minWeight: 0 },
  patrol: { priority: PRIORITY.COGNITIVE, minWeight: 0 },

  // Economia e expansão — o grosso do dia a dia.
  deliver: { priority: PRIORITY.GROWTH, minWeight: 0 },
  gather: { priority: PRIORITY.GROWTH, minWeight: 0 },
  gatherWood: { priority: PRIORITY.GROWTH, minWeight: 0 },
  fish: { priority: PRIORITY.GROWTH, minWeight: 0 },
  mine: { priority: PRIORITY.GROWTH, minWeight: 0 },
  build: { priority: PRIORITY.GROWTH, minWeight: 0 },
  raid: { priority: PRIORITY.GROWTH, minWeight: 0 },

  // Fallback.
  wander: { priority: PRIORITY.IDLE, minWeight: 0 },
};

const DEFAULT_NEURON = { priority: PRIORITY.GROWTH, minWeight: 0 };

// Reutilizado entre chamadas: `reconsider` roda pra centenas de agentes e
// alocar um array por reconsideração é lixo por frame à toa.
const active = [];

// Neurônios que podem disparar agora, com peso e prioridade já ajustados
// pelos traços do agente.
export function collectActive(agent, world, scoresOut) {
  active.length = 0;

  for (const id of Object.keys(ACTION_TYPES)) {
    const raw = ACTION_TYPES[id].score(agent, world);
    if (scoresOut) scoresOut[id] = raw; // snapshot pra ui/inspector.js
    if (!(raw > 0)) continue;

    const spec = NEURONS[id] ?? DEFAULT_NEURON;
    const weight = raw * neuronWeightFactor(agent, id);
    if (weight < spec.minWeight) continue; // canFire

    let priority = neuronPriorityOverride(agent, id) ?? spec.priority;
    // A urgência promove a faixa: ver o comentário de `urgentAbove` acima.
    if (spec.urgentAbove !== undefined && weight >= spec.urgentAbove) {
      priority = Math.max(priority, PRIORITY.SURVIVAL);
    }
    active.push({ id, weight, priority });
  }

  return active;
}

// Sorteio proporcional ao peso AO QUADRADO.
//
// Proporcional ao peso puro foi testado e custou caro: a população caiu de
// ~250 pra ~133 e 15 de 24 vilas se extinguiram. O motivo é que peso não é
// probabilidade — uma ação valendo 0.3 contra outra valendo 0.8 era escolhida
// 27% das vezes, e o agente passava mais de um quarto do tempo fazendo a
// segunda melhor coisa. Multiplicado por centenas de agentes o tempo todo,
// isso é uma perda enorme de eficiência.
//
// Elevar ao quadrado mantém a variedade (a opção fraca continua possível) mas
// devolve o peso ao papel de FAVORITISMO forte: no mesmo exemplo, 0.3 cai pra
// 12%. É o meio-termo entre o argmax determinístico de antes, que fazia a
// vila inteira agir como cópia, e o sorteio proporcional, que fazia todo
// mundo trabalhar mal.
function pickWeighted(list, rng) {
  let total = 0;
  for (const n of list) total += n.weight * n.weight;
  if (total <= 0) return list[0] ?? null;

  let roll = rng.next() * total;
  for (const n of list) {
    roll -= n.weight * n.weight;
    if (roll <= 0) return n;
  }
  return list[list.length - 1];
}

const pool = [];

// Escolhe um neurônio entre os ativos.
//
// 80% das vezes só a faixa mais urgente concorre — é o que garante que
// necessidade crítica não perca pra peso alto de trabalho. Nos outros 20%
// todos concorrem, o que dá ao agente uma chance de fazer algo fora do óbvio.
// Esse ruído é o que impede a vila inteira de reagir de forma idêntica ao
// mesmo estado, e é barato: uma comparação e um sorteio.
export function selectNeuron(activeList, rng) {
  if (activeList.length === 0) return null;

  let topPriority = activeList[0].priority;
  for (const n of activeList) {
    if (n.priority > topPriority) topPriority = n.priority;
  }

  pool.length = 0;
  if (rng.next() < NEURON_TOP_PRIORITY_CHANCE) {
    for (const n of activeList) {
      if (n.priority === topPriority) pool.push(n);
    }
  } else {
    for (const n of activeList) pool.push(n);
  }

  return pickWeighted(pool, rng);
}

// Prioridade da ação CORRENTE, usada por decision.js pra decidir se a
// candidata pode interromper. Recebe o peso porque a faixa pode ter sido
// promovida pela urgência — sem isso, um agente já comendo por fome crítica
// apareceria como GROWTH e seria interrompido por qualquer trabalho.
export function priorityOf(agent, id, weight = 0) {
  const spec = NEURONS[id] ?? DEFAULT_NEURON;
  let priority = neuronPriorityOverride(agent, id) ?? spec.priority;
  if (spec.urgentAbove !== undefined && weight >= spec.urgentAbove) {
    priority = Math.max(priority, PRIORITY.SURVIVAL);
  }
  return priority;
}
