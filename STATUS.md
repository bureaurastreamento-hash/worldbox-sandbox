# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Sessão em andamento, iniciada depois da pausa registrada em `034a2dc`. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). O commit desta sessão até agora: `76503cf`. Contexto de antes desta sessão (fatias 1-11 do roteiro, especialização de vila, diplomacia dinâmica, minério/construção, papéis visuais, decoração com arte real, fome ligada ao estoque) não é repetido em detalhe aqui — ver `DESIGN.md` e o histórico de commits até `034a2dc`.

## 1. O que foi implementado ou alterado nesta sessão

1. **Extinção quase-instantânea das 4 vilas — achado real jogando, e corrigido**: o usuário reportou que, jogando de verdade (não em simulação em lote), as 4 vilas de um mundo novo se extinguiam em menos de 5 minutos reais — bem antes de qualquer janela de diplomacia/comércio ter chance de agir. Causa raiz: todo fundador nascia com `needs.hunger=100` fixo (`agent/needs.js`), então os 8 de cada vila cruzavam o limiar de "comer" praticamente no mesmo instante simulado, convergiam juntos pro centro da vila e drenavam `STARTING_FOOD_STOCK` (então 40) numa rajada só (8 agentes × `EAT_FOOD_PER_SEC=1` ≫ o estoque disponível). Sem estoque, `eat.js:score` retorna 0 pra todo mundo — nem produção nem comércio conseguem repor a tempo contra 8 bocas famintas de uma vez — e a vila inteira morre de fome em ~70-80s de tempo simulado do nascimento. Acontecia igual nas 4 vilas porque a sincronia inicial é a mesma em todas, independente de especialização ou sorte diplomática (diferente do achado de extinção da sessão anterior, que dependia de postura `tense` sem comércio). Ver `DESIGN.md` §6 pro relato completo.
2. **Correção**: fome inicial de cada fundador agora é sorteada entre `FOUNDER_HUNGER_MIN=50` e `FOUNDER_HUNGER_MAX=100` (`utils/constants.js`, aplicado em `main.js:spawnVillage`) em vez de sempre 100 — espalha o instante em que cada fundador decide ir comer, evitando a rajada simultânea. `STARTING_FOOD_STOCK` subiu de 40 para 60 como margem extra.
3. **Testado ao vivo pelo Claude** (navegador real, ~2 minutos reais, velocidade 4x): população de uma vila permaneceu estável em 8/8 o tempo todo, estoque de comida oscilando saudável (59-65/100), sem repetir o colapso. Ainda não é a sessão longa de 15-30 min jogada pelo usuário recomendada abaixo (§5 item 1) — só uma verificação rápida de que a rajada não se repete.
4. **Achado colateral, não corrigido (cosmético)**: quando vários agentes convergem pro mesmo ponto (centro da vila), os sprites ficam empilhados exatamente na mesma posição, sem nenhum offset — dá a impressão visual de que agentes "sumiram" quando na verdade estão todos sobrepostos. Confirmado que é só visual (população real no inspetor não mudou). Não mexi nisso, não foi pedido.
5. **Ritmo de mineração/construção — ajustado e confirmado funcionando numa sessão ao vivo**: a pedido direto do usuário ("não estou vendo evolução notável"), investiguei a causa provável (`mine.js` só considera depósito já visto pela percepção do agente; `wander.js` só explora tiles já visíveis, sem viés de busca — descoberta de montanha por acaso é lenta). `PERCEPTION_RADIUS` 8→12; `HOUSE_WOOD_COST`/`HOUSE_STONE_COST` 30/20→20/12. Numa sessão de teste seguinte, uma vila nasceu encostada numa cadeia de montanha — selecionando um agente direto, confirmei `AÇÃO: minerando`, e o estoque de `stone` da vila passou de 0/50 pra 1/50 pouco depois: o ciclo descobrir→minerar→entregar funciona de ponta a ponta. Não cobre o caso de vila que nasce longe de montanha (ainda depende de sorte no wander), mas confirma que o ajuste ataca a causa certa.
6. **Sprites de agentes empilhados sem offset — achado e corrigido**: quando vários convergiam pro centro da vila, ficavam desenhados na posição exata, sobrepostos, parecendo que agentes tinham sumido. Corrigido em `render/agentRenderer.js` — cada agente ganha um pequeno deslocamento determinístico (hash do `agent.id`) só no desenho em tela, nunca em `agent.position`. Testado ao vivo: grupo antes ilegível agora aparece espalhado corretamente.

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain | ✅ Funcionando. 5 tipos de tile + recurso de minério em montanha. |
| Time loop | ✅ Funcionando. |
| Camera/Render | ✅ Funcionando. Zoom mínimo "contain" (mapa inteiro cabe na tela). |
| Perception | ✅ Funcionando (tiles + recurso de montanha + agentes, via índice espacial). |
| Memory | ✅ Funcionando. |
| Needs | ⚠️ Parcial. Só fome e sono das 5 necessidades originais do pitch. Fome vem do estoque da vila; fundadores agora nascem com fome dessincronizada (item 1 acima) pra evitar rajada de consumo simultânea. |
| Utility AI / Decision | ✅ Funcionando. 11 ações: `wander`, `eat`, `sleep`, `gather`, `gatherWood`, `mine`, `build`, `deliver`, `fight`, `flee`, `raid`. |
| Pathfinding | ✅ Funcionando (A*). Montanha não é andável — ações que envolvem depósito de montanha miram o tile andável adjacente. |
| Village (estoque/demanda/população) | ✅ Funcionando. 6 recursos (food/wood/stone/coal/iron/gold). Teto de população dinâmico via `getPopulationCap` (base + bônus por casa construída). |
| Clan/Diplomacy | ✅ Funcionando e dinâmico: guerra/paz/comércio/troca de parceiro reavaliados periodicamente por clã. Vila extinta não decide nem é alvo. |
| Trade/Economy | ✅ Observável — especialização faz a demanda divergir de verdade; diplomacia dinâmica propõe/rompe tratados sozinha. Não comercia com vila extinta. |
| Combat | ✅ Engajar/fugir/dano/morte reativos + ataque ofensivo deliberado (`raid.js`). |
| Life-cycle | ✅ Funcionando. Fome inicial dos fundadores agora dessincronizada (item 1/2 acima) — não deveria mais causar extinção quase-instantânea. |
| Simulation LOD | ✅ Funcionando, escala com zoom. |
| UI/HUD | ✅ HUD básico + inspetor completo (scores, vila, clã, seleção direta de vila). |
| Sprites de agente | ✅ Pose por ação corrente, com animação de andar. Offset determinístico por agente evita sobreposição total quando vários convergem pro mesmo ponto (item 6 acima). |
| Decoração do mapa | ✅ Árvore e planta com arte real (3 espécies de árvore, 2 de planta). Casa no placeholder geométrico — sem sprite de casa na leva de arte. |
| Especialização de vila | ✅ Funcionando (comida/madeira, sempre complementar). |
| Minério (evolução) | ✅ Funcionando, confirmado ao vivo nesta sessão (descobrir→minerar→entregar). Raio de percepção subiu (8→12) — vila longe de montanha ainda depende de sorte no wander (ver §1 item 5). |
| Construção (evolução) | ✅ Funcionando. Custo de casa reduzido (30/20→20/12 madeira/pedra) — ainda sem confirmação de uma casa completando de ponta a ponta numa sessão real (ver §1 item 5). |
| Papéis visuais por ação | ✅ Funcionando. Camponês por ação; guerreiro (orc/elfo/cavaleiro) durante `fight`. |
| Ataque ofensivo/saque | ✅ Funcionando (evidência indireta forte); falta confirmação direta por seleção de agente. |
| Fome ligada ao estoque | ✅ Funcionando, e agora sem o risco de rajada simultânea no nascimento da vila (ver item 1/2). |
| Animais no mapa | ❌ Não iniciado — decisão já tomada (decorativo simples primeiro, sem IA, só quando tiver arte). |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **Mineração confirmada funcionando ao vivo, mas construção (casa completa) ainda não foi vista de ponta a ponta** — a sessão de teste achou uma vila colada em montanha (caso favorável); não testei o suficiente pra ver `HOUSE_STONE_COST`/`HOUSE_WOOD_COST` completos e uma casa sendo adicionada a `village.buildings`. Se depois de uma sessão real mais longa mineração ainda estiver lenta em vilas longe de montanha, os candidatos não tentados são: vilas nascerem mais perto de montanha, ou dar viés de exploração pro `wander.js` (hoje só escolhe entre tiles já visíveis agora, sem tendência a se afastar).
2. **Postura de guerra/paz pode alternar com frequência que parece volátil** numa sessão de observação longa — funciona corretamente, não crasha, mas pode precisar de mais amortecimento (histerese) se parecer caótico demais jogando de verdade.
3. **A correção da espiral de extinção populacional por reprodução** (sessão bem anterior) nunca foi confirmada numa sessão de jogo real ao vivo por tempo longo, só em simulação em lote.
4. **A dessincronização da fome inicial (correção desta sessão) só foi confirmada por ~2 minutos reais de teste ao vivo** — span curto. Ainda vale jogar a sessão longa recomendada em §5 item 1 pra ter mais confiança, inclusive olhando as 4 vilas, não só uma.
5. **Ataque ofensivo/saque nunca foi confirmado por leitura direta de um agente** (`agent.currentAction === 'raid'`) — só por evidência indireta. Automação de clique não consegue selecionar agente em movimento de forma confiável.
6. **Indicador visual `💀 extinta`** nunca foi visto aparecer ao vivo.
7. **Testes automatizados de sessão longa esbarram em throttling de `requestAnimationFrame` em aba de segundo plano do Chrome** — limitação de tooling confirmada, não bug do jogo. Sessões longas precisam ser jogadas pelo usuário em primeiro plano.
8. **Crescimento populacional inicial rápido** (32→69 agentes em ~200s simulados, achado em sessão anterior) — não confirmado se estabiliza numa sessão muito mais longa.

