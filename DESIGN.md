# DESIGN.md — Worldbox Sandbox

Documento de design do simulador de deus 2D em grid com IA emergente. Serve de referência viva: atualize conforme decisões mudarem.

Decisões-base assumidas (confirmadas com o usuário):
- Jogador: **intervenção mínima** — observa a simulação, sem poderes divinos ativos (raio, terraformar, spawnar) nesta fase.
- Escala alvo: **milhares** de agentes simultâneos.
- Combate: **simulado por agente** (unidade a unidade no grid), não abstrato.
- Ciclo de vida: **completo** — nascimento, envelhecimento, morte, reprodução, desde o início do design.

## 1. Pilares e diferencial em relação ao WorldBox

1. **Comportamento emergente, não scripts de tarefa.** Não existe "vá até a árvore e corte". Existe um agente com necessidades e um sistema de utilidade que pontua ações candidatas a cada momento. A tarefa que ele está fazendo pode ser abandonada no meio se outra ação pontuar mais alto.
2. **Conhecimento limitado e local.** O agente não tem acesso ao estado global do mundo. Ele só sabe o que percebeu dentro do raio de visão e o que ainda lembra (memória com confiança decrescente). Duas vilas podem coexistir sem que os moradores de uma saibam da outra até que alguém as encontre.
3. **Hierarquia de pressão econômica.** Necessidade individual → demanda da vila → postura do clã. A demanda da vila (estoque baixo de um recurso) sobe a pontuação das ações que suprem esse recurso para todos os moradores, sem que ninguém "decida" isso centralmente — é pressão emergente sobre o utility score.
4. **Interdependência real entre vilas especializadas.** Uma vila guerreira que não produz comida depende de um tratado de comércio com uma vila agrícola. Se a vila agrícola cai, a guerreira sente fome de verdade — não é flavor text, é o mesmo sistema de estoque/demanda que rege o resto do jogo.
5. **Jogador como observador, não como onipotência.** Sem WorldBox-style god powers nesta fase. O produto é assistir e entender *por que* a sociedade tomou as decisões que tomou (scores de utilidade inspecionáveis), não moldá-la diretamente.
6. **Design para escala desde o início.** O sistema de utilidade e o loop de decisão são desenhados para suportar milhares de agentes via um nível de detalhe de simulação (LOD) — agentes fora de foco são simulados de forma agregada, não desativados nem full-fidelity o tempo todo.

## 2. Sistemas necessários

Cada sistema lista o que faz e de que depende (dependências = precisa existir antes / consome dados de).

| Sistema | Responsabilidade | Depende de |
|---|---|---|
| **World/Terrain** | Grid de tiles (água, grama, floresta, montanha), geração procedural (seed), nós de recurso por tile com regeneração | — (camada base) |
| **Time loop** | Tick de simulação, pausa, controle de velocidade, timestep fixo para determinismo | — |
| **Camera/Render** | Pan, zoom, desenho do canvas 2D, culling por viewport | World |
| **Perception** | Cada agente varre seu raio de visão a cada intervalo e enxerga tiles/recursos/agentes/ameaças | World, Time loop |
| **Memory** | Agente guarda locais/eventos conhecidos com confiança que decai; esquece o que não é reforçado | Perception |
| **Needs** | Necessidades do agente (fome, sono, segurança, social, pertencimento), decaem com o tempo, sobem por eventos | Time loop |
| **Utility AI / Decision** | Gera ações candidatas a partir de needs + perception + memory + demanda da vila; pontua e escolhe; decide se interrompe a ação atual | Needs, Perception, Memory, Village |
| **Action execution** | Executa a ação escolhida passo a passo (mover, colher, atacar, dormir, entregar recurso); pode ser abortada a qualquer tick | Decision, Pathfinding, World |
| **Pathfinding** | Busca de caminho no grid (A\*) considerando obstáculos de terreno | World |
| **Village** | Estoque comunitário, cálculo de demanda por recurso, população, território, construções | Agentes, World |
| **Clan/Diplomacy** | Agrupa vilas, mantém postura entre clãs (guerra/tensão/neutro/aliança) e tratados com termos | Village |
| **Trade/Economy** | Rotas de comércio entre vilas (dentro do clã ou entre clãs aliados), move excedente para quem tem déficit | Village, Clan |
| **Combat** | Guerreiros calculam engajamento/fuga via utility, resolução unidade a unidade no grid | Agentes, Village, Clan (declaração de guerra) |
| **Life-cycle** | Envelhecimento por tick, morte (fome crítica, combate, idade), reprodução entre agentes da mesma vila | Needs, Village |
| **Simulation LOD** | Agentes/vilas fora da área ativa (fora da câmera / não marcados como relevantes) rodam em modo agregado/estatístico em vez de full-fidelity; promove/rebaixa conforme o jogador navega | Todos acima — é uma camada transversal de otimização |
| **UI/HUD** | Inspeção de agente/vila/clã selecionado, controles de tempo, indicadores visuais de estado | Todos os sistemas de dados |

