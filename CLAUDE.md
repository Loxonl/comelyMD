# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Run the app locally: `go run .`
  - Defaults to `PORT=18080` and `DB_PATH=./data/app.db`.
  - Visit `http://localhost:18080`.
- Run all tests: `go test ./...`
- Run one package's tests: `go test ./render` or `go test ./storage`
- Run one test by name: `go test ./storage -run TestName`
- Run race-enabled tests: `go test -race ./...`
- Run coverage: `go test -cover ./...`
- Static checks: `go vet ./...`
- Format Go files: `gofmt -w path/to/file.go`
- Build binary: `go build -o mdshare .`
- Build and run development container: `docker-compose -f docker-compose.dev.yml up -d --build`
- Run published image: `docker-compose up -d`

## Runtime Configuration

- `PORT`: HTTP port, default `18080`.
- `DB_PATH`: SQLite database path, default `./data/app.db`; `main.go` creates `./data` when using the default path.
- Docker Compose mounts `./data` to persist SQLite data outside the container.

## Architecture

ComelyMD is a small Go 1.21 Markdown sharing service built on `net/http` and SQLite.

- `main.go` wires runtime configuration, initializes SQLite through `storage.InitDB`, then starts the HTTP server through `handler.Run`.
- `handler/server.go` owns route registration and server timeouts. Routes are intentionally minimal: `/` for the editor page, `/api/pages` for page creation, `/p/` for shared-page viewing, and `/static/` for assets.
- `handler/api.go` contains request handling for the product flow:
  - Parses form or multipart submissions with a 5 MB body limit.
  - Converts Markdown to sanitized HTML before persistence.
  - Supports burn-after-read, optional generated passwords, and fixed expiration windows.
  - Renders `templates/*.html` through the package-level parsed template set.
- `render/markdown.go` is the Markdown security boundary. It uses Goldmark with GFM and unsafe HTML enabled, then sanitizes with Bluemonday. Math spans/blocks are temporarily replaced before Markdown conversion and restored after sanitization as escaped text so KaTeX-style syntax survives without becoming executable HTML.
- `storage/database.go` is the persistence layer. It keeps a package-level `*sql.DB`, creates or migrates the `pages` table on startup, periodically deletes expired rows, and enforces expiration again during reads. `storage/idgen.go` generates cryptographically random Base62 IDs and passwords.
- Frontend assets are server-rendered templates plus static files. Client-side Markdown enhancements, theme behavior, code highlighting, KaTeX/Mermaid display, and page actions live under `templates/` and `static/` rather than a JS build pipeline.
- `userscript/` is a separate browser userscript integration that posts Markdown into `/api/pages`; keep API compatibility in mind when changing creation semantics or CORS behavior.

## Security-Sensitive Areas

- `render.MarkdownToHTML` controls untrusted Markdown/HTML sanitization; changes here can create XSS risk.
- `handler.CreatePageHandler` accepts cross-origin form posts for the userscript integration and currently sets permissive CORS for `/api/pages`.
- Shared page HTML is rendered as `template.HTML` only after server-side sanitization; do not bypass the render pipeline for user content.
- Database access uses parameterized SQL; keep it that way for IDs, passwords, and page content.

## Project Notes

- The module name is `mdshare`, so internal imports use paths like `mdshare/handler`.
- The project has no test files at the time this document was created; `go test ./...` should still be used as the baseline regression check.
- The Dockerfile is a multi-stage build using `CGO_ENABLED=0` with `modernc.org/sqlite`, so it does not require CGO-enabled SQLite bindings.
