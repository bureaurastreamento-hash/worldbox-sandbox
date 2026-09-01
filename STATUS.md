# STATUS.md — Worldbox Sandbox

Snapshot de encerramento de sessão. Fatias 1-11 do roteiro (`DESIGN.md` §5) completas, mais três sistemas além do roteiro original: especialização de vila, diplomacia dinâmica entre clãs, e evolução da civilização (minério + construção). Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Tudo desta sessão está commitado e pushado.

## 1. O que foi implementado ou alterado nesta sessão

Nesta ordem:

1. **Sprite quebrado consertado**: `Human1.png`/`Human2.png` (deletados na sessão anterior) substituídos por 4 variantes reais (`skinTone` × `gender`: `WMan`/`WGirl`/`BMan`/`BGirl`), sorteadas nos fundadores e herdadas nos filhos.
2. **Decoração do mapa**: árvores/plantas/casas como placeholder geométrico (`world/decorations.js` + `render/decorationRenderer.js`), determinístico pela seed. Sem arte real ainda.
3. **Fatia 11 — UI de observação**: painel `#inspector` (topo direito) — scores de decisão do agente, estoque/demanda/população/especialização da vila, postura/tratados do clã. Seleção direta de vila (clique no território, sem precisar de um agente) também foi adicionada na sequência.
4. **Especialização de vila**: cada vila nasce especializada em `food` ou `wood` (sempre complementar entre todas), só colhe o recurso da própria especialização — resolve o pilar 4 do design (vila guerreira depende de vila agrícola).
5. **Diplomacia dinâmica entre clãs** (`clan/clanDecision.js`, novo): mundo expandido pra N vilas/clãs (`VILLAGE_COUNT=4`, era sempre 2); clãs reavaliam guerra/paz/comércio/troca de parceiro comercial periodicamente, reagindo a `village.distress` (desespero econômico sustentado) em vez de postura fixada só no world-gen. Colapso interno (`village.inChaos`) trava reprodução e acelera decaimento de needs.
6. **Bugs corrigidos, reportados jogando**: LOD usava raio fixo em px de mundo (não escalava com zoom) — causava NPCs "congelados" que se aglomeravam ao dar zoom; câmera usava fórmula errada de zoom mínimo — mapa nunca cabia inteiro na tela; `core/gameLoop.js` agora captura qualquer exceção e não trava o jogo inteiro em silêncio.
7. **Evolução da civilização — minério**: `stone`/`coal`/`iron`/`gold` em tiles de montanha, universais (qualquer vila minera qualquer um, sem gate de especialização). Bug real corrigido: montanha não é andável, pathfinding não alcançava o depósito — corrigido mirando o tile andável mais próximo adjacente.
8. **Evolução da civilização — construção**: `agent/actions/build.js` consome madeira+pedra e aumenta o teto de população da vila (`village/village.js:getPopulationCap`) ao completar uma casa.
9. **Investigação extensa e correção de uma espiral de extinção populacional séria**: testando construção, a população inteira ia à extinção total de forma consistente (~500-600s simulados, múltiplos seeds). Causa principal identificada: o gate de reprodução (`REPRO_FOOD_DEMAND_MAX`) bloqueava com base no estoque *institucional* de comida da vila, não na fome *individual* do agente (que vem direto do ambiente, desacoplada do estoque) — uma vila madeireira tem demanda de comida perto de 100% quase sempre, mesmo com moradores bem alimentados. Corrigido via vários ajustes de constante; o decisivo foi dobrar a população fundadora por vila (`AGENT_COUNT` 5→8). Detalhe completo da investigação (hipóteses testadas e descartadas) no histórico do commit e na memória do projeto.
10. **Leva de arte nova adicionada** (`assets/Assets-testes-para-o-claude-testar/`, ~33 arquivos): recursos, decoração e sprites de unidade (Orc/Elfo/Cavaleiro/Componês) com poses de ação. Só os arquivos — sem integração no código ainda.

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain | ✅ Funcionando. 5 tipos de tile + recurso de minério em montanha. |
| Time loop | ✅ Funcionando. |
| Camera/Render | ✅ Funcionando. Zoom mínimo agora "contain" (mapa inteiro cabe na tela). |
| Perception | ✅ Funcionando (tiles + recurso de montanha + agentes, via índice espacial). |
| Memory | ✅ Funcionando. |
| Needs | ⚠️ Parcial. Só fome e sono das 5 necessidades originais do pitch. Fome é sempre do ambiente direto, nunca do estoque da vila (ver §6, item de fatia futura). |
| Utility AI / Decision | ✅ Funcionando. 10 ações: `wander`, `eat`, `sleep`, `gather`, `gatherWood`, `mine`, `build`, `deliver`, `fight`, `flee`. |
| Pathfinding | ✅ Funcionando (A*). Montanha não é andável — ações que envolvem depósito de montanha miram o tile andável adjacente. |
| Village (estoque/demanda/população) | ✅ Funcionando. 6 recursos (food/wood/stone/coal/iron/gold). Teto de população dinâmico via `getPopulationCap` (base + bônus por casa construída). |
| Clan/Diplomacy | ✅ Funcionando e **dinâmico**: guerra/paz/comércio/troca de parceiro reavaliados periodicamente por clã, reagindo à economia real. N vilas/clãs (hoje 4), não mais só 2. |
| Trade/Economy | ✅ Observável — especialização faz a demanda divergir de verdade; diplomacia dinâmica propõe/rompe tratados sozinha, não só no setup inicial. |
| Combat | ⚠️ Parcial. Engajar/fugir/dano/morte funcionam. Só reativo (sem ataque ofensivo deliberado) — guerra pode ser declarada dinamicamente por desespero, mas sem efeito de saque. |
| Life-cycle | ✅ Funcionando. Reprodução ajustada nesta sessão (ver §4) pra não zerar a população. |
| Simulation LOD | ✅ Funcionando, corrigido pra escalar com zoom (era raio fixo, bug real). |
| UI/HUD | ✅ HUD básico + inspetor completo (scores, vila, clã, seleção direta de vila). |
| Sprites de agente | ✅ 4 variantes (pele clara/escura × homem/mulher), com animação de andar. |
| Decoração do mapa | ⚠️ Placeholder geométrico funcionando. Arte real existe agora (`assets/Assets-testes-para-o-claude-testar/`) mas não está integrada. |
| Especialização de vila | ✅ Funcionando (comida/madeira, sempre complementar). |
| Minério (evolução) | ✅ Funcionando, mas mineração é lenta — depende de descoberta por acaso de depósito na percepção do agente. |
| Construção (evolução) | ✅ Funcionando (mecânica testada isoladamente), mas **nunca observada completando** numa simulação de ~1h — pedra acumula devagar demais. |
| Papéis visuais por ação | ❌ Não iniciado. Arte já existe (item 10 acima), falta decisão de mapeamento + integração no código. |
| Ataque ofensivo/saque | ❌ Não iniciado. `village.raidTargetVillageId` já reservado em `village.js`. |
| Animais no mapa | ❌ Não iniciado — decisão já tomada (decorativo simples primeiro, sem IA, só quando tiver arte). |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **Combate é só reativo** — vilas em guerra só brigam se territórios se cruzarem organicamente. Guerra declarada dinamicamente por desespero econômico não tem efeito prático de saque/invasão ainda.
2. **Postura de guerra/paz pode alternar com frequência que parece volátil** numa sessão de observação longa (diplomacia dinâmica reage a cada 20-30s por clã) — funciona corretamente, não crasha, mas pode precisar de mais amortecimento (histerese) se parecer caótico demais jogando de verdade.
3. **Vilas com população zerada continuam participando da diplomacia** como se tivessem gente (propõem/recebem tratados, podem entrar em guerra) — não crasha, mas é uma inconsistência observável.
4. **Mineração e construção são lentas** — minério depende de descoberta por acaso de um tile de montanha do tipo certo; em ~1h simulada de teste, nenhuma casa chegou a ser construída em nenhuma vila (pedra nunca acumulou o suficiente por tempo suficiente). Funciona, mas pode ser insatisfatório numa sessão de jogo real.
5. **A correção da espiral de extinção populacional (item 9 de §1) foi validada só via simulação direta em lote** (bypassa o throttling de `requestAnimationFrame`), nunca numa sessão de jogo real ao vivo por tempo longo. Se o usuário observar extinção jogando de verdade, é esperado que aconteça bem menos que antes, mas o risco não está formalmente descartado.
6. **Crescimento populacional inicial foi rápido nos testes** (32→69 agentes em ~200s simulados, com `AGENT_COUNT=8`) — não confirmado se isso eventualmente estabiliza de forma saudável numa sessão muito mais longa que a testada (~1h), ou se pode estourar o teto de população de forma estranha.
7. Animação de andar e LOD nunca foram confirmados visualmente numa sessão de jogo real longa (só simulação direta + checagens visuais pontuais em aba de primeiro plano) — a aba automatizada de teste sofre throttling de `requestAnimationFrame` em segundo plano, o que limita testes de tempo real longos.