Nota sobre **Simulation LOD**: é o sistema que resolve a tensão entre "milhares de agentes" e "combate + IA + ciclo de vida completos por agente". Ele não é opcional em escala grande, mas também não precisa existir nas primeiras fatias — as fatias iniciais rodam em escala pequena (dezenas), onde full-fidelity para todo mundo é barato o suficiente. LOD entra depois que o núcleo comportamental já está validado (ver fatia 10).

## 3. Modelo de dados

Formato conceitual (não é código — a estrutura real de arquivos/classes vem no ARCHITECTURE.md).

### World
```
World {
  seed
  width, height
  tiles: Tile[width][height]
  tick, speed, paused
  villages: Village[]
  clans: Clan[]
  agents: Agent[]          // ou acessados via village.population
  spatialIndex             // grid de buckets para queries de proximidade
}

Tile {
  type: water | sand | grass | forest | mountain
  resource: 'stone' | 'coal' | 'iron' | 'gold' | undefined  // só tiles de montanha; atribuído na geração, ver §8. Simplificação do modelo original (sem amount/maxAmount/regenRate — depósito infinito, sem esgotar)
  occupantIds: []          // agentes/estruturas presentes no tile
}
```

### Agent
```
Agent {
  id, name
  position: {x, y}
  villageId
  age, lifeStage: child | adult | elder
  alive, health

  needs: {
    hunger, sleep, safety, social, belonging   // 0-100, cada um com taxa de decaimento própria
  }

  traits: { aggressiveness, sociability, ... } // pesos leves que enviesam o utility score

  perception: {
    radius
    knownTiles: []          // cache do que está visível agora
  }

  memory: {
    locations: [{ type, pos, lastSeenTick, confidence }]
    relationships: [{ agentId, affinity }]
  }

  role                       // farmer | warrior | builder | ... (emergente pela demanda da vila, não fixo)
  currentAction: { type, target, progress, startedTick } | null
  inventory                  // pequeno, o grosso do recurso fica no estoque da vila
}
```

### Village
```
Village {
  id, name, clanId
  territory: { center, radius }   // ou lista de tiles
  founded: tick

  stock: { food, wood, stone, ... }
  capacity: { food, wood, stone, ... }
  demand: { food: 0-1, wood: 0-1, ... }   // derivado de stock/consumo projetado, recalculado por tick

  population: agentId[]
  buildings: []
  specialization: 'food' | 'wood'    // atribuído na criação da vila, balanceado entre todas (ver §6) — simplificação deliberada do "emergente" original, ver STATUS.md
  distress: { food, wood }           // segundos consecutivos de demanda em déficit sustentado — ver §7 (diplomacia dinâmica)
  inChaos: boolean                   // colapso interno derivado da distress — trava reprodução, acelera decaimento de needs dos moradores
}
```

### Clan
```
Clan {
  id, name, color
  memberVillageIds: []
  stanceByClan: { [clanId]: war | tense | neutral | allied }
  treaties: Treaty[]
}

Treaty {
  id, clanA, clanB
  type: alliance | trade | nonaggression | defense_pact
  terms: { ... }             // ex: % de recurso trocado, obrigação de defesa mútua
  signedTick, status: proposed | signed | broken   // 'broken' desde a diplomacia dinâmica, ver §7
}
```

