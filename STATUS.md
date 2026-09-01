# STATUS.md — Worldbox Sandbox

Snapshot de encerramento de sessão. Fatias 1-11 do roteiro (`DESIGN.md` §5) completas, mais evolução além do roteiro original: especialização de vila, diplomacia dinâmica entre clãs, evolução da civilização (minério + construção + papéis visuais + ataque ofensivo/saque), decoração do mapa com arte real, e fome individual ligada ao estoque da vila. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Tudo desta sessão está commitado e pushado (`235d98b`..`79d7364`, 6 commits).

## 1. O que foi implementado ou alterado nesta sessão

Nesta ordem:

1. **Papéis visuais por ação**: integrada a leva de arte nova (`assets/Assets-testes-para-o-claude-testar/`), que já existia no repo mas nunca tinha sido usada no código. Substituiu de vez as 4 variantes antigas de pele/gênero (`WMan`/`WGirl`/`BMan`/`BGirl`) — fora de combate todo agente é visualmente "Camponês", com pose dedicada quando a ação atual tem uma óbvia (cortando árvore, minerando, construindo, levando tronco); ações sem pose específica (`eat`, `sleep`, `gather` de comida, `wander`, `flee`) caem no ciclo padrão parado/andando. Durante `fight`, o agente vira visualmente um guerreiro sorteado no nascimento (`agent.warriorType`: orc/elfo/cavaleiro, fixo pra vida toda, puramente cosmético).
2. **Ataque ofensivo/saque** (`agent/actions/raid.js`, novo): dá efeito prático à guerra dinâmica. `clan/clanDecision.js` seta `village.raidTargetVillageId` quando a guerra escala (limpa quando volta pra paz); agentes elegíveis marcham até o centro da vila inimiga e saqueiam o recurso com mais estoque de lá, reaproveitando `deliver.js` pro transporte de volta. Sem lógica de combate própria — `fight.js`/`flee.js` continuam cobrindo isso com prioridade maior.
3. **Decoração do mapa com arte real**: árvore usa uma de 3 espécies (`ArvoreComum`/`Pinheiro`/`Palmeira`) e planta uma de 2 (`Arbusto`/`ArbustoComida`), variante escolhida por hash determinístico da posição (`world/decorations.js` não muda). Casa continua no placeholder geométrico — a leva de arte não trouxe sprite de casa.
4. **Fome individual ligada ao estoque da vila**: `agent/actions/eat.js` reescrito — o agente marcha até o centro da vila (mesmo padrão de `deliver`/`build`/`raid`) e come de `village.stock.food`, em vez de comer direto de qualquer tile de grama por perto. Sem estoque, comer não é candidata viável, e o agente passa fome de verdade — cumpre o pilar 4 do design também no nível individual (vila guerreira sem comércio pode perder gente de fome, não só travar reprodução). Toda vila (inclusive guerreira) nasce com `STARTING_FOOD_STOCK=40` em vez de zero, pra não matar os fundadores de fome antes de qualquer comércio se estabelecer.
5. **Achado real testando fome×estoque, e correção**: numa sessão de observação mais longa, uma vila guerreira foi à **extinção total por fome** (população 0/30). Causa raiz: `clan/clanDecision.js` pulava a proposta de comércio sempre que a postura já era `tense`, não só `allied` — mas `canTrade` (`clan/diplomacy.js`) nunca exigiu postura branda pra comerciar, só um tratado assinado. Essa vila tinha nascido `tense` justo com o único outro clã que produzia o recurso que ela não produz, e `allied` com dois clãs que também não produziam (coincidência do sorteio independente de especialização × postura inicial) — sem nenhum caminho institucional de alívio. Corrigido: proposta de comércio agora roda também sob `tense`. Re-testado num mundo novo por 20 minutos simulados sem repetir a extinção.
6. **Vila extinta não participa mais da diplomacia/comércio**: `clan/clanDecision.js` — vila com população zerada não decide nada (não declara/sofre guerra, não propõe/recebe comércio) e não é considerada "parceiro melhor" por outro clã; `village/trade.js` também parou de mover recurso pra dentro dela mesmo com tratado já assinado. Saque (`raid.js`) continua funcionando normalmente contra ela, de propósito — é a única interação que ainda faz sentido com o estoque abandonado. Detalhe visual: label da vila no mapa mostra `💀 extinta` (`render/villageRenderer.js`).
7. **Detalhe de documentação**: corrigida uma nota desatualizada no `ARCHITECTURE.md` que citava um `WAR_VILLAGE_MIN/MAX_DIST` que não existe mais no código.
8. **`CLAUDE.md`**: adicionada a regra "antes de responder, verifique se alguma skill disponível se aplica à tarefa" (pedido explícito do usuário, nesta sessão).

