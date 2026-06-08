#!/usr/bin/env python3
"""Dev server local avec en-têtes no-cache (évite que le navigateur garde
les anciens CSS/JS/HTML pendant l'itération). Sert le repo NCF sur :3000."""
import http.server, socketserver, os

ROOT = "/Users/communicationgroupenovances/Documents/NCF/NCF Site/NCF-Test-Website"
PORT = 3000

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"NCF dev server (no-cache) sur http://127.0.0.1:{PORT}")
    httpd.serve_forever()
