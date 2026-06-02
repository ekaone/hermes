import { describe, it, expect, vi } from "vitest";
import { matchesWildcard } from "../src/wildcard.js";
import { HermesEmitter } from "../src/index.js";

describe("matchesWildcard — exact patterns", () => {
  it("matches identical strings", () => {
    expect(matchesWildcard("user.created", "user.created")).toBe(true);
  });

  it("does not match different strings", () => {
    expect(matchesWildcard("user.created", "user.deleted")).toBe(false);
  });

  it("matches a bare string with no dots", () => {
    expect(matchesWildcard("ping", "ping")).toBe(true);
  });
});

describe("matchesWildcard — single-segment wildcard (*)", () => {
  it("user.* matches user.created", () => {
    expect(matchesWildcard("user.*", "user.created")).toBe(true);
  });

  it("user.* matches user.deleted", () => {
    expect(matchesWildcard("user.*", "user.deleted")).toBe(true);
  });

  it("user.* does NOT match user.a.b (multi-segment)", () => {
    expect(matchesWildcard("user.*", "user.a.b")).toBe(false);
  });

  it("user.* does NOT match order.created (wrong prefix)", () => {
    expect(matchesWildcard("user.*", "order.created")).toBe(false);
  });

  it("user.* does NOT match user alone (missing segment)", () => {
    expect(matchesWildcard("user.*", "user")).toBe(false);
  });

  it("* matches any bare segment without dots", () => {
    expect(matchesWildcard("*", "anything")).toBe(true);
  });

  it("* does NOT match dotted events", () => {
    expect(matchesWildcard("*", "user.created")).toBe(false);
  });

  it("a.*.c matches a.x.c", () => {
    expect(matchesWildcard("a.*.c", "a.x.c")).toBe(true);
  });

  it("a.*.c does NOT match a.x.y.c", () => {
    expect(matchesWildcard("a.*.c", "a.x.y.c")).toBe(false);
  });
});

describe("HermesEmitter — wildcard integration", () => {
  type Events = {
    "user.created": { id: string };
    "user.deleted": { id: string };
    "order.placed": { total: number };
  };

  it("wildcard listener fires for all matching events", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("user.*", fn);
    bus.emit("user.created", { id: "1" });
    bus.emit("user.deleted", { id: "2" });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("wildcard listener does not fire for non-matching events", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("user.*", fn);
    bus.emit("order.placed", { total: 99 });
    expect(fn).not.toHaveBeenCalled();
  });

  it("wildcard and exact listeners both fire for the same event", () => {
    const bus = new HermesEmitter<Events>();
    const wildFn = vi.fn();
    const exactFn = vi.fn();
    bus.on("user.*", wildFn);
    bus.on("user.created", exactFn);
    bus.emit("user.created", { id: "1" });
    expect(wildFn).toHaveBeenCalledOnce();
    expect(exactFn).toHaveBeenCalledOnce();
  });

  it("wildcard listener receives the correct payload", () => {
    const bus = new HermesEmitter<Events>();
    const fn = vi.fn();
    bus.on("user.*", fn);
    bus.emit("user.created", { id: "abc" });
    expect(fn).toHaveBeenCalledWith({ id: "abc" });
  });
});
