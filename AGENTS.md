# Repository Guidelines

This Angular 17 + LiveKit meeting client favors modular Standalone components. Follow these practices to stay consistent.

## Project Structure & Module Organization
- `src/app/core` holds shared models, services, guards, and HTTP interceptors; keep anything reusable or stateful here.
- Feature modules live under `src/app/features/*` (auth, meeting, chat, recordings). Each feature owns its routing and UI assets in its folder; shared atoms live under `src/app/shared`.
- Runtime configuration resides in `src/environments`, static assets under `src/assets`, and deployment scaffolding (Angular config, tsconfig, proxy settings) sits at the repo root. Place large media samples under `recording/` to keep `public/` lightweight.

## Build, Test, and Development Commands
- `npm install` – install dependencies pinned in `package-lock.json`.
- `npm start` or `ng serve` – launch the dev server on `http://localhost:4200` with the LiveKit proxy defined in `proxy.conf.json`.
- `npm run serve` – same as start but bound to `0.0.0.0:4200` for container access.
- `npm run watch` – incremental rebuild loop for rapid UI tweaks.
- `npm run build` – production build targeting `dist/zhck-meeting-frontend`.
- `npm test` – execute Karma/Jasmine unit tests in Chrome; append `-- --code-coverage` when auditing coverage.

## Coding Style & Naming Conventions
Use 2-space indentation, TypeScript strict mode, and Angular’s Standalone pattern. Prettier (printWidth 100, single quotes) formats TS/HTML; run it before pushing. Name components `feature-name.component.ts`, services `*.service.ts`, and append `$` to Observable fields (e.g., `participants$`).

## Testing Guidelines
Tests live alongside code (`*.spec.ts`). Mock LiveKit clients and Socket.IO gateways via Angular TestBed providers to isolate UI logic. Cover stateful services (meeting control, recordings) plus RxJS stream transformations. Keep smoke tests for each Standalone feature component and add accessibility assertions (focus traps, keyboard shortcuts) when altering overlays.

## Commit & Pull Request Guidelines
Write present-tense, imperative commit subjects under 72 characters; prefix scope when useful (`feat(meeting-room): add dynamic grid`). Group related changes per commit and reference issue IDs in the body. PRs must include a concise change summary, screenshots or short clips for UI updates, reproduction steps, and a checklist confirming `npm test` and `npm run build` both pass.

## Security & Configuration Tips
Never commit LiveKit API keys or room tokens—consume them via runtime env vars mapped in `environment*.ts`. Use `proxy.conf.json` for local HTTPS-to-HTTP bridging instead of hardcoding service URLs. Review `angular.json` assets before adding large recordings; prefer cloud storage links. Sanitize user-facing strings in chat/meeting modules by routing them through shared pipes or Angular’s built-in sanitizers.