## 4. Loop de decisão do agente (utility AI)

O loop roda por agente, mas **não necessariamente a cada tick** — cada agente tem um intervalo de reconsideração (com jitter aleatório por agente, para não concentrar o custo de decisão de milhares de agentes no mesmo tick) e pode ser interrompido antes disso por um evento relevante (ameaça percebida, necessidade cruzando um limiar crítico).

Passos a cada reconsideração:

1. **Atualizar percepção** — varrer o raio de visão, capturar tiles/recursos/agentes visíveis agora.
2. **Atualizar memória** — reforçar entradas confirmadas pela percepção atual; decair confiança das que não foram vistas de novo; descartar as que caem abaixo do limiar de esquecimento.
3. **Atualizar necessidades** — aplicar decaimento desde a última atualização (proporcional ao tempo passado, não ao número de reconsiderações, para não depender do intervalo escolhido).
4. **Gerar ações candidatas** — toda ação viável dado o que o agente *sabe* (percepção + memória), não o estado real do mundo. Ex.: "colher madeira" só entra na lista se o agente conhece um tile de floresta (visto agora ou lembrado); "entregar recurso ao estoque" só entra se ele carrega algo.
5. **Pontuar cada candidata** combinando:
   - urgência da necessidade que a ação satisfaz (curva não-linear — fome baixa quase não pontua, fome crítica domina o score);
   - viabilidade (distância/custo de tempo até o alvo, risco no caminho);
   - demanda da vila pelo recurso/ação (estoque baixo de comida aumenta o score de qualquer ação que traga comida, para todos os moradores);
   - traços do agente (ex.: sociável pontua mais alto ações sociais);
   - confiança da memória usada (informação antiga pontua menos que percepção direta).
6. **Escolher a de maior score.** Se difere da ação atual, só troca se a diferença ultrapassar um limiar de interrupção — evita flip-flop a cada reconsideração por causa de ruído mínimo de score. Trocar de ação no meio pode custar progresso (ex.: largar metade da lenha cortada).
7. **Executar um passo** da ação escolhida via Action execution (mover um passo, colher uma unidade, avançar a construção etc.) — a execução em si é incremental por tick, não instantânea.
8. Repetir no próximo ciclo de reconsideração do agente.

Esse desenho é o que permite "decidir quantas árvores cortar" e "abandonar no meio se algo mais urgente aparecer": não existe uma tarefa de N passos comprometida — existe uma ação corrente reavaliada a cada reconsideração contra todas as alternativas.

## 5. Ordem de implementação em fatias

Cada fatia deve abrir no navegador e ser jogável/observável sozinha antes de avançar para a próxima.

1. **Mundo + render + loop de tempo.** Grid com geração procedural (água/grama/floresta/montanha), câmera com pan/zoom, tempo com pausa/velocidade. Um agente andando aleatório só para validar render e loop. Sem IA de verdade.
2. **Necessidades + utility básico.** Um agente, sem vila. 2-3 necessidades e 2-3 ações (comer de um recurso do tile, dormir, vagar). Barras de necessidade e ação atual visíveis na UI de debug.
3. **Percepção + memória.** O agente passa a agir só sobre o que percebeu/lembra, não onisciência do mundo. Raio de visão visualizável em modo debug.
4. **Múltiplos agentes + vila mínima.** Estoque comunitário de 1-2 recursos, demanda simples, moradores entregam recurso ao estoque — demanda influencia o utility score de todos.
5. **Ciclo de vida.** Fome crítica mata, envelhecimento por tick, reprodução simples dentro da vila.
6. **Segunda vila + território.** Vizinhança entre vilas, relação básica (neutro/hostil), sem clã ainda.
7. **Clãs e diplomacia.** Agrupamento de vilas em clãs, tratados (aliança/comércio/defesa), efeito real dos tratados nas ações dos moradores.
8. **Comércio entre vilas.** Rotas de excedente → déficit, habilitando o caso "vila guerreira depende de vila agrícola".
9. **Combate simulado por agente.** Guerreiros, engajar/fugir via utility, resolução no grid, efeito no estoque/população da vila.
10. **Escala e LOD.** Otimizações para centenas/milhares: indexação espacial, throttling de decisão, simulação agregada para o que está fora de foco.
11. **UI de observação.** Painel de inspeção de agente/vila/clã, indicadores de estado social/econômico, as poucas ferramentas de intervenção mínima definidas para o jogador.
12. **Decoração do mapa.** Adicionada durante a sessão que implementou 1-10, fora da ordem original — árvores, plantas e casas como sprites decorativos parados (mesmo tratamento visual dos personagens, sem lógica nem movimento), pra deixar o mapa mais vivo. Árvore e planta ganharam arte real numa sessão posterior (`render/decorationRenderer.js`, variante de espécie por hash determinístico da posição — ver ARCHITECTURE.md); casa continua no placeholder geométrico, a leva de arte não trouxe sprite de casa. Animais ficam de fora desta fatia por decisão do usuário — entram numa leva futura, quando a arte estiver pronta, e mesmo aí como um caso à parte: comportamento ambiente simples (tipo `wander.js`, mas sem fome/vila/decisão), não um NPC de verdade.