## 4. Decisões técnicas e o motivo

Decisões desta sessão:

- **Corrigir a extinção quase-instantânea dessincronizando a fome inicial dos fundadores (opção "a"), combinado com aumentar `STARTING_FOOD_STOCK` como margem extra (opção "d")** — usuário escolheu essa combinação entre as opções propostas (as outras eram só aumentar o estoque sem mexer na sincronização, ou limitar quantos agentes comem ao mesmo tempo). Ataca a causa raiz (sincronização) em vez de só adiar o sintoma.
- **`FOUNDER_HUNGER_MIN=50`** (não mais baixo) — evita fundadores nascerem já em fome crítica por azar do sorteio, o que poderia matar gente antes mesmo da vila ter uma chance real.
- **`STARTING_FOOD_STOCK` 40→60** (não um valor muito maior) — margem extra sem tornar a pressão de fome irrelevante logo no início (demanda inicial de comida ainda fica em 40%, acima do que seria considerado "excedente" pra comércio).
- **Ritmo de mineração/construção: escolhi `PERCEPTION_RADIUS` + custo de casa entre os candidatos, não mexi na proximidade de spawn com montanha** — usuário pediu pra seguir com o que eu preferisse. Escolhi os dois ajustes mais surgicais/reversíveis (constantes, sem mudar lógica de ninguém) antes de considerar mudar a lógica de spawn de vila ou o comportamento de exploração do `wander.js`, que são mudanças maiores e mais arriscadas de calibrar.

