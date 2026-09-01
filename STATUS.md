# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Sessão iniciada depois da pausa registrada em `034a2dc`. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Commits desta sessão: `76503cf`..`cde98c1` (9 commits) — commitados e pushados pra `origin/main`. Contexto de antes desta sessão (fatias 1-11 do roteiro, especialização de vila, diplomacia dinâmica, minério/construção, papéis visuais, decoração com arte real, fome ligada ao estoque) não é repetido em detalhe aqui — ver `DESIGN.md` e o histórico de commits até `034a2dc`.

## 1. O que foi implementado ou alterado nesta sessão

Nesta ordem:

1. **Extinção quase-instantânea das 4 vilas — achado real jogando, e corrigido**: o usuário reportou que, jogando de verdade, as 4 vilas de um mundo novo se extinguiam em menos de 5 minutos reais. Causa raiz: todo fundador nascia com `needs.hunger=100` fixo, então os 8 de cada vila cruzavam o limiar de "comer" praticamente juntos, convergiam pro centro da vila e drenavam `STARTING_FOOD_STOCK` (então 40) numa rajada só — sem estoque, ninguém mais comia, e a vila inteira morria de fome em ~70-80s simulados. Acontecia igual nas 4 vilas, independente de especialização ou diplomacia. **Corrigido**: fome inicial de cada fundador agora é sorteada entre `FOUNDER_HUNGER_MIN=50` e `FOUNDER_HUNGER_MAX=100` (não mais sempre 100), espalhando o instante em que cada um decide comer; `STARTING_FOOD_STOCK` subiu de 40 para 60. Ver `DESIGN.md` §6.
2. **Ritmo de mineração/construção — ajustado e confirmado funcionando ao vivo**: a pedido do usuário ("não estou vendo evolução notável"), `PERCEPTION_RADIUS` subiu de 8 para 12 (achar montanha por acaso era um passeio aleatório lento) e `HOUSE_WOOD_COST`/`HOUSE_STONE_COST` desceram de 30/20 para 20/12. Confirmado ao vivo numa vila colada em montanha: agente selecionado mostrou `AÇÃO: minerando`, e `stone` da vila foi de 0/50 pra 1/50 — ciclo completo funcionando.
3. **Sprites de agentes empilhados sem offset — achado e corrigido**: vários agentes convergindo pro centro da vila ficavam desenhados exatamente na mesma posição, parecendo que tinham sumido. `render/agentRenderer.js` agora aplica um deslocamento pequeno e determinístico por `agent.id` só no desenho em tela.
4. **Correção de inconsistências nos `.md`**: as edições incrementais dos itens 1-3 deixaram um item do STATUS.md se contradizendo (dizia "não corrigido" pro que o item seguinte dizia que tinha sido corrigido), um hash de commit citado desatualizado, e um parágrafo do DESIGN.md §8 se contradizendo dentro dele mesmo. Corrigido depois de revisão pedida pelo usuário ("nos arquivos md não tem mais nada a ser feito?").
5. **Sessão de jogo real do usuário (20 min, velocidade 4x)**: relatou as 4 vilas vivas, nada quebrado, bom padrão — mas sem "evolução" visível ainda (nem a IA nem o jogador têm muito o que fazer). Confirma que a correção do item 1 se sustenta numa sessão de verdade, não só nos testes curtos do Claude.
6. **Questionário de features, baseado num levantamento dos assets sem uso** (`assets/Assets-testes-para-o-claude-testar/`): o usuário pediu um questionário de sugestões pra completar o jogo. O Claude auditou a pasta de assets e achou vários sprites nunca usados no código (não só o Carvão que o usuário já tinha notado) — `Carvao`/`Ferro`/`Ouro`/`Pedra1`/`Pedra2` (ícones de minério), `Agua1`/`2`/`3` (água), `ComponesMorto`, `ComponesPescando`, `ElfoParado`/`Andando`, `OrcParado`/`Andando`, `CavaleiroParado`/`Correndo`. Perguntas feitas via `AskUserQuestion`, decisões do usuário:
   - Ícone de minério no HUD **e** textura de montanha por recurso (ambos).
   - Água: animação leve entre as 3 variantes.
   - Guerreiro permanente: emergente pela demanda de defesa da vila (não fixo no nascimento, não só memória visual de combate recente).
   - Pesca (universal, como mineração) + animação de morte, entre as 4 poses soltas restantes.
