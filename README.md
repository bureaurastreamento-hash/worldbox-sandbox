# Worldbox Sandbox

God simulator 2D com IA emergente. Roda no navegador.

## Como rodar

```bash
python3 dev-server.py
```

Depois abra http://localhost:8000

`dev-server.py` é como `python -m http.server`, mas manda `Cache-Control:
no-store` em toda resposta — sem isso, o navegador às vezes serve uma cópia
em cache de um módulo JS editado recentemente, dando a impressão de que uma
mudança não pegou. Prefira sempre este script a `python -m http.server`
puro.
