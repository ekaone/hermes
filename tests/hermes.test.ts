import { describe, it, expect, vi } from "vitest";
import { HermesEmitter } from "../src/index.js";
import { HermesError } from "../src/errors.js";

type Events = {
  "user.created": { id: string };
  "user.deleted": { id: string };
  tick: number;
  ping: string;
  noop: undefined;
};

describe("HermesEmitter — on / emit", () => {
  it("calls listener with payload", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.emit("ping", "hello");
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("hello");
  });

  it("calls multiple listeners in registration order", () => {
    const bus = new HermesEmitter<Events>();
    const order: number[] = [];
    bus.on("tick", () => order.push(1));
    bus.on("tick", () => order.push(2));
    bus.emit("tick", 0);
    expect(order).toEqual([1, 2]);
  });

  it("stores the same function reference twice and calls it twice", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.on("ping", fn);
    bus.emit("ping", "hi");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not call listeners registered on a different event", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.emit("tick", 1);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("HermesEmitter — once", () => {
  it("fires exactly once on repeated emits", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.once("ping", fn);
    bus.emit("ping", "first");
    bus.emit("ping", "second");
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith("first");
  });

  it("auto-removes after first call", () => {
    const bus = new HermesEmitter<Events>();
    bus.once("ping", vi.fn());
    bus.emit("ping", "x");
    expect(bus.listeners("ping")).toHaveLength(0);
  });

  it("fires once total when registered on a wildcard pattern", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.once("user.*", fn);
    bus.emit("user.created", { id: "1" });
    bus.emit("user.deleted", { id: "1" });
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("HermesEmitter — off", () => {
  it("removes a specific listener by reference", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.off("ping", fn);
    bus.emit("ping", "x");
    expect(fn).not.toHaveBeenCalled();
  });

  it("removes only the first occurrence when the same ref is registered twice", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.on("ping", fn);
    bus.off("ping", fn);
    bus.emit("ping", "x");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("is a no-op for an unregistered listener", () => {
    const bus = new HermesEmitter<Events>();
    expect(() => bus.off("ping", vi.fn())).not.toThrow();
  });

  it("uses exact pattern string — off('user.created') does not remove 'user.*' listener", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("user.*", fn);
    bus.off("user.created", fn as Parameters<typeof bus.off>[1]);
    bus.emit("user.created", { id: "1" });
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("HermesEmitter — clear", () => {
  it("removes all listeners for a specific event key", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.on("tick", fn);
    bus.clear("ping");
    bus.emit("ping", "x");
    bus.emit("tick", 1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("removes all listeners for all events when called with no argument", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.on("tick", fn);
    bus.clear();
    bus.emit("ping", "x");
    bus.emit("tick", 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it("clears only the exact pattern key, not semantically matched keys", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("user.*", fn);
    bus.on("user.created", fn);
    bus.clear("user.*");
    bus.emit("user.created", { id: "1" });
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("HermesEmitter — listeners / eventNames", () => {
  it("listeners returns functions for an exact key only", () => {
    const bus = new HermesEmitter<Events>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on("user.created", fn1);
    bus.on("user.*", fn2);
    expect(bus.listeners("user.created")).toEqual([fn1]);
  });

  it("listeners returns empty array for unregistered event", () => {
    const bus = new HermesEmitter<Events>();
    expect(bus.listeners("ping")).toEqual([]);
  });

  it("eventNames returns all registered keys verbatim", () => {
    const bus = new HermesEmitter<Events>();
    bus.on("user.*", vi.fn());
    bus.on("user.created", vi.fn());
    bus.on("tick", vi.fn());
    expect(bus.eventNames()).toEqual(["user.*", "user.created", "tick"]);
  });

  it("eventNames removes a key when its last listener is removed", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("ping", fn);
    bus.off("ping", fn);
    expect(bus.eventNames()).toEqual([]);
  });
});

describe("HermesEmitter — HermesError on empty event name", () => {
  it("throws on on('')", () => {
    const bus = new HermesEmitter();
    expect(() => bus.on("" as never, vi.fn())).toThrow(HermesError);
    expect(() => bus.on("" as never, vi.fn())).toThrow("Event name must not be empty.");
  });

  it("throws on once('')", () => {
    const bus = new HermesEmitter();
    expect(() => bus.once("" as never, vi.fn())).toThrow(HermesError);
  });

  it("throws on off('')", () => {
    const bus = new HermesEmitter();
    expect(() => bus.off("" as never, vi.fn())).toThrow(HermesError);
  });

  it("throws on emit('')", () => {
    const bus = new HermesEmitter();
    expect(() => bus.emit("" as never, undefined)).toThrow(HermesError);
  });

  it("throws on emitAsync('')", async () => {
    const bus = new HermesEmitter();
    await expect(bus.emitAsync("" as never, undefined)).rejects.toThrow(HermesError);
  });
});
