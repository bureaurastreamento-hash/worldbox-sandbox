# ASSISTANT_SUMMARY.md

Resumo para o assistente externo que ajuda a planejar as fases. Escrito pra
ser lido sem acesso ao código.

## O que foi implementado

### Fase A — Escala e LOD
- **LOD de simulação por viewport REMOVIDO** (`simulation/lod.js` deletado).
  A câmera não decide mais quem existe. Isso também apagou a simulação
  *agregada* de vilas fora de tela, que era uma segunda física paralela —
  navegar o mapa mudava o resultado do jogo.
- **Time-slicing de cognição** (`simulation/scheduler.js`): o caro (percepção,
  memória, pontuar ações) roda só na reconsideração; o barato (needs, idade,
  passo da ação) roda todo frame pra todo mundo. A fatia é ancorada no relógio
  **simulado**, e o teto por frame é proporcional ao `dt` — com fatias por
  frame, rodar em 4x faria os agentes pensarem menos.
- **Seis estruturas O(n²) eliminadas**: busca de agente por id dentro de laços
  por vila/clã/predador; `recallNearest` varrendo a memória inteira; separação
  em pares sobre todos os vivos; `updateTrade` rodando O(vilas²) todo frame;
  `getVillage`/`getClan` lineares dentro de `isHostileTerritory`; e checagem de
  ameaça em agentes com vida cheia.
- **LOD de renderização** (`render/lodRenderer.js`), 3 níveis por zoom, com
  agrupamento por cor de clã no nível de pontos.
- **Object pooling** (`utils/objectPool.js`), partículas migradas.
- **World-gen em grade** com jitter, escalando pra dezenas de vilas.

### Fase C — Navegação
- **HPA\*** (`world/chunks.js`, `world/hpaStar.js`): mapa em chunks de 32×32,
  um portal por **trecho contínuo atravessável** (não por célula), e as arestas
  internas guardam o **caminho**, não só o custo.
- **Flow fields** (`world/flowField.js`): BFS a partir do destino, campo de
  direções lido por N unidades. Ligado ao saque.
- Fallback pro A\* plano se o HPA\* não resolver — nada quebra por lacuna do
  grafo abstrato.

### Fase B — Decisão
- **Neurônios** (`agent/neuron.js`): faixas Idle/Growth/Cognitive/Survival/
  Immediate, `canFire` com limiar, escolha 80/20 com peso elevado a expoente.
  O registro é um mapa de **dados** sobre as ações existentes — não reescreveu
  os 16 módulos de ação.
- **Traços** (`agent/traits.js`): 7 traços em três eixos — `attributes`,
  `neuronWeight` (multiplica) e `neuronPriority` (promove a faixa). Permanentes
  e temporários com prazo, com cache consolidado.

## Métricas atuais

| Métrica | Valor |
|---|---|
| Agentes estáveis | ~205 em 24 vilas (`VILLAGE_COUNT` conservador) |
| Simulação por frame | 2.5-7ms conforme população (orçamento 16.7ms) |
| Reconsideração | 0.017ms por agente |
| Navegação longa | < 1ms (era 8ms) |
| Flow field | 17.8ms uma vez por destino; 0.116µs por unidade |
| Qualidade de navegação | HPA\* acha 19/20 caminhos; A\* plano achava 11/20 |

## Desafios superados

- **Um gargalo de A\* que ninguém tinha provocado**: o conjunto aberto era um
  array reordenado por completo a cada iteração. Custava 33x o tempo de
  simulação assim que alvos distantes viraram comuns.
- **Uma extinção total que foi publicada sem eu ver**: o commit da construção
  levava as quatro vilas a zero por volta dos 400s. Invisível na janela de
  180s em que tudo vinha sendo medido, porque a população *pica* ali.
- **Três hipóteses erradas** sobre essa extinção, todas testadas e
  descartadas: sincronia de idades, desperdício de mão de obra em obras
  interrompidas, e falta de margem econômica (aumentar a produção **piorou** —
  a economia é homeostática: mais comida abaixa o score de colher e o excedente
  vira atividade não-alimentar).
- **Dois erros de modelagem na Fase B**, os dois medidos como colapso:
  prioridade tratada como propriedade da ação (22 de 24 vilas extintas em
  135s), e peso tratado como probabilidade (população de ~250 pra ~133).

## Recomendações para a Fase D (Genética)

**1. A base já está no formato certo.** `rollTraits(rng)` devolve uma lista de
ids de traço — exatamente o que a herança precisa produzir. `agent.attributes`
já existe e já é modificado por traços, mas **nada o lê ainda**; os genes podem
alimentá-lo sem quebrar nada.

**2. Priorize genes que mexem em PRIORIDADE, não em peso.** Este é o achado
mais acionável da Fase B: o multiplicador de peso só muda algo quando há
competição dentro da faixa. `coward` tem `fleePredator: 1.5`, mas fugir é
IMMEDIATE e costuma estar sozinho na faixa — o multiplicador é inerte. Um gene
"agressivo" que promove `fight` pra Immediate produz comportamento visível; um
que multiplica o peso de `fight` por 1.5 provavelmente não produz nada.

**3. Herança de neurônios não precisa existir como conceito separado.** O
neurônio é a ação; o que varia entre indivíduos são os **modificadores**. Herdar
traços já é herdar comportamento. Um gene é um traço com regra de transmissão —
não invente uma segunda camada paralela.

**4. Sinergia (genes "dourados") combina bem com a composição que já existe.**
Os multiplicadores de traço já **compõem** (multiplicam entre si) em vez de
somar. Dois genes que puxam a mesma ação já se reforçam; sinergia é o mesmo
mecanismo com um bônus explícito quando o par é reconhecido.

**5. Cuidado com o orçamento de tempo de agente.** Genética em si não consome
tempo de agente (é modificador, não ação), então a Fase D é das mais seguras do
plano. Mas se ela introduzir ações novas (acasalamento seletivo, por exemplo),
essas precisam passar por `canDevelop` como todas as outras.

**6. Investigue as extinções de vilas antes ou junto.** 9 de 24 vilas extintas
em 468s, com população total estável. Não foi isolado se é consequência da Fase
B ou pré-existente com 24 vilas. O teste é barato: rodar o mesmo seed no commit
anterior à Fase B e comparar a curva. Vale fazer antes de empilhar genética,
porque genética muda taxas de reprodução e vai confundir o diagnóstico.

**7. Meça com 5-6 seeds × 600s.** Não confie em seed único (a rng diverge) nem
em janelas curtas (a população pica aos 180s e só depois desaba). A genética
altera reprodução diretamente, então é exatamente o tipo de mudança que só
aparece no longo prazo.