## 4. Decisões técnicas e o motivo

Decisões desta sessão, incluindo onde o usuário escolheu entre opções propostas:

- **Especialização de vila sempre complementar, não sorteio 50/50 puro**: um sorteio realmente independente arriscava todas as vilas caírem na mesma especialização por acaso, apagando a interdependência que é o objetivo do pilar 4. Decisão minha, não pedida literalmente, mas necessária.
- **Diplomacia dinâmica — usuário escolheu, quando perguntado**: expandir o mundo pra N vilas/clãs agora (não manter 2); construir ataque ofensivo/saque na mesma leva (acabou ficando pra próxima sessão por tempo); "reprodução trava + needs decaem mais rápido" como definição mecânica de colapso interno.
- **Minério fica fora de `CRITICAL_RESOURCES`** (não alimenta desespero/guerra/colapso) — decisão minha: minério é material de construção universal, misturar com o pilar de sobrevivência (food/wood) arriscava reabrir a instabilidade populacional que precisou de correção extensa.
- **Evolução da civilização — usuário escolheu, quando perguntado**: autônoma/emergente (não player-triggered — mantém o pilar de jogador-observador); papéis visuais (Orc/Elfo/Cavaleiro/Componês) são por AÇÃO corrente dentro de qualquer vila, não por facção/clã; todos os 4 minérios de uma vez (não faseado); continuar emendando fatias na mesma sessão sem parar pra revisão a cada uma.
- **Teto de população agora dinâmico** (`getPopulationCap` = base + bônus por casa) em vez de constante fixa — efeito mecânico real da construção, não decoração.
- **LOD trocado de raio fixo pra checagem de viewport real** — um raio fixo em px de mundo não escala com zoom, causando o bug de NPCs congelados relatado jogando.
- **Câmera trocada de "cover" pra "contain"** no zoom mínimo — "cover" nunca deixa ver o mapa quadrado inteiro numa janela não-quadrada (quase sempre o caso).
- **`core/gameLoop.js` ganhou `try/catch` permanente** ao redor de update/render — sem isso, qualquer exceção não tratada trava o jogo inteiro pra sempre e em silêncio.
- **Ajustes de balanceamento da extinção populacional** (ver §1 item 9): `REPRO_FOOD_DEMAND_MAX` 0.7→0.9 (o gate testava estoque institucional, não fome real), `MAX_AGE` 200→300, `REPRO_COOLDOWN_MIN/MAX` 20-40→12-25, `AGENT_COUNT` 5→8 (decisivo), `MINE_SCORE_WEIGHT` dedicado menor que `GATHER_SCORE_WEIGHT`, `INITIAL_STANCE_WEIGHTS.war` 0.15→0.06 (chance de guerra por par, compensando mais pares possíveis com N=4 clãs). Todas minhas, não pedidas explicitamente, mas necessárias — motivo detalhado no histórico do commit.
- **Jitter de idade dos fundadores mantido pequeno** (0-15s, não mais largo) — testado e confirmado que um jitter largo piora as coisas (alguns fundadores nascem mais perto do limite de idade, antecipando mortes).

