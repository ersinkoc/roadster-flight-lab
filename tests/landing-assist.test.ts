import { describe, expect, test } from "bun:test";
import { initialState, missions, stepFlight, stabilizerActive, rampHeight, type FlightState, type Input } from "../lib/flight";
import { THRUSTERS, thrusterPower } from "../lib/thrusters";
import { airBurstLevel } from "../lib/air-audio";

const idle: Input = { throttle: 0, steer: 0, lift: false, descend: false, boost: false };
const falling = (): FlightState => ({ ...initialState(), status: "flying",
  position: { x: 50, y: 8, z: 0 }, vertical: -16, roll: 0.4, pitch: -0.15 });
function descend(pressure: number) {
  let state = { ...falling(), position: { x: 50, y: 12, z: 0 }, pressure };
  for (let i = 0; i < 600 && state.position.y > 0 && state.status !== "crashed"; i++)
    state = stepFlight(state, idle, 1 / 60, missions[0], true);
  return state;
}

describe("automatic landing assistance", () => {
  test("a normal flight brakes its descent and levels the body without pilot lift", () => {
    const before = falling();
    const after = stepFlight(before, idle, 0.05, missions[0], true);
    expect(after.vertical).toBeGreaterThan(before.vertical);
    expect(after.pressure).toBeLessThan(before.pressure);
    expect(Math.abs(after.roll)).toBeLessThan(Math.abs(before.roll));
    expect(Math.abs(after.pitch)).toBeLessThan(Math.abs(before.pitch));
    expect(after.message).toContain("LANDING ASSIST");
  });
  test("a recoverable fall lands safely, while an empty tank cannot save it", () => {
    const saved = descend(100);
    expect(saved.status).toBe("landed");
    expect(saved.position.y).toBe(0);
    expect(saved.pressure).toBeLessThan(100);
    expect(descend(0).status).toBe("crashed");
  });
  test("clearance is measured from the ramp surface", () => {
    const state = { ...falling(), position: { x: 0, y: rampHeight(0, -60) + 8, z: -60 } };
    expect(stabilizerActive(state)).toBe(true);
  });
  test("automatic lift, corrective side jets and pneumatic audio share the assist", () => {
    const state = falling();
    const powers = THRUSTERS.map((_, i) => thrusterPower(i, state, idle, true));
    expect(powers[0]).toBeGreaterThan(0);
    expect(powers[1]).toBeGreaterThan(0);
    expect(powers[0]).not.toBe(powers[1]);
    expect(powers.slice(4, 8).every((power) => power === 0)).toBe(true);
    expect(powers.slice(8).some((power) => power > 0)).toBe(true);
    expect(airBurstLevel(state, idle, true)).toBeGreaterThan(0);
  });
  test("gentle approaches, ascent, high flight, an empty tank and terminal runs stay unassisted", () => {
    for (const state of [
      { ...falling(), vertical: -2 }, { ...falling(), vertical: 5 },
      { ...falling(), position: { x: 50, y: 50, z: 0 } },
      { ...falling(), pressure: 0 }, { ...falling(), rampProgress: 1 },
      { ...falling(), status: "crashed" as const }, { ...falling(), status: "complete" as const },
    ]) expect(stabilizerActive(state)).toBe(false);
  });
});
