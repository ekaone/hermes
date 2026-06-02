import { describe, it, expect, vi } from "vitest";
import { HermesEmitter } from "../src/index.js";

type Events = { step: string; ping: string };

describe("HermesEmitter — emitAsync", () => {
  it("resolves to void when no listeners are registered", async () => {
    const bus = new HermesEmitter<Events>();
    await expect(bus.emitAsync("ping", "x")).resolves.toBeUndefined();
  });

  it("resolves to void on success with listeners", async () => {
    const bus = new HermesEmitter<Events>();
    bus.on("ping", vi.fn());
    await expect(bus.emitAsync("ping", "x")).resolves.toBeUndefined();
  });

  it("awaits each listener sequentially", async () => {
    const bus = new HermesEmitter<Events>();
    const order: number[] = [];

    bus.on("step", async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
      order.push(1);
    });
    bus.on("step", async () => {
      order.push(2);
    });

    await bus.emitAsync("step", "go");
    expect(order).toEqual([1, 2]);
  });

  it("fail-fast: re-throws on first rejection and skips remaining listeners", async () => {
    const bus = new HermesEmitter<Events>();
    const second = vi.fn();

    bus.on("step", async () => {
      throw new Error("boom");
    });
    bus.on("step", second);

    await expect(bus.emitAsync("step", "go")).rejects.toThrow("boom");
    expect(second).not.toHaveBeenCalled();
  });

  it("fail-fast: re-throws synchronous errors from listeners", async () => {
    const bus = new HermesEmitter<Events>();
    bus.on("step", () => {
      throw new Error("sync-boom");
    });
    await expect(bus.emitAsync("step", "go")).rejects.toThrow("sync-boom");
  });

  it("once listener is removed after emitAsync even if it throws", async () => {
    const bus = new HermesEmitter<Events>();
    bus.once("step", async () => {
      throw new Error("once-err");
    });

    await expect(bus.emitAsync("step", "go")).rejects.toThrow("once-err");
    expect(bus.listeners("step")).toHaveLength(0);
  });

  it("respects priority ordering", async () => {
    const bus = new HermesEmitter<Events>();
    const order: string[] = [];
    bus.on("step", async () => { order.push("low"); }, { priority: 0 });
    bus.on("step", async () => { order.push("high"); }, { priority: 10 });
    await bus.emitAsync("step", "go");
    expect(order).toEqual(["high", "low"]);
  });

  it("wildcard listeners are awaited correctly", async () => {
    type WEvents = { "user.created": string; "user.deleted": string };
    const bus = new HermesEmitter<WEvents>();
    const calls: string[] = [];
    bus.on("user.*", async (payload) => { calls.push(`wild:${payload}`); });
    bus.on("user.created", async (payload) => { calls.push(`exact:${payload}`); });
    await bus.emitAsync("user.created", "alice");
    expect(calls).toHaveLength(2);
    expect(calls).toContain("wild:alice");
    expect(calls).toContain("exact:alice");
  });
});