Contexto de antes desta sessão (não repetido em detalhe aqui, ver histórico de commits): sprite de agente consertado, decoração em placeholder geométrico, UI de observação (`#inspector`), especialização de vila, diplomacia dinâmica entre clãs, minério e construção, e uma investigação extensa que corrigiu uma espiral de extinção populacional por reprodução travada.

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain | ✅ Funcionando. 5 tipos de tile + recurso de minério em montanha. |
| Time loop | ✅ Funcionando. |
| Camera/Render | ✅ Funcionando. Zoom mínimo "contain" (mapa inteiro cabe na tela). |
| Perception | ✅ Funcionando (tiles + recurso de montanha + agentes, via índice espacial). |
| Memory | ✅ Funcionando. |
| Needs | ⚠️ Parcial. Só fome e sono das 5 necessidades originais do pitch. Fome vem do estoque da vila (`village.stock.food`), não mais do ambiente direto (ver §1 item 4). |
| Utility AI / Decision | ✅ Funcionando. 11 ações: `wander`, `eat`, `sleep`, `gather`, `gatherWood`, `mine`, `build`, `deliver`, `fight`, `flee`, `raid`. |
| Pathfinding | ✅ Funcionando (A*). Montanha não é andável — ações que envolvem depósito de montanha miram o tile andável adjacente. |
| Village (estoque/demanda/população) | ✅ Funcionando. 6 recursos (food/wood/stone/coal/iron/gold). Teto de população dinâmico via `getPopulationCap` (base + bônus por casa construída). |
| Clan/Diplomacy | ✅ Funcionando e dinâmico: guerra/paz/comércio/troca de parceiro reavaliados periodicamente por clã. Vila extinta não decide nem é alvo (ver §1 item 6). Comércio agora elegível também sob postura `tense` (ver §1 item 5). |
| Trade/Economy | ✅ Observável — especialização faz a demanda divergir de verdade; diplomacia dinâmica propõe/rompe tratados sozinha. Não comercia com vila extinta. |
| Combat | ✅ Engajar/fugir/dano/morte reativos + ataque ofensivo deliberado (`raid.js`) — guerra declarada por desespero tem efeito prático de saque. |
| Life-cycle | ✅ Funcionando. |
| Simulation LOD | ✅ Funcionando, escala com zoom. |
| UI/HUD | ✅ HUD básico + inspetor completo (scores, vila, clã, seleção direta de vila). |
| Sprites de agente | ✅ Pose por ação corrente (arte de `assets/Assets-testes-para-o-claude-testar/`), com animação de andar. |
| Decoração do mapa | ✅ Árvore e planta com arte real (3 espécies de árvore, 2 de planta). Casa no placeholder geométrico — sem sprite de casa na leva de arte. |
| Especialização de vila | ✅ Funcionando (comida/madeira, sempre complementar). |
| Minério (evolução) | ✅ Funcionando, mas mineração é lenta — depende de descoberta por acaso de depósito na percepção do agente. |
| Construção (evolução) | ✅ Funcionando (mecânica testada isoladamente), mas nunca observada completando numa simulação de ~1h — pedra acumula devagar demais. |
| Papéis visuais por ação | ✅ Funcionando. Camponês por ação; guerreiro (orc/elfo/cavaleiro) durante `fight`. |
| Ataque ofensivo/saque | ✅ Funcionando. Testado ao vivo com evidência indireta forte (distress resetando sem comércio ativo); falta confirmação direta por seleção de agente. |
| Fome ligada ao estoque | ✅ Funcionando. Achado real de extinção por fome (postura `tense` sem comércio) já corrigido e re-testado por 20 min simulados sem repetir. |
| Animais no mapa | ❌ Não iniciado — decisão já tomada (decorativo simples primeiro, sem IA, só quando tiver arte). |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **Postura de guerra/paz pode alternar com frequência que parece volátil** numa sessão de observação longa (diplomacia dinâmica reage a cada 20-30s por clã) — funciona corretamente, não crasha, mas pode precisar de mais amortecimento (histerese) se parecer caótico demais jogando de verdade.
2. **Mineração e construção são lentas** — minério depende de descoberta por acaso de um tile de montanha do tipo certo; em ~1h simulada de teste, nenhuma casa chegou a ser construída em nenhuma vila.
3. **A correção da espiral de extinção populacional por reprodução** (sessão anterior) nunca foi confirmada numa sessão de jogo real ao vivo por tempo longo, só em simulação em lote.
4. **Fome ligada ao estoque (mudança desta sessão) só foi confirmada por ~20-30 min simulados no total**, span curto pra um sistema tão central — o sorteio de posturas iniciais ainda pode gerar outras combinações ruins não cobertas pelos testes feitos (ver §5 item 1).
5. **Ataque ofensivo/saque nunca foi confirmado por leitura direta de um agente** (`agent.currentAction === 'raid'`) — só por evidência indireta (distress resetando sem comércio ativo). A automação de clique não conseguiu selecionar um agente específico em movimento em múltiplas tentativas nesta sessão (limitação de tooling, não do jogo).
6. **Indicador visual `💀 extinta`** (label da vila no mapa) foi implementado e conferido por leitura de código, mas nunca visto aparecer ao vivo — nenhuma vila morreu durante uma janela de teste que eu estivesse observando o label.
7. **Testes automatizados de sessão longa esbarram em throttling de `requestAnimationFrame` em aba de segundo plano do Chrome** — depois de ~100s reais sem interação, a simulação quase congela (distress avançando ~1s por 60s reais em vez de acompanhar o tempo real). Limitação de tooling confirmada nesta sessão, não um bug do jogo. Sessões de observação mais longas precisam ser jogadas pelo usuário numa aba em primeiro plano, não pela automação.
8. **Crescimento populacional inicial rápido** (32→69 agentes em ~200s simulados, `AGENT_COUNT=8`, achado em sessão anterior) — não confirmado se estabiliza numa sessão muito mais longa.

