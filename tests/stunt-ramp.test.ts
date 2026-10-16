import { describe, expect, test } from "bun:test";
import {
  initialState,
  missions,
  stepFlight,
  stabilizerActive,
  type Input,
} from "../lib/flight";
import { STUNT_RAMP, stuntRampPoint } from "../lib/stunt-ramp";
import { createStuntReplay } from "../lib/stunt-replay";
const idle: Input = {
  throttle: 0,
  steer: 0,
  lift: false,
  descend: false,
  boost: false,
};
const mission = missions.find((m) => m.id === "stunt")!;
describe("inverted ramp and recovery", () => {
  test("climbs inverted, releases, flips, levels and completes a controlled landing", () => {
    let s = initialState();
    s.position.x = STUNT_RAMP.x;
    let inverted = false,
      aerialRotation = false,
      recovered = false;
    for (const frame of createStuntReplay()) {
      s = frame.state;
      if (s.rampProgress > Math.PI / 2) {
        inverted = true;
        expect(s.position.y).toBeGreaterThan(18);
      }
      if (s.flipTimer > 0 && !s.flipComplete) {
        aerialRotation = true;
        expect(s.pitch).toBeGreaterThan(Math.PI);
      }
      if (s.flipComplete) {
        recovered = true;
        expect(Math.abs(s.pitch)).toBeLessThan(0.2);
      }
    }
    expect(inverted && aerialRotation && recovered).toBe(true);
    expect(s.status).toBe("complete");
    expect(s.score).toBeGreaterThan(1750);
    expect(s.peak).toBeGreaterThan(35);
  });
  test("a slow approach fails instead of passing through the ramp", () => {
    const s = {
      ...initialState(),
      position: { x: STUNT_RAMP.x, y: 0, z: STUNT_RAMP.z + 0.1 },
      speed: 10,
    };
    const result = stepFlight(s, idle, 0.05, mission, false);
    expect(result.status).toBe("crashed");
    expect(result.message).toContain("Not enough speed");
  });
  test("the stunt cannot be completed by driving directly to the landing pad", () => {
    expect(
      stepFlight(
        { ...initialState(), position: { ...mission.landing } },
        idle,
        0.05,
        mission,
        false,
      ).status,
    ).not.toBe("complete");
  });
  test("recovery fires lift jets to arrest the fall without manual lift", () => {
    const s = {
      ...initialState(),
      position: { x: STUNT_RAMP.x, y: 18, z: 50 },
      vertical: -16,
      stuntLaunched: true,
      flipComplete: true,
    };
    expect(stabilizerActive(s)).toBe(true);
    const result = stepFlight(s, idle, 0.05, mission, false);
    expect(result.vertical).toBeGreaterThan(s.vertical);
    expect(result.pressure).toBeLessThan(100);
  });
  test("the rendered arc reaches an upside-down overhang", () => {
    expect(stuntRampPoint(0).y).toBe(0);
    expect(stuntRampPoint(Math.PI / 2).y).toBeCloseTo(18);
    expect(stuntRampPoint(Math.PI).y).toBe(36);
    expect(stuntRampPoint(Math.PI).z).toBeCloseTo(STUNT_RAMP.z);
  });
});
