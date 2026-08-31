// Fatia 3+: índice espacial (buckets de grid) para consultas de proximidade
// rápidas — usado por Perception (quem está no raio de visão) e mais tarde
// por Simulation LOD (quem está perto da câmera / é relevante). Sem isso,
// perception vira O(n) por agente e não escala.

// TODO (fatia 3): createSpatialIndex(world), query(pos, radius) -> entities[]
