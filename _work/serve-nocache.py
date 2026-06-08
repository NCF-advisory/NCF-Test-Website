#!/usr/bin/env python3
"""Dev server local : multi-thread + en-têtes no-cache.
Multi-thread (ThreadingHTTPServer) pour éviter que la navigation se bloque
quand plusieurs requêtes arrivent en même temps. Sert le repo NCF sur :3000."""
import http.server
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = "/Users/communicationgroupenovances/Documents/NCF/NCF Site/NCF-Test-Website"
PORT = 3000

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

ThreadingHTTPServer.allow_reuse_address = True
with ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"NCF dev server (multi-thread, no-cache) sur http://127.0.0.1:{PORT}")
    httpd.serve_forever()
