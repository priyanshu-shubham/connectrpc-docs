# API Explorer

Interactive API documentation and testing tool for [ConnectRPC](https://connectrpc.com/) services. Parses `.proto` files at runtime in the browser — no code generation required.

## Features

- **Docs-first**: Schema documentation with field-level comments extracted from proto files
- **Try it out**: Slide-over panel for sending live requests to your ConnectRPC server
- **JSON editor**: CodeMirror 6 with syntax highlighting, bracket matching, JSON validation, and lint markers
- **Search**: Filter methods by name or description
- **Dark mode**: Light / dark / system with one-click toggle
- **Single file**: Builds to a self-contained IIFE (~278KB gzipped) with CSS auto-injected
- **Configurable**: Title, icon, theme, and base URL are all customizable
- **No codegen**: Proto files are parsed at runtime via protobufjs — edit a `.proto`, refresh, done

## Quick Start

### Try the example

The `example/` directory contains a mock BookstoreService server with the API Explorer:

```bash
npm run build:lib              # build the IIFE
python example/server.py       # serves explorer + mock RPC endpoints on :8080
# Open http://localhost:8080
```

You can send real requests (CreateBook, ListBooks, etc.) from the "Try it out" panel.

### Serve with Python

Create a `serve.py` that reads your proto files and embeds them into the explorer:

```python
#!/usr/bin/env python3
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

PROTO_DIR = Path("./proto")
EXPLORER_URL = (
    "https://cdn.jsdelivr.net/gh/priyanshu-shubham/connectrpc-docs@main"
    "/dist/api-explorer.iife.js"
)
PORT = 3000

def collect_protos(proto_dir: Path) -> dict[str, str]:
    protos = {}
    for p in proto_dir.rglob("*.proto"):
        key = str(p.relative_to(proto_dir))
        protos[key] = p.read_text()
    return protos

PROTOS_JSON = json.dumps(collect_protos(PROTO_DIR))

HTML = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Explorer</title>
  <style>html, body, #root {{ margin: 0; height: 100%; }}</style>
</head>
<body>
  <div id="root"></div>
  <script src="{EXPLORER_URL}"></script>
  <script>
    ApiExplorer.render({{
      target: document.getElementById("root"),
      protoFiles: {PROTOS_JSON},
      title: "My API",
      theme: "system",
      baseUrl: window.location.origin,
    }});
  </script>
</body>
</html>
"""

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(HTML.encode())

if __name__ == "__main__":
    print(f"Serving API Explorer at http://localhost:{PORT}")
    HTTPServer(("", PORT), Handler).serve_forever()
```

### Serve from Go

Read the proto files, inject them as JSON into the HTML template, and serve on a route (e.g., `/docs`). The pattern is the same as the Python example.

## Usage via CDN (jsDelivr)

Load the self-contained IIFE from jsDelivr's GitHub endpoint:

```html
<script src="https://cdn.jsdelivr.net/gh/priyanshu-shubham/connectrpc-docs@TAG/dist/api-explorer.iife.js"></script>
<script>
  ApiExplorer.render({
    target: document.getElementById("root"),
    protoFiles: {
      "myservice/v1/service.proto": "syntax = \"proto3\";\n...",
    },
    title: "My API",
    theme: "system",
    baseUrl: "http://localhost:8080",
  });
</script>
```

**URL variants:**

| Pinning   | URL                                                              |
| --------- | ---------------------------------------------------------------- |
| Branch    | `cdn.jsdelivr.net/gh/priyanshu-shubham/connectrpc-docs@main/dist/api-explorer.iife.js` |
| Tag       | `cdn.jsdelivr.net/gh/priyanshu-shubham/connectrpc-docs@v1.0.0/dist/api-explorer.iife.js` |
| Commit    | `cdn.jsdelivr.net/gh/priyanshu-shubham/connectrpc-docs@COMMIT/dist/api-explorer.iife.js` |

## Configuration

`ApiExplorer.render(config)` accepts:

| Property     | Type                           | Default                    | Description                         |
| ------------ | ------------------------------ | -------------------------- | ----------------------------------- |
| `target`     | `HTMLElement`                  | **(required)**             | DOM element to render into          |
| `protoFiles` | `Record<string, string>`       | **(required)**             | Proto file contents keyed by path   |
| `title`      | `string`                       | `"API Explorer"`           | Sidebar header title                |
| `iconUrl`    | `string`                       | Built-in icon              | URL to a custom icon image          |
| `theme`      | `"light" \| "dark" \| "system"` | `"system"`                 | Initial color theme                 |
| `baseUrl`    | `string`                       | `window.location.origin`   | Server URL for ConnectRPC requests  |

Returns `{ unmount(): void }` to clean up when done.

## Development

```bash
npm install
npm run dev       # Start dev server (reads proto files from example/proto/)
```

The Vite dev server:
- Reads `.proto` files from `example/proto/` at page load via a custom Vite plugin
- Proxies ConnectRPC requests to `http://localhost:8080`
- Hot-reloads on source changes

### Build

```bash
# Standalone HTML (for preview)
npm run build
npm run preview

# Library IIFE (single file, for CDN / embedding)
npm run build:lib    # outputs dist/api-explorer.iife.js
```

## Architecture

```
src/
  main.tsx                        Standalone entry (reads protos from DOM)
  App.tsx                         Root component, layout, state
  lib/
    explorer.tsx                  Library entry — exports render()
    explorer-standalone.tsx       IIFE entry — auto-injects CSS
    proto-parser.ts               Parses .proto files via protobufjs
    connect-client.ts             Sends ConnectRPC POST requests
    theme.tsx                     Dark mode context + provider
    types.ts                      ExplorerConfig interface
  components/
    sidebar.tsx                   Service/method navigation + search
    method-docs.tsx               Docs-first view with schema details
    schema-view.tsx               Message type documentation with field comments
    try-it-panel.tsx              Slide-over request/response panel
    json-editor.tsx               CodeMirror 6 JSON editor
    ui/                           shadcn/ui components
example/
  proto/                          Example proto files (BookstoreService)
  server.py                       Mock server for testing the explorer
```