## 4. Decisões técnicas e o motivo

Decisões desta sessão, incluindo onde o usuário escolheu entre opções propostas:

- **Papéis visuais substituem de vez as 4 variantes de pele/gênero, não coexistem** — usuário escolheu, quando perguntado (a outra opção era manter Parado/Andando com a variante antiga e só trocar durante ações específicas).
- **Guerreiro (orc/elfo/cavaleiro) sorteado no nascimento, fixo pra vida toda, só aparece durante `fight`** — usuário escolheu essa opção em vez de manter o Camponês atacando.
- **Ações sem pose específica caem no ciclo parado/andando padrão, sem aproximar com pose que não bate literalmente** — usuário escolheu, evitando por exemplo usar a pose de "pescando" pra "comer".
- **Fome ligada ao estoque: "comer vira ir até a vila", não a versão híbrida mais seguindo** — usuário escolheu a opção mais fiel ao pilar 4 do design quando perguntado, mesmo sabendo do risco de reabrir uma espiral de extinção (documentada em sessão anterior).
- **`STARTING_FOOD_STOCK=40`** — decisão minha, não pedida literalmente, mas necessária: sem estoque inicial, os fundadores de qualquer vila guerreira morreriam de fome nos primeiros ~70s de qualquer partida nova, antes de qualquer comércio ter chance real de se formar.
- **Correção da postura `tense` bloqueando proposta de comércio** — decisão minha, baseada num achado ao vivo (extinção real observada numa sessão de teste), não pedida especificamente mas a causa raiz de um problema real.
- **Escolhi implementar "vila extinta não participa da diplomacia" entre os itens pendentes da lista** — usuário pediu pra escolher e seguir; escolhi por ser bem delimitado e no mesmo espírito da correção anterior. Empacotei três detalhes pequenos relacionados na mesma leva (comércio parando pra vila extinta, indicador visual, correção de nota desatualizada).
- **Regra nova no `CLAUDE.md`**: "antes de responder, verifique se alguma skill disponível se aplica à tarefa" — pedido explícito do usuário.

