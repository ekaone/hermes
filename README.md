# @ekaone/hermes

> Typed zero-dependency in-process event bus with wildcards, priority ordering, and async emit.

## What it is
It's is purely in-process and in-memory:

- No I/O - nothing touches the network, disk, or any external system
- No persistence - listeners and events live only for the lifetime of the HermesEmitter instance; everything is gone when the instance is GC'd or the process exits
- No cross-process communication - two separate Node.js processes (or two browser tabs) each get their own isolated bus; emitting in one has zero effect on the other
- No serialization - payloads are passed as live JavaScript object references, never stringified

## What it's good for

- Decoupling modules within a single Node.js process (or browser page)
- Replacing direct function calls / callbacks with a pub/sub pattern
- Framework-style plugin hooks (priority ordering makes this especially useful)

## What it's NOT

A message broker (no Redis, RabbitMQ, etc.)
A WebSocket event system
A cross-tab/cross-worker bus
A durable event queue

[![npm](https://img.shields.io/npm/v/@ekaone/hermes)](https://www.npmjs.com/package/@ekaone/hermes)
[![license](https://img.shields.io/npm/l/@ekaone/hermes)](./LICENSE)

---

## Installation

```bash
npm install @ekaone/hermes
# or
pnpm add @ekaone/hermes
# or
yarn add @ekaone/hermes
```

---

## Quick Start

```typescript
import { HermesEmitter } from "@ekaone/hermes";

type AppEvents = {
  "user.created": { id: string; name: string };
  "user.deleted": { id: string };
  "order.placed": { orderId: string; total: number };
};

const bus = new HermesEmitter<AppEvents>();

// Typed listener - payload is inferred as { id: string; name: string }
bus.on("user.created", (user) => {
  console.log("User created:", user.name);
});

// Wildcard listener - catches all user.* events
bus.on("user.*", (payload) => {
  console.log("User event:", payload);
});

// Emit - type-checked at the call site
bus.emit("user.created", { id: "1", name: "Alice" });
```

---

## API Reference

### `on(event, listener, options?)`

Subscribe to an event. Returns `this` for chaining.

```typescript
bus.on("order.placed", (order) => {
  console.log(order.total);
});

// With priority
bus.on("order.placed", handler, { priority: 10 });
```

### `once(event, listener, options?)`

Single-fire subscription. The listener is automatically removed after its first invocation - regardless of which matching event triggered it.

```typescript
bus.once("user.created", (user) => {
  console.log("First user ever:", user.name);
});
```

### `off(event, listener)`

Remove a specific listener. Uses **exact pattern string equality** - the event string must match exactly what was passed to `on` / `once`.

```typescript
const handler = (user: { id: string; name: string }) => { /* ... */ };
bus.on("user.created", handler);
bus.off("user.created", handler); // removed
```

If the same function reference was registered multiple times, only the first occurrence is removed.

### `clear(event?)`

Remove all listeners for a specific event key, or all listeners if called with no argument.

```typescript
bus.clear("user.created");  // removes all listeners for "user.created"
bus.clear("user.*");        // removes all listeners for the "user.*" pattern bucket
bus.clear();                // removes everything
```

`clear` uses exact key matching - `clear("user.*")` does **not** clear `user.created`.

### `emit(event, payload)`

Synchronous emit. Calls all matching listeners (exact key and wildcard patterns) in priority order.

```typescript
bus.emit("user.created", { id: "1", name: "Alice" });
```

### `emitAsync(event, payload)`

Async emit. Awaits each listener sequentially in priority order. **Fail-fast**: if any listener throws or rejects, the error is re-thrown immediately and remaining listeners are skipped.

```typescript
await bus.emitAsync("order.placed", { orderId: "x", total: 99 });
```

### `listeners(event)`

Returns the array of listener functions registered under the **exact** event key. Wildcard patterns are not expanded.

```typescript
const fns = bus.listeners("user.created");
// returns listeners registered under "user.created" only,
// NOT those registered under "user.*"
```

### `eventNames()`

Returns all registered event keys **verbatim** - wildcard patterns are returned as-is.

```typescript
bus.on("user.*", handler);
bus.on("user.created", handler);
bus.eventNames(); // ["user.*", "user.created"]
```

---

## Wildcard Patterns

Hermes supports single-segment wildcards using `*`.

| Pattern    | Matches              | Does NOT match          |
|------------|----------------------|-------------------------|
| `user.*`   | `user.created`       | `user.a.b`, `order.x`  |
| `*`        | `ping`, `tick`       | `user.created`          |
| `a.*.c`    | `a.x.c`              | `a.x.y.c`              |

`**` (multi-segment glob) is planned for v0.2.0.

Wildcards work in `on`, `once`, and `off`. All use **exact pattern string equality** - `off("user.*", fn)` only removes listeners registered under `"user.*"`, not those under `"user.created"`.

```typescript
const handler = (payload: unknown) => { /* ... */ };

bus.on("user.*", handler);
bus.emit("user.created", { id: "1" }); // fires handler
bus.emit("user.deleted", { id: "2" }); // fires handler

bus.off("user.*", handler);            // removes handler
bus.emit("user.created", { id: "3" }); // handler NOT called
```

---

## Priority Ordering

Higher `priority` numbers fire first. Default is `0`. Listeners at the same priority execute in registration order (FIFO).

```typescript
bus.on("tick", () => console.log("B"), { priority: 5 });
bus.on("tick", () => console.log("A"), { priority: 10 });
bus.on("tick", () => console.log("C"), { priority: 0 });

bus.emit("tick", 1);
// Output: A, B, C
```

Priority is respected across wildcard and exact listeners that match the same emitted event.

---

## TypeScript Usage

Define an `EventMap` and pass it as the generic to get fully-typed listeners and emit calls.

```typescript
import { HermesEmitter } from "@ekaone/hermes";
import type { EventMap } from "@ekaone/hermes";

type AppEvents = {
  "user.created": { id: string; name: string };
  "user.deleted": { id: string };
  "order.placed": { orderId: string; total: number };
  ping: string;
};

const bus = new HermesEmitter<AppEvents>();

// Fully typed - IDE infers payload as { id: string; name: string }
bus.on("user.created", (user) => {
  console.log(user.name); // ✓ typed
  console.log(user.total); // ✗ TypeScript error
});

// Wildcard - payload is unknown (pattern not in EventMap)
bus.on("user.*", (payload) => {
  console.log(payload); // unknown - narrow as needed
});

// Emit is type-checked
bus.emit("user.created", { id: "1", name: "Alice" }); // ✓
bus.emit("user.created", { id: "1" });                 // ✗ missing name
```

You can share a single `EventMap` type across your application to keep events consistent:

```typescript
// events.ts
export type AppEvents = {
  "user.created": { id: string; name: string };
};

export const bus = new HermesEmitter<AppEvents>();
```

---

## License

MIT © [Eka Prasetia](./LICENSE)

## Links

- [npm Package](https://www.npmjs.com/package/@ekaone/hermes)
- [GitHub Repository](https://github.com/ekaone/hermes)
- [Issue Tracker](https://github.com/ekaone/hermes/issues)

## Related Packages

- [Telepath](https://github.com/ekaone/telepath)
