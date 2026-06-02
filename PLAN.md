# @ekaone/hermes — Re-scaffold Plan

> Typed zero-dependency in-process event bus.
> Formerly `@ekaone/signal-bus`. Use this document with Claude Code to restore the full package.

---

## Package Identity

| Field        | Value                        |
|--------------|------------------------------|
| Name         | `@ekaone/hermes`             |
| Former name  | `@ekaone/signal-bus`         |
| Scope        | `@ekaone/`                   |
| Runtime      | Node ≥ 18, ESM + CJS dual    |
| Dependencies | **Zero** (no runtime deps)   |
| License      | MIT                          |

---

## Toolchain

- **Package manager**: pnpm
- **Build**: tsup — dual ESM + CJS output
- **Test**: Vitest
- **TypeScript**: strict mode
- **Publishing**: OIDC trusted publishing, trigger on push tag `v*`
- **Node**: ≥ 18

---

## Core Feature Set

Re-implement all of the following:

### 1. Typed Event Map
- Generic `EventMap` interface: `Record<string, unknown>`
- All methods infer payload type from the map
- Strict TypeScript — no `any` in public API

### 2. Listener Registration
- `on(event, listener, options?)` — subscribe to an event
- `once(event, listener, options?)` — single-fire subscription, auto-removes after first call
- `off(event, listener)` — remove a specific listener
- `clear(event?)` — remove all listeners for an event, or all listeners if no arg

### 3. Wildcard Support
- Pattern: `*` matches any single segment, e.g. `user.*` matches `user.created`, `user.deleted`
- `**` glob is **deferred to v0.2.0** — adds regex complexity and makes `off()`/`once()` semantics ambiguous
- Wildcards work in `on`, `once`, `off`

### 4. Priority Ordering
- `options.priority?: number` on `on` / `once`
- Higher number = earlier execution
- Default priority: `0`
- Listeners at the same priority execute in registration order

### 5. Emit
- `emit(event, payload)` — synchronous emit, calls all matching listeners
- `emitAsync(event, payload)` — async emit, `await`s each listener sequentially via `for...of`; fail-fast on first rejection (re-throws immediately, remaining listeners are skipped). Collect-all / `AggregateError` variant deferred to v0.2.0.

### 6. Listener Introspection
- `listeners(event)` — returns array of registered listeners for an exact event key
- `eventNames()` — returns array of all registered event keys

---

## File Structure to Scaffold

```
packages/hermes/
├── src/
│   ├── index.ts          # Public API re-export
│   ├── hermes.ts         # Core HermesEmitter class
│   ├── types.ts          # EventMap, ListenerOptions, ListenerEntry types
│   ├── wildcard.ts       # Wildcard pattern matching utility
│   └── errors.ts         # HermesError (optional, for invalid patterns)
├── tests/
│   ├── hermes.test.ts    # Core on/off/emit/once tests
│   ├── wildcard.test.ts  # Wildcard matching tests
│   ├── priority.test.ts  # Priority ordering tests
│   └── async.test.ts     # emitAsync tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

---

## `package.json` Spec

```json
{
  "name": "@ekaone/hermes",
  "version": "0.1.0",
  "description": "Typed zero-dependency in-process event bus with wildcards, priority, and async emit",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm build"
  },
  "engines": { "node": ">=18" },
  "devDependencies": {
    "tsup": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

---

## `tsup.config.ts` Spec

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
```

---

## `tsconfig.json` Spec

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

---

## `release.yml` (GitHub Actions — OIDC)

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: "https://registry.npmjs.org"
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

> Note: OIDC provenance via `--provenance`. No `NPM_TOKEN` needed if npm Trusted Publishing is configured — remove the `env` block in that case.

---

## Types Reference (`src/types.ts`)

```ts
export type EventMap = Record<string, unknown>;

export interface ListenerOptions {
  priority?: number; // default: 0, higher = earlier
}

export type Listener<T = unknown> = (payload: T) => void | Promise<void>;

export interface ListenerEntry<T = unknown> {
  listener: Listener<T>;
  priority: number;
  once: boolean;
}
```

---

## Public API Surface (`src/index.ts` exports)

```ts
export { HermesEmitter } from "./hermes";
export type { EventMap, Listener, ListenerOptions } from "./types";
```

---

## Wildcard Matching Logic (`src/wildcard.ts`)

- Convert event pattern to a regex: replace `*` with `[^.]+`, escape dots
- `matchesWildcard(pattern: string, event: string): boolean`
- Single-segment only — `user.*` matches `user.created` but not `user.a.b`
- `**` glob deferred to v0.2.0
- Used internally during emit to find all matching listeners

---

## Test Coverage Targets

| Suite             | What to cover                                                     |
|-------------------|-------------------------------------------------------------------|
| `hermes.test.ts`  | `on`, `off`, `emit`, `once` (fires once, not twice), `clear`      |
| `wildcard.test.ts`| `user.*` matches `user.created`; does not match `user.a.b`        |
| `priority.test.ts`| Higher priority fires before lower; same priority = FIFO          |
| `async.test.ts`   | `emitAsync` awaits each listener sequentially; first rejection re-throws and skips remaining listeners; happy-path resolves `Promise<void>` |

---

## README Outline

1. Install
2. Quick start (typed usage example)
3. API reference: `on`, `once`, `off`, `clear`, `emit`, `emitAsync`, `listeners`, `eventNames`
4. Wildcard patterns
5. Priority ordering
6. TypeScript usage with `EventMap`
7. License

---

## Claude Code Prompt Suggestion

When using this doc with Claude Code, start with:

```
Read PLAN.md and scaffold the full @ekaone/hermes package exactly as specified.
Start with: src/types.ts → src/wildcard.ts → src/hermes.ts → src/index.ts
Then scaffold all test files, then config files (package.json, tsconfig.json, tsup.config.ts, vitest.config.ts).
Do not install dependencies — just create all files.
```