## 5. Próximos passos concretos, em ordem

1. **Jogar uma sessão real (não automatizada) de 15-30+ minutos e reportar o que acontecer** — é o item mais importante em aberto. Peça específico ao usuário (ele topou fazer isso): observar (a) se alguma vila morre de fome de verdade, especialmente guerreiras/em guerra; (b) se dá pra ver agentes saqueando uma vila inimiga durante uma guerra; (c) se a população geral se mantém saudável nas 4 vilas; (d) se alguma casa chega a ser construída; (e) qualquer coisa visualmente estranha. Comando pra rodar: `cd /home/trinck/projetos/worldbox-sandbox && python -m http.server 8000`, abrir `http://localhost:8000` numa aba normal.
2. **Com base no relato do item 1**: se aparecer outra extinção por fome, investigar se é o mesmo padrão (postura `tense`/`allied` sem produtor do recurso) ou algo novo — o histórico de investigação da espiral de extinção anterior é um bom ponto de partida.
3. **Calibrar `EAT_FOOD_PER_SEC`/`EAT_RESTORE_PER_FOOD`/`STARTING_FOOD_STOCK`** se o relato mostrar desbalanceado (`utils/constants.js` já documenta que são valores iniciais por raciocínio, não testados longamente).
4. **Ajustar ritmo de mineração/construção** se o relato mostrar lento demais — considerar aumentar `PERCEPTION_RADIUS`, vilas nascerem mais perto de montanha, ou reduzir `HOUSE_STONE_COST`/`HOUSE_WOOD_COST`.
5. **Recalibrar a frequência/amortecimento de troca guerra↔paz** se o relato mostrar isso como um problema de sensação de jogo (ver §3 item 1).
6. **Casa não tem sprite na leva de arte atual** — se o amigo do usuário adicionar um, só trocar `drawHouse` em `render/decorationRenderer.js` (mesmo padrão de árvore/planta).
7. **Confirmar visualmente as poses específicas dos papéis visuais e o indicador `💀 extinta`** numa sessão real, já que a automação de clique não consegue selecionar agentes em movimento de forma confiável (ver §3 itens 5/6).

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Animais no mapa**: decoração parada por enquanto (mesmo tratamento de árvore/planta/casa); "vagando sem IA de utilidade" fica pra uma leva futura, só quando a arte estiver pronta. Não implementar comportamento de bicho ainda.
- **Visuais em geral são provisórios** — o amigo do usuário vai substituindo a arte aos poucos, direto no disco (não via git). Registrado em `memory/art_pipeline.md` (memória do projeto, fora do repositório).
- **A leva de arte nova** (`assets/Assets-testes-para-o-claude-testar/`) já está integrada pro lado de agente (papéis visuais) e pro lado de decoração de mapa (árvore/planta) — falta só casa, que não tem sprite nessa leva (ver §5 item 6).
- **Usuário confirmou nesta sessão, via `/plugin`/`/reload-plugins`**: 0 plugins instalados nesta sessão (17 skills, 6 agentes, 0 hooks, 0 MCP servers de plugin). Não muda nada no projeto, só contexto de ambiente.
