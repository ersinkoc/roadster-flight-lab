import { describe, expect, test } from "bun:test";
import { airBurstLevel } from "../lib/air-audio";
import { initialState, type Input } from "../lib/flight";

const idle: Input = {
  throttle: 0,
  steer: 0,
  lift: false,
  descend: false,
  boost: false,
};
describe("compressed-air audio", () => {
  test("driving alone stays silent, including at top speed", () => {
    expect(
      airBurstLevel(
        { ...initialState(), speed: 80 },
        { ...idle, throttle: 1 },
        true,
      ),
    ).toBe(0);
  });
  test("lift and boost produce air bursts that soften as pressure falls", () => {
    const full = airBurstLevel(initialState(), { ...idle, lift: true }, true);
    expect(full).toBeGreaterThan(0);
    expect(
      airBurstLevel(
        { ...initialState(), pressure: 20 },
        { ...idle, lift: true },
        true,
      ),
    ).toBeLessThan(full);
    expect(
      airBurstLevel(
        initialState(),
        { ...idle, throttle: 1, boost: true },
        true,
      ),
    ).toBeGreaterThan(0);
  });
  test("muting, an empty tank and a finished flight all stay silent", () => {
    const lift = { ...idle, lift: true };
    expect(airBurstLevel(initialState(), lift, false)).toBe(0);
    expect(airBurstLevel({ ...initialState(), pressure: 0 }, lift, true)).toBe(
      0,
    );
    expect(
      airBurstLevel({ ...initialState(), status: "complete" }, lift, true),
    ).toBe(0);
    expect(
      airBurstLevel({ ...initialState(), status: "crashed" }, lift, true),
    ).toBe(0);
  });
});