## 6. Especialização de vila (resolvido)

O pilar 4 do design ("vila guerreira que não produz comida... depende de vila agrícola") pressupunha vilas especializadas — implementado após a fatia 11: cada vila nasce com `specialization` = `'food'` ou `'wood'` (sorteio sempre complementar entre as duas), e só colhe o recurso da própria especialização (`agent/actions/gather.js` pontua 0 se a vila não for `'food'`; `agent/actions/gatherWood.js`, novo, pontua 0 se não for `'wood'`). `village/trade.js` já era genérico por tipo de recurso desde a fatia 8, então passou a mover madeira e comida nos dois sentidos sem nenhuma mudança — é o que viabiliza o caso original na prática (vila guerreira sem comida própria importando de uma vila agrícola aliada, e a agrícola importando madeira de volta).

**Fome individual ligada ao estoque (implementado):** `agent/actions/eat.js` não come mais de um tile de grama qualquer — o agente marcha até o centro da vila (mesmo padrão de `deliver`/`build`/`raid`) e consome `village.stock.food`; sem estoque, comer não é uma candidata viável (`score` retorna 0, mesmo padrão de "só entra na lista se dá pra fazer" de `gather.js`), e o agente passa fome de verdade. Isso completa o pilar 4 no nível individual, não só institucional: uma vila guerreira sem comércio ativo agora pode efetivamente perder gente de fome, não só travar reprodução.

**Salvaguarda deliberada:** toda vila (inclusive guerreira, que nunca produz comida própria) nasce com `STARTING_FOOD_STOCK` (`utils/constants.js`, 40 de 100 de capacidade) em vez de zero — sem isso, os fundadores de qualquer vila guerreira morreriam de fome nos primeiros ~70s de qualquer partida nova, antes de qualquer tratado de comércio ter tido chance real de se formar (comércio depende de uma vila alheia já ter excedente, e todas começam com o mesmo estoque zerado de recursos coletados). Decisão minha, não pedida literalmente, mas necessária — mesmo padrão de outras salvaguardas de bootstrap já feitas nesta sessão (ver histórico de `AGENT_COUNT`, `REPRO_*` no `STATUS.md`).

**Achado real numa sessão de observação mais longa e corrigido:** deixando rodar bem mais tempo, uma vila guerreira foi à **extinção total por fome** (população zerada) — não por causa do mecanismo de fome em si, mas por um buraco pré-existente na diplomacia dinâmica (§7): `clan/clanDecision.js` pulava a etapa de propor comércio quando a postura era `tense`, não só quando já era `allied`/`war`. Essa vila nasceu `tense` justo com o único outro clã que produzia o recurso que ela não produz (e `allied` com dois clãs que também não produziam, sorteio independente de especialização e postura), ficando sem nenhum caminho institucional de alívio — `canTrade` (`clan/diplomacy.js`) nunca exigiu postura branda pra permitir comércio, só a decisão de *propor* um tratado é que recusava sem necessidade real. Corrigido: proposta de comércio agora roda também sob `tense`, não só `neutral`. Re-testado numa sessão nova de ~20 minutos simulados: população estável, sem outro caso de extinção. Efeito colateral positivo: fecha uma lacuna que já existia antes da fome individual depender do estoque (a vila só não sentia na pele porque comia direto do ambiente).

