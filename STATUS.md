# STATUS.md — Worldbox Sandbox

Snapshot da sessão mais recente. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). `git log` é a fonte de verdade pro histórico detalhado.

**Para retomar rápido, leia `CONTEXT.md` primeiro** — é o resumo executivo de uma página. Este arquivo é o detalhe.

## 1. O tema da sessão

Começou pelas pendências antigas (contagem no inspetor, construção travada) e por um pedido do usuário jogando: *"os NPCs não exploram o mapa, não vejo soldados, não vejo grupos de exploração"*. Virou, depois, a integração do `pesquisawolrd.md` — os sistemas fundamentais do WorldBox — organizada num plano de 8 fases (`ROADMAP.md` Parte 3), das quais **A, B e C foram entregues**.

## 2. O que foi implementado nesta sessão

Em ordem cronológica (13 commits):

1. **Contagem de casas no inspetor** — filtrava `buildings.length` como se fosse só casa.
2. **A\* com heap binário + `wander` com rumo persistente** — o conjunto aberto do A\* era um array reordenado por completo a cada iteração. **33x o tempo de simulação** (540ms → 17693ms por 5s simulados), de volta a 530ms.
3. **Exploração** — ação `explore`, expedições em grupo (`village/expedition.js`), quadro de descobertas da vila (`village/knowledge.js`), exceção no LOD pra a expedição não congelar fora da tela.
4. **Construção destravada** — quatro problemas, nenhum deles o custo da pedra (ver §4).
5. **Guarnição permanente + patrulha** — o efetivo militar era zero em tempo de paz, o que também deixava os predadores incontestados.
6. **Correção de extinção total** — o commit anterior tinha ido pro ar quebrado (ver §4).
7. **Plano de integração do WorldBox** (`ROADMAP.md` Parte 3).
8. **Fase A** — remoção do LOD de simulação por viewport, time-slicing de cognição, três índices O(n²), world-gen em grade.
9. **Fase A (2ª leva)** — LOD de renderização, object pooling, mais três O(n²).
10. **Fase C** — HPA\* (`world/chunks.js`, `world/hpaStar.js`) e campos de fluxo (`world/flowField.js`).
11. **Fase B** — neurônios com prioridades (`agent/neuron.js`) e traços (`agent/traits.js`).

## 3. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain, Time loop, Camera | ✅ Funcionando |
| **Pathfinding (A\* + HPA\* + flow fields)** | ✅ Funcionando — travessia longa < 1ms |
| **Escalonamento de cognição (time-slicing)** | ✅ Funcionando — simulação 100% independente do zoom |
| **LOD de renderização** | ✅ Funcionando — 3 níveis por zoom |
| **Neurônios (prioridades + `canFire` + 80/20)** | ✅ Funcionando — 0.017ms/agente |
| **Traços** | 🟡 Funcionando, mas **traço que mexe em peso quase não tem efeito** (ver §4) |
| Perception, Memory | ✅ Funcionando — memória indexada por tipo |
| Exploração / expedições | ✅ Funcionando |
| Quadro de descobertas da vila | ✅ Funcionando |
| Guarnição / patrulha | ✅ Funcionando |
| Village/Clan/Diplomacy/Trade | ✅ Funcionando |
| Combat (agente e predador) | ✅ Funcionando |
| Life-cycle, reprodução | 🟡 Funcionando, mas com extinção de vilas alta (§4) |
| **Construção** | 🟡 **Raríssima de propósito** — destravá-la matou as vilas nas duas tentativas (§4) |
| UI/HUD/Inspetor/Feed | ✅ Funcionando — HUD mostra traços |
| Atributos de personagem (`agent.attributes`) | 🟡 **Existem e são modificados por traços, mas nada os lê ainda** — são a base das Fases F/G |
| Genética / hereditariedade | ❌ Não iniciado — é a Fase D |
| Território / colonização / migração | ❌ Não iniciado — Fase E |
| Camada política (líder, tesouro, cultura) | ❌ Não iniciado — Fase F |
| Lealdade / rebelião | ❌ Não iniciado — Fase G |
| Opinião diplomática numérica / plots | ❌ Não iniciado — Fase H |
| Necessidades sociais/pertencimento | ❌ Não iniciado |
| `defense_pact` com efeito real | ❌ Não iniciado |

