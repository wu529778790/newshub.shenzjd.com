# Repository Guidelines

## Project Structure & Module Organization
`app.vue` and `pages/` contain the Nuxt UI. Reusable Vue components live in `pages/components/`, and shared client helpers belong in `composables/`. Server routes are under `server/api/`; source fetchers such as `server/sources/weibo.ts` and `server/sources/coolapk/index.ts` implement platform-specific scraping. Shared runtime utilities live in `server/utils/` and `server/services/`. Cross-app types, constants, and metadata belong in `shared/`. Cached source payloads are stored in `data/cache/`, static assets in `public/`, and deployment config in `Dockerfile`, `docker-compose.yml`, `vercel.json`, and `.github/workflows/`.

## Build, Test, and Development Commands
Use `pnpm install` once, then:

- `pnpm dev` starts local development on `http://localhost:3000`.
- `pnpm dev:host` exposes the dev server on `0.0.0.0` for LAN or container testing.
- `pnpm build` creates a production build; `pnpm preview` serves that build locally.
- `pnpm type-check` runs Nuxt type checking and should pass before opening a PR.
- `pnpm test` runs Vitest; `pnpm test:coverage` collects coverage when adding or changing logic.
- `node test-performance.js` and `./verify-optimization.sh` are useful for performance-related changes.

## Coding Style & Naming Conventions
Follow the existing style: 2-space indentation, double quotes in TS, and `<script setup>` in Vue SFCs. Name Vue components in PascalCase (`AppHeader.vue`), composables as `useX.ts`, and source adapters with platform-oriented file names (`server/sources/zhihu.ts`). Keep API handlers thin and move fetch, cache, validation, or transformation logic into `server/utils/` or `server/services/`. Tailwind utility classes and DaisyUI components are the current UI conventions.

## Testing Guidelines
Vitest is configured through `vitest.config.ts` with the Nuxt test environment. Add new tests as `*.test.ts` files near the code they cover or in a nearby module folder. Prioritize tests for `server/utils/`, `shared/`, and source parsing logic; UI-only changes should include manual verification notes if no automated test is added. There is no meaningful committed test suite yet, so new functionality should add targeted coverage instead of expanding ad hoc scripts.

## Commit & Pull Request Guidelines
Recent history follows short Conventional Commit prefixes with concise Chinese summaries, for example `feat: 实现直接打开API链接功能` and `refactor: 优化前端加载逻辑`. Prefer `feat:`, `fix:`, and `refactor:` with one focused change per commit. PRs should describe user-visible behavior, list affected sources or endpoints, link related issues, and include screenshots for UI changes. For scraper or cache changes, include the verification command used and any environment variables touched, such as `SITE_URL`, `REDIS_URL`, or `API_SECRET`.
