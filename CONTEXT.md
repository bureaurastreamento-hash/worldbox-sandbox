# CONTEXT.md — retomada rápida

Resumo executivo de uma página, pra quem chega (ou volta) sem contexto. O
detalhe está em `STATUS.md`; o plano completo em `ROADMAP.md` Parte 3.

## O que é

Simulador de deus 2D em grid no estilo WorldBox, com o diferencial de **IA
emergente** nos habitantes: necessidades, percepção local e decisão por
utilidade, em vez de scripts fixos. JavaScript vanilla, módulos ES nativos,
Canvas 2D, **sem build step**. Roda com `python3 dev-server.py`.

## Onde o projeto está

Núcleo completo e jogável (fatias 1-12 do roteiro original, mais especialização
de vila, diplomacia dinâmica, minério/construção, fauna predadora, terreno
procedural). Em cima disso, um plano de 8 fases pra integrar os sistemas do
WorldBox (`pesquisawolrd.md`), do qual **três já foram entregues**:

| Fase | O que é | Estado |
|---|---|---|
| **A** | Escala: time-slicing, LOD de render, pooling, O(n²) | ✅ |
| **C** | Navegação: HPA\*, flow fields | ✅ |
| **B** | Decisão: neurônios com prioridade, traços | ✅ |
| D | Genética e hereditariedade | ⬅️ **próxima** |
| E | Território, colonização, migração | ⬜ |
| F | Camada política (líder, atributos, tesouro) | ⬜ |
| G | Lealdade e rebelião | ⬜ |
| H | Diplomacia e plots | ⬜ |

## Números atuais

- **~205 agentes** estáveis em 24 vilas (`VILLAGE_COUNT`, valor conservador)
- **Reconsideração:** 0.017ms por agente
- **Navegação longa:** < 1ms (era 8ms com A\* plano)
- **Flow field:** 17.8ms uma vez por destino, 0.116µs por unidade

## As cinco coisas que mais economizam tempo saber

1. **A economia não tem folga.** Toda ação nova que compete pelo tempo do
   agente derruba as vilas. Aconteceu com `explore`, `mine`, `build` e
   `patrol`. Toda ação de desenvolvimento passa por
   `village/stock.js:canDevelop`, que limita **quantidade de gente**, não
   estoque — limiar de estoque oscila e libera a vila inteira de uma vez.
2. **Medir com menos de 600s simulados não diz nada.** A população pica por
   volta dos 180s e só então desaba. Uma sessão inteira medindo a 180s deixou
   passar um colapso total que chegou a ser publicado.
3. **Comparação de seed único é inválida.** Qualquer mudança de comportamento
   desvia a sequência de `world.rng`. Use 5-6 seeds e registre a curva.
4. **Custo é dominado pela DENSIDADE por vila, não pela contagem de agentes.**
   641 agentes em 40 vilas custaram 27ms; 633 em 48 vilas custaram 10ms. Pra
   mais agentes, prefira mais vilas.
5. **Traço que mexe em PESO quase não tem efeito** — só muda algo quando há
   competição dentro da faixa de prioridade. Traço que mexe em **prioridade**
   vale muito mais. Isso deve guiar o desenho de genes na Fase D.

## Ferramentas de diagnóstico

- `?seed=x` na URL fixa o mundo.
- `window.__wb` expõe `world`, `camera`, `loop`, `update`. O rAF é throttlado
  em aba de automação, então pause `loop` e chame `update(dt)` na mão.

## Documentos

- **`STATUS.md`** — estado por sistema, bugs conhecidos, próximos passos.
- **`ROADMAP.md`** — histórico completo (Parte 1), backlog (Parte 2), plano
  das 8 fases do WorldBox (Parte 3).
- **`DESIGN.md`** — design e o raciocínio por trás de cada decisão.
- **`ARCHITECTURE.md`** — estrutura de módulos e como conversam.
- **`ASSISTANT_SUMMARY.md`** — resumo pro assistente externo que ajuda a
  planejar as fases.
