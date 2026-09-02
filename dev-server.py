#!/usr/bin/env python3
"""Servidor local de desenvolvimento — como `python -m http.server`, mas
adiciona `Cache-Control: no-store` em toda resposta.

Por quê: `python -m http.server` puro não manda nenhum header de cache,
então o navegador aplica cache heurístico próprio (baseado em
Last-Modified) — na prática, editar um arquivo e recarregar a página nem
sempre pega o conteúdo novo, especialmente para módulos ES importados
transitivamente (não o script de entrada). Isso já causou sessões inteiras
de debug perseguindo "bug fantasma" que na verdade era JS desatualizado
rodando no navegador (ver STATUS.md). `no-store` força o navegador a
sempre buscar de novo, nunca reutilizar uma cópia antiga.

Uso: mesmo padrão de `python -m http.server`, mesma porta default (8000).

    python3 dev-server.py [porta]
"""

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = HTTPServer(("", port), NoCacheHTTPRequestHandler)
    print(f"Servindo em http://localhost:{port}/ (Cache-Control: no-store em toda resposta)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
