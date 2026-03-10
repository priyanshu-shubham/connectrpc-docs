#!/usr/bin/env python3
"""
Example ConnectRPC-compatible mock server for testing the API Explorer.
Implements a BookstoreService with in-memory storage.

Usage:
    1. Build the IIFE:  cd .. && npm run build:lib
    2. Run this server:  python server.py
    3. Open http://localhost:8080
"""

import json
import uuid
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).parent
PROTO_DIR = HERE / "proto"
IIFE_PATH = HERE.parent / "dist" / "api-explorer.iife.js"
PORT = 8080

SERVICE = "bookstore.v1.BookstoreService"

# ---------------------------------------------------------------------------
# In-memory book store
# ---------------------------------------------------------------------------

BOOKS: dict[str, dict] = {}


def seed_books():
    for b in [
        {"title": "The Go Programming Language", "author": "Alan Donovan", "isbn": "978-0134190440", "pages": 380, "genre": 7, "yearPublished": 2015, "available": True},
        {"title": "Designing Data-Intensive Applications", "author": "Martin Kleppmann", "isbn": "978-1449373320", "pages": 616, "genre": 7, "yearPublished": 2017, "available": True},
        {"title": "Dune", "author": "Frank Herbert", "isbn": "978-0441172719", "pages": 688, "genre": 3, "yearPublished": 1965, "available": True},
        {"title": "The Pragmatic Programmer", "author": "David Thomas", "isbn": "978-0135957059", "pages": 352, "genre": 7, "yearPublished": 2019, "available": True},
        {"title": "Neuromancer", "author": "William Gibson", "isbn": "978-0441569595", "pages": 271, "genre": 3, "yearPublished": 1984, "available": False},
    ]:
        book_id = f"book-{uuid.uuid4().hex[:8]}"
        BOOKS[book_id] = {"id": book_id, **b}


# ---------------------------------------------------------------------------
# RPC handlers
# ---------------------------------------------------------------------------

def create_book(req: dict) -> dict:
    book_id = f"book-{uuid.uuid4().hex[:8]}"
    book = {
        "id": book_id,
        "title": req.get("title", ""),
        "author": req.get("author", ""),
        "isbn": req.get("isbn", ""),
        "pages": req.get("pages", 0),
        "genre": req.get("genre", 0),
        "yearPublished": req.get("yearPublished", 0),
        "available": True,
    }
    BOOKS[book_id] = book
    return {"book": book}


def get_book(req: dict) -> dict:
    book = BOOKS.get(req.get("id", ""))
    if not book:
        raise RPCError("not_found", f"book {req.get('id', '')} not found")
    return {"book": book}


def list_books(req: dict) -> dict:
    results = list(BOOKS.values())

    author_filter = req.get("authorFilter", "")
    if author_filter:
        results = [b for b in results if author_filter.lower() in b["author"].lower()]

    genre_filter = req.get("genreFilter", 0)
    if genre_filter:
        results = [b for b in results if b["genre"] == genre_filter]

    page_size = req.get("pageSize", 0) or 20
    results = results[:page_size]

    return {"books": results, "totalCount": len(results)}


def update_book(req: dict) -> dict:
    book = BOOKS.get(req.get("id", ""))
    if not book:
        raise RPCError("not_found", f"book {req.get('id', '')} not found")

    if req.get("title"):
        book["title"] = req["title"]
    if req.get("author"):
        book["author"] = req["author"]
    if "available" in req:
        book["available"] = req["available"]

    return {"book": book}


def delete_book(req: dict) -> dict:
    if req.get("id", "") not in BOOKS:
        raise RPCError("not_found", f"book {req.get('id', '')} not found")
    del BOOKS[req["id"]]
    return {}


RPC_METHODS = {
    "CreateBook": create_book,
    "GetBook": get_book,
    "ListBooks": list_books,
    "UpdateBook": update_book,
    "DeleteBook": delete_book,
}


class RPCError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message


# ---------------------------------------------------------------------------
# HTML builder
# ---------------------------------------------------------------------------

def collect_protos(proto_dir: Path) -> dict[str, str]:
    protos = {}
    for p in proto_dir.rglob("*.proto"):
        key = str(p.relative_to(proto_dir))
        protos[key] = p.read_text()
    return protos


def build_html() -> str:
    protos_json = json.dumps(collect_protos(PROTO_DIR))
    iife_js = IIFE_PATH.read_text()
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bookstore API Explorer</title>
  <style>html, body, #root {{ margin: 0; height: 100%; }}</style>
</head>
<body>
  <div id="root"></div>
  <script>{iife_js}</script>
  <script>
    ApiExplorer.render({{
      target: document.getElementById("root"),
      protoFiles: {protos_json},
      title: "Bookstore API",
      iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20'/%3E%3C/svg%3E",
      theme: "system",
      baseUrl: window.location.origin,
    }});
  </script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(HTML.encode())

    def do_POST(self):
        path = self.path
        prefix = f"/{SERVICE}/"
        if not path.startswith(prefix):
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"code": "not_found", "message": f"unknown service path: {path}"}).encode())
            return

        method_name = path[len(prefix):]
        handler = RPC_METHODS.get(method_name)
        if not handler:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"code": "not_found", "message": f"unknown method: {method_name}"}).encode())
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length else b"{}"
        try:
            req = json.loads(body) if body.strip() else {}
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"code": "invalid_argument", "message": "invalid JSON"}).encode())
            return

        try:
            resp = handler(req)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(resp).encode())
        except RPCError as e:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"code": e.code, "message": e.message}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Connect-Protocol-Version")
        self.end_headers()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, fmt, *args):
        method = args[0] if args else ""
        if "POST" in str(method):
            print(f"  {args[0]}" if args else "")


if __name__ == "__main__":
    if not IIFE_PATH.exists():
        print(f"Error: {IIFE_PATH} not found. Run 'npm run build:lib' first.")
        raise SystemExit(1)
    if not PROTO_DIR.exists():
        print(f"Error: {PROTO_DIR} not found.")
        raise SystemExit(1)

    seed_books()
    HTML = build_html()
    print(f"Bookstore example server at http://localhost:{PORT}")
    print(f"  Proto files: {PROTO_DIR}")
    print(f"  Seeded {len(BOOKS)} books")
    print(f"  IIFE: {IIFE_PATH} ({IIFE_PATH.stat().st_size // 1024}KB)")
    HTTPServer(("", PORT), Handler).serve_forever()
