import { HermesError } from "./errors.js";
import { matchesWildcard } from "./wildcard.js";
import type { EventMap, Listener, ListenerOptions } from "./types.js";

interface InternalEntry {
  listener: Listener<unknown>;
  priority: number;
  once: boolean;
}

export class HermesEmitter<TMap extends EventMap = EventMap> {
  private readonly _listeners = new Map<string, InternalEntry[]>();

  private _guard(event: string): void {
    if (event === "") {
      throw new HermesError("Event name must not be empty.");
    }
  }

  // Overload 1: typed exact event key
  on<K extends keyof TMap & string>(event: K, listener: Listener<TMap[K]>, options?: ListenerOptions): this;
  // Overload 2: wildcard pattern or any string — payload is unknown
  on(event: string, listener: Listener<unknown>, options?: ListenerOptions): this;
  on(event: string, listener: Listener<unknown>, options?: ListenerOptions): this {
    this._guard(event);
    const bucket = this._listeners.get(event) ?? [];
    bucket.push({ listener, priority: options?.priority ?? 0, once: false });
    this._listeners.set(event, bucket);
    return this;
  }

  once<K extends keyof TMap & string>(event: K, listener: Listener<TMap[K]>, options?: ListenerOptions): this;
  once(event: string, listener: Listener<unknown>, options?: ListenerOptions): this;
  once(event: string, listener: Listener<unknown>, options?: ListenerOptions): this {
    this._guard(event);
    const bucket = this._listeners.get(event) ?? [];
    bucket.push({ listener, priority: options?.priority ?? 0, once: true });
    this._listeners.set(event, bucket);
    return this;
  }

  off<K extends keyof TMap & string>(event: K, listener: Listener<TMap[K]>): this;
  off(event: string, listener: Listener<unknown>): this;
  off(event: string, listener: Listener<unknown>): this {
    this._guard(event);
    const bucket = this._listeners.get(event);
    if (bucket === undefined) return this;
    const idx = bucket.findIndex((e) => e.listener === listener);
    if (idx !== -1) bucket.splice(idx, 1);
    if (bucket.length === 0) this._listeners.delete(event);
    return this;
  }

  clear(event?: string): this {
    if (event !== undefined) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
    return this;
  }

  emit<K extends keyof TMap & string>(event: K, payload: TMap[K]): void {
    this._guard(event);
    for (const { entry, key } of this._collect(event)) {
      this._removeIfOnce(entry, key);
      entry.listener(payload);
    }
  }

  async emitAsync<K extends keyof TMap & string>(event: K, payload: TMap[K]): Promise<void> {
    this._guard(event);
    for (const { entry, key } of this._collect(event)) {
      this._removeIfOnce(entry, key);
      await entry.listener(payload);
    }
  }

  listeners<K extends keyof TMap & string>(event: K): Array<Listener<TMap[K]>> {
    const bucket = this._listeners.get(event) ?? [];
    return bucket.map((e) => e.listener as unknown as Listener<TMap[K]>);
  }

  eventNames(): string[] {
    return Array.from(this._listeners.keys());
  }

  private _collect(event: string): Array<{ entry: InternalEntry; key: string }> {
    const result: Array<{ entry: InternalEntry; key: string }> = [];
    for (const [key, bucket] of this._listeners) {
      if (matchesWildcard(key, event)) {
        for (const entry of bucket) {
          result.push({ entry, key });
        }
      }
    }
    // Stable sort: higher priority first; ties preserve registration order (FIFO)
    result.sort((a, b) => b.entry.priority - a.entry.priority);
    return result;
  }

  private _removeIfOnce(entry: InternalEntry, key: string): void {
    if (!entry.once) return;
    const bucket = this._listeners.get(key);
    if (bucket === undefined) return;
    const idx = bucket.indexOf(entry);
    if (idx !== -1) bucket.splice(idx, 1);
    if (bucket.length === 0) this._listeners.delete(key);
  }
}
