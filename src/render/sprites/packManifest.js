// Manifesto do pack em `assets/Pers-Sprites/`. É DADO, não lógica — o
// navegador não consegue listar um diretório, então a lista de arquivos
// precisa existir em algum lugar. Gerado a partir do conteúdo real da pasta.
//
// Fora daqui de propósito:
//   - `Animais/` (urso/lobo/cobra/besouro): são os mesmos arquivos do pack
//     Retro RPG Animal Wildlife reprovados por qualidade, e as tiras deles
//     têm layout diferente (4 colunas x N linhas, não 1 linha) — o formato 1
//     não os leria certo. Decisão do usuário: ignorar por enquanto.
//   - `Vários tipos de chão-.../roguelikeSheet_transparent.png`: folha de
//     tiles 16x16 com 1px de margem, um terceiro formato ainda não escrito.
//   - os `character_N_frame16x20.png`: mesma arte que o `frame32x32`, só que
//     menor. Um por personagem basta.

// Formato 1 — tiras horizontais, uma ação por arquivo.
export const STRIP_SHEETS = [
  // Monstro1
  'assets/Pers-Sprites/Monstro1/Blood Monster_A_Attack01.png',
  'assets/Pers-Sprites/Monstro1/Blood Monster_A_Attack02.png',
  'assets/Pers-Sprites/Monstro1/Blood Monster_A_Death.png',
  'assets/Pers-Sprites/Monstro1/Blood Monster_A_Hurt.png',
  'assets/Pers-Sprites/Monstro1/Blood Monster_A_Idle.png',
  'assets/Pers-Sprites/Monstro1/Blood Monster_A_Walk.png',
  // Monstro2
  'assets/Pers-Sprites/Monstro2/Demon_A_Attack01.png',
  'assets/Pers-Sprites/Monstro2/Demon_A_Attack02.png',
  'assets/Pers-Sprites/Monstro2/Demon_A_Death.png',
  'assets/Pers-Sprites/Monstro2/Demon_A_Hurt.png',
  'assets/Pers-Sprites/Monstro2/Demon_A_Idle.png',
  'assets/Pers-Sprites/Monstro2/Demon_A_Walk.png',
  // Monstro3
  'assets/Pers-Sprites/Monstro3/Orc_Attack01.png',
  'assets/Pers-Sprites/Monstro3/Orc_Attack02.png',
  'assets/Pers-Sprites/Monstro3/Orc_Death.png',
  'assets/Pers-Sprites/Monstro3/Orc_Hurt.png',
  'assets/Pers-Sprites/Monstro3/Orc_Idle.png',
  'assets/Pers-Sprites/Monstro3/Orc_Walk.png',
  // Soldado1
  'assets/Pers-Sprites/Soldado1/Soldier_Attack01.png',
  'assets/Pers-Sprites/Soldado1/Soldier_Attack02.png',
  'assets/Pers-Sprites/Soldado1/Soldier_Attack03.png',
  'assets/Pers-Sprites/Soldado1/Soldier_Death.png',
  'assets/Pers-Sprites/Soldado1/Soldier_Hurt.png',
  'assets/Pers-Sprites/Soldado1/Soldier_Idle.png',
  'assets/Pers-Sprites/Soldado1/Soldier_Walk.png',
];

// Formato 2 — grade RPG 3x4 (um personagem por arquivo), 32 personagens.
export const GRID_SHEETS = [
  'assets/Pers-Sprites/Humanos-separados/character_1/character_1_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_10/character_10_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_11/character_11_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_12/character_12_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_13/character_13_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_14/character_14_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_15/character_15_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_16/character_16_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_17/character_17_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_18/character_18_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_19/character_19_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_2/character_2_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_20/character_20_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_21/character_21_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_22/character_22_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_23/character_23_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_24/character_24_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_25/character_25_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_26/character_26_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_27/character_27_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_28/character_28_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_29/character_29_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_3/character_3_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_30/character_30_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_31/character_31_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_32/character_32_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_4/character_4_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_5/character_5_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_6/character_6_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_7/character_7_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_8/character_8_frame32x32.png',
  'assets/Pers-Sprites/Humanos-separados/character_9/character_9_frame32x32.png',
];

export const ALL_SHEETS = [...STRIP_SHEETS, ...GRID_SHEETS];
