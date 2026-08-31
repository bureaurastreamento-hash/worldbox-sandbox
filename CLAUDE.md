# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Worldbox Sandbox — god simulator 2D em grid, no estilo WorldBox, com o diferencial de IA emergente nos habitantes (necessidades, percepção local, decisão por sistema de utilidade) em vez de scripts fixos. Roda inteiramente no navegador.

## Regras técnicas

- JavaScript vanilla com módulos ES nativos — sem framework, sem bundler, sem etapa de build.
- Canvas 2D para renderização.
- Precisa rodar com `python -m http.server 8000`, sem build step.
- `index.html` fica na raiz (projeto publicado no GitHub Pages).
- Arquivos pequenos, separados por responsabilidade — nada de arquivo gigante.
- Sem dependências externas por CDN a menos que o usuário aprove antes.

## Regras de trabalho

- Uma feature por vez, sempre em estado rodável.
- Não refatorar nada que não foi pedido.
- Antes de implementar algo grande, explicar o plano primeiro (e, quando pedido, fazer perguntas de esclarecimento antes de escrever design ou código).

## Running

```bash
python -m http.server 8000
```

Then open http://localhost:8000

## Status

Repositório em fase de planejamento — ver `DESIGN.md` e `ARCHITECTURE.md` (quando existirem) para o design do jogo e a estrutura de módulos. Atualize esta seção conforme o código for adicionado.