**Segundo achado, mais grave, numa sessão de teste seguinte — extinção quase instantânea das 4 vilas ao mesmo tempo (corrigido):** jogando de verdade (não em simulação em lote), o usuário reportou as 4 vilas de um mundo novo se extinguindo em menos de 5 minutos reais — bem antes de qualquer janela de diplomacia/comércio entrar em jogo. Causa raiz, sem relação com o achado acima: todo `AGENT_COUNT` fundador de uma vila nasce com `needs.hunger = 100` fixo (`agent/needs.js:createNeeds`), com só ~0-0.5s de diferença entre eles (`decisionTimer`). Fome decai igual pra todos, então todos cruzam o limiar em que "comer" vira a ação mais pontuada (`urgency(hunger) > BASE_SCORE do wander + margem de interrupção`, por volta de `hunger≈55`) praticamente no mesmo instante — todos convergem pro centro da vila e comem ao mesmo tempo, drenando os `STARTING_FOOD_STOCK` (então 40) em poucos segundos simulados (8 agentes × `EAT_FOOD_PER_SEC=1` >> um estoque pequeno). Depois disso `eat.js:score` retorna 0 (sem estoque, sem candidata viável) pro resto da vila, e ninguém mais come — nem produção (limitada a quem já está colhendo) nem comércio (`TRADE_RATE_PER_SEC=4`/s) conseguem repor rápido o bastante contra 8 bocas famintas de uma vez. Toda a população de cada vila morre de fome em ~70-80s de tempo simulado do nascimento — igual nas 4, porque a sincronia inicial é a mesma em todas, não depende de especialização nem de sorte diplomática (por isso as 4 caíram juntas, ao contrário do achado anterior). **Corrigido** dessincronizando a fome inicial: cada fundador agora nasce com `hunger` sorteado entre `FOUNDER_HUNGER_MIN=50` e `FOUNDER_HUNGER_MAX=100` (`utils/constants.js`, aplicado em `main.js:spawnVillage`) em vez de sempre 100, espalhando o momento em que cada um decide ir comer; `STARTING_FOOD_STOCK` subiu de 40 para 60 como margem extra. Testado ao vivo (~2min reais): população de uma vila permaneceu estável em 8/8 durante todo o teste, sem repetir o colapso.

## 7. Diplomacia dinâmica entre clãs (implementado)

Até a fatia 11, postura de clã e tratados eram decididos uma única vez no world-gen e nunca revisitados — comércio reagia à demanda tick a tick (fatia 8), mas quem era aliado, neutro ou inimigo de quem estava congelado desde a criação do mundo. Pedido explícito do usuário: uma camada de decisão institucional, paralela à IA de utilidade do agente (seção 4), que faz clãs reagirem de verdade à própria situação econômica ao longo do tempo.

Pré-requisito: o mundo passou a suportar **N vilas/clãs** (`VILLAGE_COUNT`, `utils/constants.js`, hoje 4) em vez de exatamente 2 — sem isso, "achar um parceiro comercial melhor" não tem pra quem trocar. Especialização (seção 6) passou a ser balanceada entre todas as vilas (metade comida, metade madeira, embaralhado), não mais só "sempre uma de cada" entre duas.

**`village.distress`** (`{ food, wood }`, segundos): quanto tempo consecutivo a demanda por um recurso está em nível de déficit (`TRADE_DEFICIT_DEMAND_MIN`), recalculado por tick (`village/stock.js:updateDistress`) — reseta pra zero assim que a demanda cai abaixo do limiar. É o sinal de "desespero" que a IA institucional consulta.