7. **Ícone de minério + textura de montanha** (implementado): `ui/inspector.js` mostra o ícone do recurso antes do nome na lista de estoque; `render/tileRenderer.js` desenha o ícone do minério centralizado por cima do tile de montanha.
8. **Água animada** (implementado): `render/tileRenderer.js` — ícone recortado por alpha (não é textura full-bleed; a primeira tentativa esticou o sprite pro tile inteiro e criou um grid preto feio, corrigido), trocando de frame devagar entre as 3 variantes.
9. **Pesca universal** (implementado): `agent/actions/fish.js`, novo — produz `food` em qualquer vila (sem gate de especialização), peso abaixo de `gather.js` de propósito (atenua, não substitui, a dependência de comércio de uma vila madeireira).
10. **Animação de morte** (implementado): `lifecycle.js:pruneDead` só remove o agente `DEATH_LINGER_SECONDS` (3s simulados) depois da morte, mostrando `ComponesMorto` nesse meio-tempo. Corrigido de quebra: `main.js` só checava presença em `world.agents` pra decidir se o agente selecionado "tá vivo", sem checar `alive` — HUD/inspetor achavam o corpo lingerindo ainda vivo.
11. **Papel de guerreiro permanente** (implementado): `agent.role` (`'civilian'`/`'warrior'`) fecha uma lacuna do modelo de dados original do DESIGN.md (`role: farmer/warrior/builder`, nunca implementado). `clan/clanDecision.js:updateWarriorRoles` designa uma fração dos adultos (`WARRIOR_ROLE_FRACTION=0.3`) como guerreiro quando o clã entra em guerra, desmobiliza quando a paz volta de vez. Pequeno bônus de score em `fight.js`/`raid.js` pra quem é guerreiro. Visual: guerreiro designado mostra o `warriorType` sorteado no nascimento parado/andando sempre, não só durante `fight`.

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain | ✅ Funcionando. 5 tipos de tile + recurso de minério em montanha (agora com ícone visual). |
| Time loop | ✅ Funcionando. |
| Camera/Render | ✅ Funcionando. Zoom mínimo "contain". |
| Perception | ✅ Funcionando (raio subiu 8→12 pra acelerar descoberta de recursos). |
| Memory | ✅ Funcionando. |
| Needs | ⚠️ Parcial. Só fome e sono das 5 originais do pitch. Fundadores nascem com fome dessincronizada (item 1). |
| Utility AI / Decision | ✅ Funcionando. 12 ações: `wander`, `eat`, `sleep`, `gather`, `gatherWood`, `fish`, `mine`, `build`, `deliver`, `fight`, `flee`, `raid`. |
| Pathfinding | ✅ Funcionando (A*). |
| Village (estoque/demanda/população) | ✅ Funcionando. 6 recursos. |
| Clan/Diplomacy | ✅ Funcionando e dinâmico. Agora também designa/desmobiliza guerreiros nas transições de guerra/paz (item 11). |
| Trade/Economy | ✅ Observável. Vila madeireira agora tem uma segunda via de comida própria (pesca, item 9), além de comércio. |
| Combat | ✅ Engajar/fugir/dano/morte reativos + ataque ofensivo deliberado. Guerreiro designado tem prioridade extra pra lutar/saquear (item 11) — não confirmado ao vivo (ver §3). |
| Life-cycle | ✅ Funcionando. Morte agora tem um instante de corpo visível antes de sumir (item 10) — não confirmado ao vivo. |
| Simulation LOD | ✅ Funcionando, escala com zoom. |
| UI/HUD | ✅ HUD + inspetor completo. Ícone de minério na lista de estoque; sufixo "(guerreiro)" na ação do HUD. |
| Sprites de agente | ✅ Pose por ação corrente (agora inclui pescando), offset anti-empilhamento, morto, e guerreiro permanente. |
| Decoração do mapa | ✅ Árvore/planta com arte real. Casa no placeholder — sem sprite de casa na leva de arte. |
| Água | ✅ Ícone animado (era cor lisa) — item 8. |
| Especialização de vila | ✅ Funcionando. |
| Minério (evolução) | ✅ Funcionando, confirmado ao vivo. Ícone visual no tile e no HUD (itens 2, 7). |
| Construção (evolução) | ✅ Funcionando (mecânica), custo reduzido — ainda sem confirmação de uma casa completando de ponta a ponta numa sessão real. |
| Pesca (novo) | ✅ Funcionando — score/seleção de ação confirmados ao vivo; entrega completa (estoque de comida subindo por pesca) não observada diretamente. |
| Papel de guerreiro (novo) | ⚠️ Implementado, não confirmado ao vivo — nenhuma guerra ocorreu nas sessões de teste desta parte. |
| Animação de morte (novo) | ⚠️ Implementado, não confirmado ao vivo — nenhuma morte ocorreu nas sessões de teste desta parte. |
| Papéis visuais por ação | ✅ Funcionando. Camponês por ação; guerreiro (orc/elfo/cavaleiro) durante `fight` e agora também como papel permanente. |
| Ataque ofensivo/saque | ✅ Funcionando (evidência indireta); falta confirmação direta. |
| Fome ligada ao estoque | ✅ Funcionando, sem risco de rajada simultânea no nascimento (item 1). |
| Animais no mapa | ❌ Não iniciado — decorativo simples, só quando tiver arte. |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **Papel de guerreiro e animação de morte não foram confirmados numa guerra/morte real ao vivo** — as sessões de teste não conseguiram forçar nenhum dos dois eventos na janela curta disponível (mesma limitação de tooling: automação não sustenta sessão longa nem eventos raros de forma confiável). Vale conferir isso numa sessão real jogada pelo usuário.
2. **Pesca confirmada só por score/seleção de ação, não pela entrega completa** (estoque de `food` subindo por causa de pesca especificamente, isolado de outras fontes).
3. **Postura de guerra/paz pode alternar com frequência que parece volátil** numa sessão de observação longa — funciona corretamente, não crasha, mas pode precisar de mais amortecimento (histerese).
4. **A correção da espiral de extinção populacional por reprodução** (sessão bem anterior) nunca foi confirmada numa sessão de jogo real ao vivo por tempo longo, só em simulação em lote.
5. **Ataque ofensivo/saque nunca foi confirmado por leitura direta de um agente** — só por evidência indireta.
6. **Indicador visual `💀 extinta`** nunca foi visto aparecer ao vivo.
7. **Testes automatizados de sessão longa esbarram em throttling de `requestAnimationFrame`** mesmo na aba tecnicamente ativa, depois de ~100s de puros `wait` sem interação — limitação de tooling confirmada, não bug do jogo.
8. **Crescimento populacional inicial rápido** (achado em sessão anterior) — não confirmado se estabiliza numa sessão muito mais longa.
9. **Nenhuma casa foi vista completando de ponta a ponta** numa sessão real, mesmo com o custo reduzido.

