# AGENTS - sumaq-yachay

## Quickstart Commands

| Action | Command |
|---|---|
| Install deps | `npm install` |
| Develop | `npm start` (ng serve http://localhost:4200/) |
| Build | `npm run build` |
| Watch build | `npm run watch` |
| Tests | `npm test` (Karma) |
| Deploy | `npm run deploy` (GitHub Pages) |

## Test Runner Notes

- `npm test` runs Angular Karma unit tests
- Vitest (`vitest@^4.0.8`) is a devDependency + `tsconfig.spec.json` config, but Karma is the primary CLI test runner
- If modifying vitest config, sync both `angular.json` and `package.json` scripts

## Build & Deploy

- `npm run build` → `dist/sumaq-yachay/browser/`
- `npm run deploy` → builds + pushes to GitHub Pages via `angular-cli-ghpages`
- Base href: `https://leon84ych.github.io/sumaq-yachay/`

## Project Structure (Feature-Driven DDD)

```
src/app/
├── core/                # Singleton services, Dexie DB, HTTP clients
├── domain/              # Framework-free models, SM-2 algorithm, Zod schemas
├── features/            # Domain-driven feature modules
│   ├── auth/            # Authentication
│   ├── catalog/         # Master index navigation
│   ├── learning-views/  # Definitions, process steppers, timeline ribbons
│   ├── active-recall/   # Spaced repetition, flashcards, cloze quizzes
│   ├── diagram-engine/  # Mermaid.js flowcharts & mind maps
│   └── sync-engine/     # Background sync queue, write-back worker
└── app.routes.ts        # Main standalone routes configuration
```

## Key Conventions (Angular 22+)

- Standalone components are default; no explicit `changeDetection: OnPush` needed
- Signals preferred for local state (`useSignal`, `computed`)
- `input()` / `output()` over decorators
- `NgOptimizedImage` for all static images
- Reactive forms preferred; Signal Forms (`@angular/forms/signals`) stable in v22+
- `providedIn: 'root'` (or `@Service` decorator in v22+) for singleton services

## Environment Configuration

- Edit `src/environments/environment.ts` to set `appsScriptUrl` for Google Apps Script backend
- Two environments: `production` (false/dev, true/prod) and `development`

## Prettier

- Config: `printWidth: 100`, `singleQuote: true`
- Angular HTML parser override: `parser: "angular"` for `.html` files
- Format: `npx prettier --write .`