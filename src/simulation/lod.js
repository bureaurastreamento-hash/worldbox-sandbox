// Fatia 10: nível de detalhe de simulação — agentes/vilas fora da área ativa
// (fora da câmera / não marcados como relevantes) rodam em modo agregado/
// estatístico em vez de full-fidelity (needs/decision/perception por tick).
// Promove/rebaixa conforme o jogador navega. É o que permite chegar a
// milhares de agentes sem custar milhares de decision.js completos por tick.

// TODO (fatia 10): classifyAgents(world, camera) -> { active[], simulated[] }, stepAggregate(simulatedGroup, dt)