## 4. Decisões técnicas e o motivo

- **Corrigir a extinção quase-instantânea dessincronizando a fome inicial dos fundadores + aumentar `STARTING_FOOD_STOCK`** — usuário escolheu essa combinação entre as opções propostas, ataca a causa raiz em vez de só adiar o sintoma.
- **Ritmo de mineração/construção: `PERCEPTION_RADIUS` + custo de casa, não mexer em spawn de vila** — usuário pediu pra seguir com o que o Claude preferisse; escolhidos os ajustes mais cirúrgicos/reversíveis antes de mudanças maiores de lógica.
- **Pesca universal (não restrita a vila madeireira, não substitui `gather.js`)** — usuário escolheu entre as três opções do questionário; atenua a dependência de comércio sem eliminar o pilar 4 do design.
- **Guerreiro emergente pela demanda de defesa (não fixo no nascimento, não só memória visual)** — usuário escolheu; fecha a lacuna do campo `role` já previsto no modelo de dados original. Bônus de score deliberadamente pequeno (`WARRIOR_ROLE_SCORE_BONUS=0.1`) — prioridade extra, não reescrita do equilíbrio economia/combate; `flee.js` não ganha bônus, autopreservação não deveria ser sobreposta por papel.
- **`FISH_SCORE_WEIGHT=0.4`, abaixo de `GATHER_SCORE_WEIGHT=0.55`** — decisão do Claude dentro do escopo aprovado: pra uma vila agrícola, colher grama ainda deve vencer a maior parte do tempo.
- **`DEATH_LINGER_SECONDS=3`** — decisão do Claude, tempo curto o bastante pra não atrasar a extinção de vila nem população.length de forma perceptível, longo o bastante pro sprite de morto aparecer.

## 5. Próximos passos concretos, em ordem

1. **Jogar uma sessão real de 15-30+ minutos, olhando as 4 vilas** — confirmar em especial: papel de guerreiro aparecendo numa guerra de verdade, corpo aparecendo numa morte, pesca de fato enchendo o estoque de comida, alguma casa completando.
2. **Se mineração ainda estiver lenta numa vila que nasce longe de montanha**: vilas nascerem mais perto de montanha, ou dar viés de exploração ao `wander.js`.
3. **Recalibrar a frequência/amortecimento de troca guerra↔paz** se uma sessão real mostrar isso como problema de sensação de jogo.
4. **Casa não tem sprite na leva de arte atual** — se o amigo do usuário adicionar um, trocar `drawHouse` em `render/decorationRenderer.js`.
5. **Confirmar visualmente saque e o indicador `💀 extinta`** numa sessão real.
6. **Considerar mais funções do usuário** — o pedido original mencionava "funções que quero adicionar" além dos assets; só o levantamento de assets foi coberto nesta rodada de questionário, vale perguntar se sobrou alguma ideia não citada.

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Animais no mapa**: decoração parada por enquanto; comportamento vagando sem IA de utilidade fica pra leva futura, só quando a arte estiver pronta.
- **Visuais em geral são provisórios** — o amigo do usuário vai substituindo a arte aos poucos, direto no disco. Registrado em `memory/art_pipeline.md` (memória do projeto, fora do repositório).
- **A leva de arte nova** está quase toda integrada agora (agente por ação + papel permanente, decoração de mapa, minério, água) — falta só casa, que não tem sprite nessa leva.
