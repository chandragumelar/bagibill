export interface Clock {
  now(): number;
}

// spec.md 24: a device with a wrong clock must not corrupt ordering — the
// server timestamp is the source of truth, device time is display only. So
// every function that needs "now" takes a Clock instead of reaching for the
// system clock itself, and this is the only place that's allowed to.
export const systemClock: Clock = {
  now(): number {
    return Date.now();
  },
};

export function createFixedClock(startMs: number, stepMs = 0): Clock {
  let currentMs = startMs;
  return {
    now(): number {
      const valueMs = currentMs;
      currentMs += stepMs;
      return valueMs;
    },
  };
}
