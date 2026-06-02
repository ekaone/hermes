## Plan Version Roadmap

### v0.1.0 — Foundation ✦ current
- Typed `EventMap` with strict TypeScript, no `any` in public API
- `on`, `once`, `off`, `clear` listener registration
- Single-segment wildcard `*` — e.g. `user.*` matches `user.created`
- Priority ordering — higher number fires first, same priority = FIFO
- Synchronous `emit` — `void` return
- Async `emitAsync` — sequential `for...of`, fail-fast on first rejection
- `listeners(event)` and `eventNames()` introspection — exact key only
- `HermesError` — guards empty string `''` at registration and emit time
- Duplicate listeners stored twice (caller owns the contract)
- `once` + wildcard: remove after first match, regardless of which event triggered it
- `off()` and `clear()` — exact pattern string equality only
- In-memory only, zero dependencies

### v0.2.0 — Power Features
- `**` glob wildcard — multi-segment matching, e.g. `user.**` matches `user.created.bulk`
- `emitAsyncAll` — runs all listeners regardless of errors, collects into `AggregateError`
- `bus.watch(fn)` — global observer intercepting every emit, useful for logging and debugging middleware

### v0.3.0 — DX & Composition
- Typed wildcard inference — `EventMap`-aware, so `user.*` autocompletes based on registered keys
- `pipe(otherBus)` — forward all events from one `HermesEmitter` instance to another
- `replay(event, n?)` — buffer last N payloads and replay to late subscribers

### Future / Separate Package
- `@ekaone/hermes-devtools` — debug wrapper that logs all events with timestamps, payload snapshots, and listener counts; zero impact on production (separate package)