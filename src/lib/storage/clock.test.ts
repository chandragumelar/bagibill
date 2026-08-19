import { describe, expect, it } from "vitest";
import { createFixedClock, systemClock } from "./clock";

describe("systemClock", () => {
  it("returns a positive integer epoch millisecond value", () => {
    const nowMs = systemClock.now();
    expect(Number.isInteger(nowMs)).toBe(true);
    expect(nowMs).toBeGreaterThan(0);
  });
});

describe("createFixedClock", () => {
  it("always returns the same value when stepMs is not given", () => {
    const clock = createFixedClock(1_000);
    expect(clock.now()).toBe(1_000);
    expect(clock.now()).toBe(1_000);
    expect(clock.now()).toBe(1_000);
  });

  it("advances by stepMs on every call when given", () => {
    const clock = createFixedClock(1_000, 10);
    expect(clock.now()).toBe(1_000);
    expect(clock.now()).toBe(1_010);
    expect(clock.now()).toBe(1_020);
  });

  it("returns exactly the given start value on the first call", () => {
    const clock = createFixedClock(42, 5);
    expect(clock.now()).toBe(42);
  });
});
