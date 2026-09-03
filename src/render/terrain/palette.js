// Paleta do terreno. É dado, não lógica — mexer em cor é mexer só aqui.
//
// A régua é a arte dos personagens (Tiny RPG / craftpix): tons dessaturados,
// sombreado suave, sem contorno preto. O terreno anterior era uma cor chapada
// por tipo de tile (`TILE_COLORS`), e era isso que fazia o mapa parecer
// desenho animado — não a falta de detalhe, mas a falta de VARIAÇÃO DE VALOR
// dentro de cada tile e a ausência de uma direção de luz consistente.
//
// Cada tipo traz uma rampa de 5 tons do mais escuro ao mais claro. A regra
// que mantém tudo coeso: a luz vem sempre do canto superior esquerdo, então
// `light` aparece em cima/à esquerda de qualquer relevo e `shadow` embaixo/à
// direita. Sem isso as texturas viram padrão de papel de parede em vez de
// superfície.

export const TERRAIN_PALETTE = {
  water: {
    ramp: ['#2a4b63', '#33596f', '#3d687d', '#4a7a8d', '#5d8f9e'],
    base: '#33596f',
    light: '#7cb0bd',
    shadow: '#24405a',
  },
  sand: {
    ramp: ['#9c8560', '#b09872', '#c2ab86', '#d0bb99', '#dcc9ab'],
    base: '#c2ab86',
    light: '#e6d6ba',
    shadow: '#8a7454',
  },
  grass: {
    ramp: ['#4a5f38', '#556b3e', '#617947', '#6d8750', '#7b975c'],
    base: '#617947',
    light: '#8fac6b',
    shadow: '#3d4f2e',
  },
  forest: {
    ramp: ['#2b3b26', '#33472c', '#3c5334', '#46603c', '#526e46'],
    base: '#33472c',
    light: '#63814f',
    shadow: '#1f2b1b',
  },
  mountain: {
    ramp: ['#4f5358', '#5d6167', '#6c7076', '#7b8086', '#8b9096'],
    base: '#6c7076',
    light: '#a3a8ae',
    shadow: '#3b3e42',
  },
};

// Minérios: a cor do mineral em si, mais o brilho que marca a face voltada
// pra luz. Cada depósito é desenhado como pedra incrustada na rocha, não como
// um ícone centralizado — o ícone flutuando no meio do tile era metade do
// motivo de a montanha parecer um tabuleiro.
export const ORE_PALETTE = {
  stone: { core: '#8d9299', light: '#b3b8bf', dark: '#5a5f66' },
  coal: { core: '#2f3338', light: '#565d66', dark: '#17191c' },
  iron: { core: '#9a8c7e', light: '#c4b8a9', dark: '#645a50' },
  gold: { core: '#c9a12f', light: '#f0d878', dark: '#8a6c16' },
};

// Quem desenha por cima de quem nas transições entre tipos. O tipo de
// prioridade mais baixa vira o fundo do tile e o mais alto invade por cima
// com borda irregular — é o que dissolve a grade de quadrados perfeitos que
// mais entregava o aspecto "cartoon".
export const TERRAIN_PRIORITY = { water: 0, sand: 1, grass: 2, forest: 3, mountain: 4 };
