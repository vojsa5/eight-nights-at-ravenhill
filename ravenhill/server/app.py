"""The HTTP server: the game API under /api/, everything else from web/."""
import argparse
import json
import random
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from ..game import Game
from .state import game_state
from .static import custom_art, static_file

GAMES = {}  # game id -> Game
LOCK = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, code, body, ctype="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _game(self, gid):
        with LOCK:
            if gid not in GAMES:
                raise KeyError("unknown game")
            return GAMES[gid]

    def do_GET(self):
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            if url.path == "/api/art":
                return self._send(200, custom_art())
            if url.path == "/api/state":
                return self._send(200, game_state(q["id"], self._game(q["id"])))
            found = static_file(url.path)
            if found:
                return self._send(200, *found)
            self._send(404, {"error": "not found"})
        except (KeyError, ValueError) as e:
            self._send(400, {"error": str(e)})

    def do_POST(self):
        url = urlparse(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(length) or b"{}")
        try:
            if url.path == "/api/new":
                seed = body.get("seed")  # only set by tests
                gid = uuid.uuid4().hex
                g = Game(random.Random(int(seed) if seed else None))
                with LOCK:
                    GAMES[gid] = g
                return self._send(200, game_state(gid, g))
            if url.path == "/api/act":
                g = self._game(body["id"])
                with LOCK:
                    g.act(int(body["char"]))
                return self._send(200, game_state(body["id"], g))
            if url.path == "/api/tool":
                g = self._game(body["id"])
                use = {"interview": g.interview}[body["tool"]]
                with LOCK:
                    use(int(body["char"]))
                return self._send(200, game_state(body["id"], g))
            self._send(404, {"error": "not found"})
        except (KeyError, ValueError) as e:
            self._send(400, {"error": str(e)})


def main(argv=None):
    ap = argparse.ArgumentParser(description="Play Eight Nights at Ravenhill in the browser.")
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args(argv)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Open http://localhost:{args.port}")
    server.serve_forever()