## 4. Bugs e limitações conhecidas, não corrigidos

1. **Extinção de vilas alta.** 9 de 24 vilas extintas em 468s simulados, com a população total estável em ~205. Não sei se é consequência da Fase B ou pré-existente com 24 vilas — **não foi isolado**, e é a primeira coisa a investigar.
2. **População caiu de ~250 (pós-Fase A) para ~205 (pós-Fase B).** Parte é o preço da variedade pedida (o agente às vezes faz a segunda melhor coisa); parte não foi isolada.
3. **Traço que mexe em PESO quase não tem efeito.** O multiplicador só muda algo quando há competição dentro da faixa de prioridade. `coward` tem `fleePredator: 1.5`, mas fugir é IMMEDIATE e costuma estar sozinho na faixa — o multiplicador não altera nada. **Traços que mexem em prioridade valem muito mais.** Isso deve guiar o desenho de genes na Fase D.
4. **Construção é raríssima, e isso é deliberado.** `BUILD_NEED_THRESHOLD = 0.75` com `VILLAGE_POP_CAP = 30` não-bindante significa que a lotação real (~0.42) nunca cruza o limiar. As duas formas de destravar foram testadas e **as duas mataram as quatro vilas** por volta dos 300-450s: baixar o teto de população, e baixar o limiar. É pendência de **design**, não de calibragem.
5. **Custo por agente varia muito entre medições** e não foi isolado: 350 agentes custaram 14ms num teste, 511 custaram 6.8ms em outro. Parte é **densidade por vila** — `perception.agents` e `agent/separation.js` são quadráticos na densidade local (641 agentes em 40 vilas custaram 27ms; 633 em 48 vilas custaram 10ms). Consequência prática: **pra mais agentes, prefira mais vilas, não vilas maiores.**
6. **`VILLAGE_COUNT = 24` é prudência, não limite medido.** O HPA\* tirou o pathfinding do caminho crítico; subir provavelmente é seguro, mas exige medir de novo.
7. **Construção de campo de fluxo é um pico de 17.8ms num único frame.** Amortizado pelo cache, mas visível quando uma guerra começa.
8. **Primeiro frame após mudar de zoom pode levar segundos** — bake dos chunks de terreno naquele nível. Acontece uma vez por zoom.
9. Elfo sem arte própria; orc de perfil destoa — aceitos há várias sessões.

## 5. Decisões técnicas e o motivo

Onde o usuário escolheu entre opções que apresentei, está marcado.

- **Ordem das fases reordenada** (escolha do usuário, depois da minha análise): escala virou a primeira fase em vez da última, porque a economia não tem folga e todo sistema novo colapsa sem mais agentes. E entrou uma **Fase F (camada política)** que não existia no plano original — sem `leader`/atributos/tesouro, as fases de rebelião e diplomacia não têm sobre o que operar.
- **Meta de agentes: centenas primeiro, milhares depois** (escolha do usuário) — HPA\* ficou pra Fase C em vez de entrar junto com o time-slicing.
- **Utility AI mantida e estendida, não substituída por FSM.** A `pesquisawolrd.md` descreve o WorldBox como FSM, que é *menos* expressivo que o que já existia aqui. O score contínuo virou o **peso** do neurônio.
- **Prioridade escala com urgência (`urgentAbove`), não é fixa por ação.** Comer não é urgente; comer com fome crítica é. A versão com faixa fixa matou 22 de 24 vilas em 135s.
- **Sorteio por peso² e não por peso.** Peso não é probabilidade: proporcional fazia o agente passar um quarto do tempo na segunda melhor opção.
- **Time-slicing ancorado no tempo SIMULADO**, e teto por frame proporcional ao `dt`. Com fatias por frame, rodar em 4x faria os agentes pensarem menos — o comportamento mudaria com a velocidade.
- **LOD de simulação por viewport removido** (e a simulação agregada de vilas fora de tela junto). Era uma segunda física paralela: navegar o mapa mudava o resultado do jogo.
- **HPA\*: um portal por trecho contínuo, não por célula**, e a aresta guarda o **caminho**, não só o custo.
- **Quadro de descobertas só com o que foi entregue pessoalmente** (escolha do usuário entre três opções) — preserva o pilar 2 do design.
- **Guarnição fixa COM patrulha** (escolha do usuário) e **grupos de exploração junto com a ação `explore`** (escolha do usuário).
- **Casa custa só madeira.** Pedra depende de achar cordilheira, que a exploração acha em ~40% dos mundos; com pedra no custo, o crescimento virava um teto sem escada.
- **Moeda vs minério**: `gold` é minério; a moeda dos reinos vai se chamar `coins`/`wealth` (decidido, ainda não implementado).
- **Reivindicação territorial vai em `world/territory.js` novo** — `world/claims.js` é reserva de tile de colheita, nome já ocupado.

