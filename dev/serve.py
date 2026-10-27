"""Local dev server for The Gauntlet.

Serves index.html with the Firebase imports swapped for the in-browser fakes in
dev/, so you can play full games without touching the real database.
Open several tabs (one moderator, one per player). Moderator password: leader

    python3 dev/serve.py [port]
"""
import http.server
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
FIREBASE_IMPORT = re.compile(r"https://www\.gstatic\.com/firebasejs/[\d.]+/(firebase-[a-z]+)\.js")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path.split("?")[0] not in ("/", "/index.html"):
            return super().do_GET()
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        body = FIREBASE_IMPORT.sub(r"/dev/fake-\1.js", html).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    print(f"The Gauntlet (fake Firebase) → http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
