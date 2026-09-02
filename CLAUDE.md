# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Worldbox Sandbox — god simulator 2D em grid, no estilo WorldBox, com o diferencial de IA emergente nos habitantes (necessidades, percepção local, decisão por sistema de utilidade) em vez de scripts fixos. Roda inteiramente no navegador.

## Regras técnicas

- JavaScript vanilla com módulos ES nativos — sem framework, sem bundler, sem etapa de build.
- Canvas 2D para renderização.
- Precisa rodar com `python3 dev-server.py`, sem build step. **Não use `python -m http.server` puro** — ele não manda header de cache nenhum, e o navegador serve versões antigas de módulos JS editados recentemente, causando debug de "bugs fantasma" que na verdade são código desatualizado (aconteceu em mais de uma sessão). `dev-server.py` é o mesmo servidor, só com `Cache-Control: no-store` em toda resposta.
- `index.html` fica na raiz (projeto publicado no GitHub Pages).
- Arquivos pequenos, separados por responsabilidade — nada de arquivo gigante.
- Sem dependências externas por CDN a menos que o usuário aprove antes.

## Regras de trabalho

- Uma feature por vez, sempre em estado rodável.
- Não refatorar nada que não foi pedido.
- Antes de implementar algo grande, explicar o plano primeiro (e, quando pedido, fazer perguntas de esclarecimento antes de escrever design ou código).

## Regra

Antes de responder, verifique se alguma skill disponível se aplica à tarefa.

## Running

```bash
python3 dev-server.py
```

Then open http://localhost:8000

## Status

Jogável, com o núcleo comportamental completo (fatias 1-12 do roteiro, mais evolução além dele — ver `DESIGN.md`). Quatro documentos vivos, cada um com um papel diferente:
- `DESIGN.md` — design e o raciocínio por trás de cada decisão.
- `ARCHITECTURE.md` — estrutura de módulos e como conversam entre si.
- `STATUS.md` — snapshot da sessão mais recente: o que mudou, bugs conhecidos, próximos passos concretos.
- `ROADMAP.md` — lista consolidada de tudo que já foi feito e tudo que está planejado, pra visão de conjunto sem precisar juntar os outros três.

Mantenha os quatro atualizados conforme o código muda.
