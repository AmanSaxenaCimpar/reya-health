"""Public demo server.

Serves the exported site and forwards catalog API calls to FastAPI.
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
import os
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "hello-world", "dist"))
API_PREFIXES = (
    "/coverage",
    "/companies",
    "/labs",
    "/imaging",
    "/questionnaires",
    "/health",
)
HOP = {"host", "connection", "content-length", "accept-encoding", "transfer-encoding"}


class DemoHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()

    def do_OPTIONS(self):
        self._handle()

    def _handle(self):
        path = self.path.split("?", 1)[0]
        if any(path == prefix or path.startswith(prefix + "/") for prefix in API_PREFIXES):
            self._proxy()
            return
        if self.command != "GET":
            self._send(405, {"Content-Type": "text/plain"}, b"method not allowed")
            return
        self._file()

    def _file(self):
        relative = urllib.request.url2pathname(self.path.split("?", 1)[0]).lstrip("/\\")
        target = os.path.abspath(os.path.join(ROOT, relative))
        if os.path.commonpath([ROOT, target]) != ROOT or not os.path.isfile(target):
            target = os.path.join(ROOT, "index.html")
        mime = mimetypes.guess_type(target)[0] or "application/octet-stream"
        with open(target, "rb") as handle:
            data = handle.read()
        self._send(200, {"Content-Type": mime, "Cache-Control": "no-cache"}, data)

    def _proxy(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else None
        request = urllib.request.Request(
            "http://127.0.0.1:8000" + self.path, data=body, method=self.command
        )
        for key, value in self.headers.items():
            if key.lower() in HOP:
                continue
            request.add_header(key, value)
        request.add_header("Accept-Encoding", "identity")
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                self._send(response.status, response.headers, response.read())
        except urllib.error.HTTPError as error:
            self._send(error.code, error.headers, error.read())
        except Exception as error:
            message = f"api unavailable: {error}".encode()
            self._send(502, {"Content-Type": "text/plain"}, message)

    def _send(self, status, headers, data):
        self.send_response(status)
        if headers:
            for key, value in headers.items():
                if key.lower() in HOP or key.lower() == "content-encoding":
                    continue
                self.send_header(key, value)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8090), DemoHandler)
    print(f"Demo site listening on http://127.0.0.1:8090 from {ROOT}", flush=True)
    server.serve_forever()