**`clan/clanDecision.js`** — cada clã reavalia sua relação com cada outro clã do mundo num intervalo bem mais longo que o do agente (20-30s simulados, com jitter — decisão institucional, não individual). Pra cada par, nessa ordem:
1. **Escalar pra guerra**: distress sustentado além de `DISTRESS_WAR_THRESHOLD_SECONDS` por um recurso que essa vila não produz, e o outro clã tem sobra dele — muda a postura pra `war`.
2. **Buscar paz**: já em guerra, mas o desespero que a motivou já passou — volta a `neutral`.
3. **Propor comércio**: ainda não comercia com esse clã, precisa de um recurso que ele tem de sobra — propõe e assina um tratado `trade`.
4. **Trocar de parceiro comercial**: já exporta um recurso de sobra pra esse clã via tratado, mas existe um 3º clã bem mais desesperado por ele — rompe o tratado atual (`clan/diplomacy.js:breakTreaty`, status `'broken'`, mantém o histórico) e assina com quem precisa mais. Modela "achou um acordo melhor" comparando desespero alheio, sem precisar inventar um sistema de pagamento.

**Colapso interno** (`village.inChaos`, `village/stock.js:updateChaos`): nenhum recurso relevado por tempo bem mais longo ainda (`DISTRESS_CHAOS_THRESHOLD_SECONDS`) apesar de guerra/comércio já terem tido chance de agir. Efeito mecânico real (pedido explícito do usuário, não flavor text): reprodução da vila trava completamente (`lifecycle.js:updateVillageReproduction`) e as necessidades de fome/sono de todo morador decaem mais rápido (`CHAOS_NEEDS_DECAY_MULTIPLIER`, `main.js`).

**Limite conhecido:** os limiares de tempo (guerra/colapso) foram calibrados testando a simulação inteira por várias horas simuladas — valores baixos demais criavam uma espiral de extinção real (reprodução travada cedo demais, população inteira morrendo de velhice antes do comércio se estabelecer; ver `STATUS.md`). Com os valores atuais, postura de guerra/paz ainda alterna com uma frequência que pode parecer volátil numa sessão de observação longa — não chegou a ser uma prioridade nesta rodada corrigir isso com mais precisão, já que depende de sensação de jogo tanto quanto de número.

**Ataque ofensivo/saque (implementado):** guerra declarada por desespero agora tem efeito prático — `clan/clanDecision.js` seta `village.raidTargetVillageId` ao escalar pra guerra (limpa ao voltar pra paz); `agent/actions/raid.js` marcha agentes elegíveis até o centro da vila inimiga e saqueia o recurso com mais estoque de lá, reaproveitando `deliver.js` pro transporte de volta. Combate em rota continua emergindo sozinho do par `fight.js`/`flee.js` já existente — `raid.js` não tem lógica de combate própria. Simplificação: `raidTargetVillageId` é singular (um alvo por vez), mesmo se a vila estiver em guerra com mais de um clã simultaneamente — mesmo espírito de "1 vila por clã" já assumido em `clanDecision.js`.

**Vila extinta não decide nem participa da diplomacia (implementado):** vila com população zerada (extinta em combate/colapso/fome, mas que continua existindo como entidade com estoque — nunca é removida, `lifecycle.js`) não declara nem sofre guerra, não propõe nem recebe comércio, e não vira parceira melhor de troca (`clan/clanDecision.js`); também não comercia via `village/trade.js`. O único jeito de interagir com ela continua sendo o saque (`agent/actions/raid.js` não checa população de propósito — uma vila extinta ainda pode ter estoque valendo a pena saquear). No mapa, o label da vila mostra `💀 extinta` (`render/villageRenderer.js`) pra não confundir com uma vila só em colapso econômico ainda com gente viva.

## 8. Evolução da civilização (minério, construção e papéis visuais implementados)

Pedido do usuário: uma progressão real, no espírito do WorldBox, mas **autônoma** — sem poderes de jogador (mantém o pilar 5, intervenção mínima). A vila evolui sozinha conforme acumula recursos e constrói coisas, a mesma lógica de utility AI de sempre, não um clique do jogador.