## 6. Metodologia de medição (não repetir os erros)

- **Janela mínima de 600s simulados.** Medir com 180s esconde extinção total: a população *pica* por volta dos 180s e só então desaba. Uma sessão inteira de medições a 180s deixou passar um colapso que chegou a ser publicado.
- **Nunca comparar seed único.** Qualquer mudança de comportamento altera o consumo de `world.rng` e diverge a trajetória. Use 5-6 seeds.
- **Registrar a CURVA**, não só o valor final — é a curva que revela pico-e-queda.
- **`?seed=x`** fixa o mundo; **`window.__wb`** expõe `world`/`camera`/`loop`/`update` pra pausar o loop e avançar `update(dt)` na mão (o rAF é throttlado em aba de automação).
- Rodar cada mundo num `<iframe>` oculto; lotes não cabem num `Runtime.evaluate` (timeout de 45s), então acumular em `window` e consultar depois.

## 7. Próximos passos concretos, em ordem

1. **Investigar as extinções de vilas** (§4.1) antes de empilhar mais sistema. Pergunta específica: 9 de 24 vilas extintas em 468s é consequência da Fase B ou já acontecia com 24 vilas antes dela? Rodar o mesmo seed no commit anterior à Fase B e comparar a curva.
2. **Fase D — Genética e hereditariedade.** A base está pronta: `rollTraits` já devolve o formato que a herança vai produzir (lista de ids) e `agent.attributes` já existe pros genes modularem. Escopo: cromossomos com alelos dominantes/recessivos, herança por cruzamento dos pais, mutação (~2%), sinergia entre genes adjacentes (genes "dourados" e "ruins"), e conexão dos genes aos atributos. **Priorizar genes que mexem em PRIORIDADE de neurônio, não em peso** — ver §4.3.
3. **Fase E — território, colonização, migração.** É o que resolve "vilas extintas ficam vazias". Criar `world/territory.js`.
4. **Fase F — camada política** (líder, atributos lidos de verdade, dinastia, prestígio, tesouro `coins`). Pré-requisito de G e H.
5. **Fases G e H** — lealdade/rebelião e diplomacia/plots.
6. **Pendente de performance:** isolar a variância de custo por agente (§4.5) e reavaliar `VILLAGE_COUNT` com medição (§4.6).

## 8. Coisas pedidas pra lembrar que ainda não são código

- **Sessão de jogo longa do usuário** — continua sendo a confirmação que falta pra quase tudo: guerra orgânica com a animação nova, morte ao vivo, saque acontecendo, indicador de vila extinta, e a sensação geral de vila viva.
- **Arte do Elfo** — o usuário topou procurar um pack no estilo craftpix; trocar é trivial em `render/agentRenderer.js:WARRIOR_ACTOR`.
- **Decisão em aberto**: mundos ricos em minério estabilizam com menos moradores (a mineração custa mão de obra). Manter mineração funcionando ou vilas maiores sem ela? É uma constante.
- Os quatro sistemas grandes do `ROADMAP.md` §2.5 continuam **sem prioridade e sem design** — não puxar nenhum sem conversa própria.
