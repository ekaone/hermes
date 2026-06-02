import { describe, it, expect, vi } from "vitest";
import { HermesEmitter } from "../src/index.js";

type Events = { tick: number };

describe("HermesEmitter — priority ordering", () => {
  it("higher priority fires before lower priority", () => {
    const bus = new HermesEmitter<Events>();
    const order: string[] = [];
    bus.on("tick", () => order.push("low"), { priority: 0 });
    bus.on("tick", () => order.push("high"), { priority: 10 });
    bus.emit("tick", 1);
    expect(order).toEqual(["high", "low"]);
  });

  it("negative priority fires after default (0) priority", () => {
    const bus = new HermesEmitter<Events>();
    const order: string[] = [];
    bus.on("tick", () => order.push("default"), { priority: 0 });
    bus.on("tick", () => order.push("last"), { priority: -1 });
    bus.emit("tick", 1);
    expect(order).toEqual(["default", "last"]);
  });

  it("same priority fires in registration order (FIFO)", () => {
    const bus = new HermesEmitter<Events>();
    const order: number[] = [];
    bus.on("tick", () => order.push(1), { priority: 5 });
    bus.on("tick", () => order.push(2), { priority: 5 });
    bus.on("tick", () => order.push(3), { priority: 5 });
    bus.emit("tick", 1);
    expect(order).toEqual([1, 2, 3]);
  });

  it("mixed priorities sort correctly across multiple listeners", () => {
    const bus = new HermesEmitter<Events>();
    const order: string[] = [];
    bus.on("tick", () => order.push("c"), { priority: 1 });
    bus.on("tick", () => order.push("a"), { priority: 100 });
    bus.on("tick", () => order.push("d"), { priority: 0 });
    bus.on("tick", () => order.push("b"), { priority: 50 });
    bus.emit("tick", 1);
    expect(order).toEqual(["a", "b", "c", "d"]);
  });

  it("default priority is 0", () => {
    const bus = new HermesEmitter<Events>();
    const order: string[] = [];
    bus.on("tick", () => order.push("no-opt"));
    bus.on("tick", () => order.push("explicit-0"), { priority: 0 });
    bus.emit("tick", 1);
    expect(order).toEqual(["no-opt", "explicit-0"]);
  });

  it("priority is respected for once listeners", () => {
    const bus = new HermesEmitter<Events>();
    const order: string[] = [];
    bus.once("tick", () => order.push("low"), { priority: 0 });
    bus.once("tick", () => order.push("high"), { priority: 10 });
    bus.emit("tick", 1);
    expect(order).toEqual(["high", "low"]);
  });

  it("priority works across wildcard and exact listeners", () => {
    type WEvents = { "user.created": string };
    const bus = new HermesEmitter<WEvents>();
    const order: string[] = [];
    bus.on("user.*", () => order.push("wildcard"), { priority: 5 });
    bus.on("user.created", () => order.push("exact"), { priority: 10 });
    bus.emit("user.created", "alice");
    expect(order).toEqual(["exact", "wildcard"]);
  });
});
