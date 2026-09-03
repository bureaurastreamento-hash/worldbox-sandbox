// Nomes das faixas de prioridade -> valor numérico.
//
// Vive num módulo próprio (em vez de em neuron.js) só pra quebrar um ciclo de
// importação: `traits.js` precisa traduzir "SURVIVAL" pra número, e
// `neuron.js` importa `traits.js`. Sem esta separação os dois se importariam
// mutuamente.
export const PRIORITY_BY_NAME = {
  IDLE: 0,
  GROWTH: 1,
  COGNITIVE: 2,
  SURVIVAL: 3,
  IMMEDIATE: 4,
};