- **Minério universal** (implementado): `stone`, `coal`, `iron`, `gold` — tiles de montanha ganham um desses na geração (`world/terrain.js`, pesos em `utils/constants.js:MOUNTAIN_RESOURCE_WEIGHTS`). Ao contrário de food/wood, minério é **universal**: qualquer vila minera qualquer um dos quatro, sem gate de especialização — é material de construção, não parte do pilar de interdependência econômica (pilar 4). Por isso minério fica de fora de `CRITICAL_RESOURCES`: nunca alimenta desespero/guerra/colapso da diplomacia dinâmica (§7) — só demanda comum (puxa o score de `agent/actions/mine.js`, com peso próprio `MINE_SCORE_WEIGHT` menor que o de food/wood) e comércio genérico (`village/trade.js`, já genérico por recurso desde a fatia 8).
- **Construção de verdade** (implementado): `village.buildings` — do modelo conceitual original, agora populado. `agent/actions/build.js` consome madeira+pedra do estoque comunitário e, ao completar, aumenta o teto de população da vila (`village/village.js:getPopulationCap` — base + bônus por casa; `lifecycle.js` usa isso no gate de reprodução). Ritmo observado: pedra acumula devagar (minério depende de descoberta por acaso), então construção ainda é rara numa sessão curta — ver `STATUS.md`.
- **Papéis visuais** (implementado): sprites por ação corrente (`render/agentRenderer.js`), não por clã/facção — qualquer vila tem os dois papéis. Decisões do usuário, perguntadas antes de implementar (nem toda ação tinha pose 1:1 óbvia na arte disponível):
  - **Substitui de vez** as 4 variantes antigas de pele/gênero (`WMan`/`WGirl`/`BMan`/`BGirl`) — não coexistem. Fora de combate, todo agente é visualmente "Camponês"; a diversidade de pele/gênero foi abandonada em troca de refletir a ação corrente.
  - Ações com pose dedicada: `gatherWood` → cortando árvore, `mine` → minerando, `build` → construindo (só quando o agente já chegou e está trabalhando de fato, não durante o trajeto até lá), `deliver` com `carryingType === 'wood'` → levando tronco (cobre a viagem inteira de volta, não só a entrega).
  - Ações sem pose específica na arte disponível (`eat`, `sleep`, `gather` de comida, `wander`, `flee`) caem no ciclo padrão parado/andando — sem aproximar com poses que não batem literalmente com a ação (ex.: não usar "pescando" pra "comer").
  - Durante `fight`, o agente vira visualmente um guerreiro — `agent.warriorType` (`'orc'` | `'elfo'` | `'cavaleiro'`, `utils/constants.js:WARRIOR_TYPES`) sorteado uma vez no nascimento (fundador ou filho, sem herança dos pais), fixo pra vida toda; volta a "Camponês" assim que o combate termina. É puramente cosmético — não influencia dano, decisão de lutar/fugir nem nenhuma outra mecânica.

**Achado importante durante o teste (não é sobre minério/construção em si):** testando essas duas fatias com simulação longa, a população inteira (todas as 4 vilas) foi à extinção por pura velhice em múltiplos seeds — reprodução não conseguia repor os fundadores dentro da janela de vida deles, mesmo com a economia de food/wood saudável (zero mortes por fome ou combate nos logs). Isso já era um risco pré-existente (documentado em §7), mas ficou mais evidente/fácil de reproduzir com 4 vilas competindo por atenção. Corrigido via várias mudanças de balanceamento (ver `STATUS.md` pro detalhe completo da investigação) — a mudança decisiva foi aumentar a população fundadora por vila (`AGENT_COUNT` 5→8), que deu resiliência direta sem precisar mexer na lógica de decisão em si.

---

Status: fatias 1-11 implementadas, mais especialização de vila, diplomacia dinâmica (com ataque ofensivo/saque, §7) e evolução da civilização (minério + construção + papéis visuais, §8) além do roteiro original — mais decoração do mapa com arte real (§5 item 12) e fome individual ligada ao estoque da vila (§6) numa sessão posterior. Ver `STATUS.md` na raiz do projeto para o estado detalhado por sistema e os próximos passos concretos da sessão mais recente.