## 5. Próximos passos concretos, em ordem

1. **Papéis visuais por ação** (evolução da civilização, próximo passo confirmado com o usuário) — integrar a leva de arte em `assets/Assets-testes-para-o-claude-testar/`. Precisa de: (a) decidir com o usuário o mapeamento exato sprite→ação (ex.: `ComponesMineirando` quando `currentAction === 'mine'`, `ComponesConstruindo` quando `'build'`, `CavaleiroAtacando`/`ComponesAtacando` pra `fight`, etc. — nem toda ação tem uma pose 1:1 óbvia, perguntar antes de assumir); (b) decidir se isso substitui as 4 variantes atuais (`WMan`/`WGirl`/`BMan`/`BGirl`) ou coexiste com elas; (c) reaproveitar o padrão de recorte por alpha (`agentRenderer.js:computeContentBounds`) já existente.

2. **Ataque ofensivo/saque** — guerra dinâmica ainda não tem efeito prático de tomar recurso à força. Implementar `agent/actions/raid.js`: agentes marcham deliberadamente até a vila inimiga (`village.raidTargetVillageId`, campo já reservado) e saqueiam estoque, reaproveitando `deliver.js` (genérico por `carryingType`) pro transporte de volta. Combate em rota emergiria sozinho do sistema `fight`/`flee` já existente.