## 5. Próximos passos concretos, em ordem

1. **Jogar uma sessão real (não automatizada) de 15-30+ minutos, olhando as 4 vilas** — o item mais importante em aberto; os testes desta sessão cobriram só alguns minutos reais por vez, numa vila por vez. Observar: (a) se a correção da fome inicial se mantém com mais tempo; (b) se alguma casa chega a completar (mineração já confirmada, construção ainda não); (c) se dá pra ver saque durante uma guerra; (d) qualquer coisa visualmente estranha.
2. **Se mineração ainda estiver lenta numa vila que nasce longe de montanha**: tentar os candidatos não usados ainda — vilas nascerem mais perto de montanha, ou dar viés de exploração ao `wander.js`.
3. **Recalibrar a frequência/amortecimento de troca guerra↔paz** se uma sessão real mostrar isso como problema de sensação de jogo (ver §3 item 2).
4. **Casa não tem sprite na leva de arte atual** — se o amigo do usuário adicionar um, só trocar `drawHouse` em `render/decorationRenderer.js`.
5. **Confirmar visualmente saque e o indicador `💀 extinta`** numa sessão real (automação de clique não seleciona agentes em movimento de forma confiável).

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Animais no mapa**: decoração parada por enquanto; comportamento vagando sem IA de utilidade fica pra leva futura, só quando a arte estiver pronta.
- **Visuais em geral são provisórios** — o amigo do usuário vai substituindo a arte aos poucos, direto no disco. Registrado em `memory/art_pipeline.md` (memória do projeto, fora do repositório).
- **A leva de arte nova** já está integrada pro lado de agente e decoração de mapa — falta só casa, que não tem sprite nessa leva.
