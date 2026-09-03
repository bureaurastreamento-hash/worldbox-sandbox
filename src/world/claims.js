// Reserva de tile de recurso: impede que vários agentes convirjam pro mesmo
// alvo de colheita/mineração.
//
// O problema medido antes disto: cada agente escolhia o alvo com
// `recallNearest` a partir da própria posição, isoladamente. Como os
// moradores de uma vila ficam próximos e têm memórias parecidas, escolhiam o
// mesmo tile com frequência — **42% das observações tinham alvo
// compartilhado**, com grupos de até 5 agentes indo à mesma árvore. Não era
// bug de correção (recurso é infinito por design, os 5 colhiam normalmente),
// mas é exatamente a cara de "burro": um bando caminhando junto até a mesma
// árvore, passando por dezenas de árvores idênticas livres.
//
// Modelo: `world.claims` mapeia "tx,ty" -> agentId, e cada agente guarda em
// `agent.claimedTile` a chave que reservou. Um agente mira um alvo por vez,
// então uma reserva por agente basta — e ter o vínculo dos dois lados torna a
// liberação O(1) em vez de uma varredura do mapa inteiro.
//
// Não há expiração por tempo de propósito: a reserva é presa ao AGENTE, e ele
// sempre libera — ao trocar de alvo (clearMovement), ao encher a carga, ou ao
// morrer (lifecycle.js:pruneDead). Um timeout só criaria uma segunda fonte de
// verdade pra sincronizar.

export function createClaims() {
  return new Map(); // "tx,ty" -> agentId
}

export function claimKey(tx, ty) {
  return `${tx},${ty}`;
}

// Reserva um tile pro agente, liberando o anterior dele. Devolve false se o
// tile já é de outro (o chamador não deveria ter escolhido, mas a checagem
// evita que uma corrida silenciosa roube a reserva alheia).
export function claimTile(world, agent, tx, ty) {
  const key = claimKey(tx, ty);
  const owner = world.claims.get(key);
  if (owner && owner !== agent.id) return false;

  releaseClaim(world, agent);
  world.claims.set(key, agent.id);
  agent.claimedTile = key;
  return true;
}

export function releaseClaim(world, agent) {
  const key = agent.claimedTile;
  if (!key) return;
  // Só apaga se ainda for dele: se outro agente já reservou este tile, apagar
  // aqui roubaria a reserva de quem está a caminho.
  if (world.claims.get(key) === agent.id) world.claims.delete(key);
  agent.claimedTile = null;
}

export function isClaimedByOther(world, agent, tx, ty) {
  const owner = world.claims.get(claimKey(tx, ty));
  return owner !== undefined && owner !== agent.id;
}