3. **Trocar o placeholder geométrico da decoração pela arte real** — a leva de arte nova (item 1) já inclui água/arbustos/palmeira/pinheiro/árvore. Reescrever só `render/decorationRenderer.js` (dado de `world.decorations` não muda).

4. **Confirmar a estabilidade populacional jogando de verdade** (não só simulação direta) — deixar o jogo rodando uma sessão real de 15-30+ minutos e observar se a população se mantém saudável nas 4 vilas, se alguma entra em colapso/extinção, e se o crescimento inicial rápido (32→69 em ~200s simulados nos testes) se estabiliza bem. Reportar o que acontecer antes de mexer em mais balanceamento.

5. **Ajustar ritmo de mineração/construção se parecer lento demais jogando** — considerar aumentar `PERCEPTION_RADIUS`, ou vilas nascerem mais perto de montanha, ou reduzir `HOUSE_STONE_COST`/`HOUSE_WOOD_COST`, dependendo do que a sessão de observação (item 4) mostrar.

6. **Ligar a fome individual do agente ao estoque da vila** — hoje `eat.js` sempre come direto do ambiente, então uma vila sem comida institucional nunca faz seus agentes passarem fome de verdade a nível individual. Mudança maior, mexe no loop de sobrevivência de todo agente — avaliar só depois dos itens acima estarem estáveis.

7. **Considerar depois**: vilas com população zerada não deveriam participar normalmente da diplomacia dinâmica (ver §3, item 3).

8. **Considerar depois**: recalibrar a frequência/amortecimento de troca guerra↔paz se a sessão de observação (item 4) mostrar isso como um problema de sensação de jogo (ver §3, item 2).

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Animais no mapa**: decoração parada por enquanto (mesmo tratamento de árvore/planta/casa); "vagando sem IA de utilidade" fica pra uma leva futura, só quando a arte estiver pronta. Não implementar comportamento de bicho ainda.
- **Visuais em geral são provisórios** — o amigo do usuário vai substituindo a arte aos poucos, direto no disco (não via git). Registrado em `memory/art_pipeline.md` (memória do projeto, fora do repositório).
- **A leva de arte nova** (`assets/Assets-testes-para-o-claude-testar/`) foi só commitada, não integrada — precisa de uma conversa sobre mapeamento sprite→ação/papel antes de mexer no código de renderização (ver §5, item 1).
