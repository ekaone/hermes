export type EventMap = Record<string, unknown>;

export interface ListenerOptions {
  priority?: number;
}

export type Listener<T = unknown> = (payload: T) => void | Promise<void>;

export interface ListenerEntry<T = unknown> {
  listener: Listener<T>;
  priority: number;
  once: boolean;
}
