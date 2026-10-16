import { describe, expect, test } from "bun:test";
import { initialState, missions, stepFlight, type Input } from "../lib/flight";
import { STUNT_RAMP } from "../lib/stunt-ramp";

const idle: Input = { throttle: 0, steer: 0, lift: false, descend: false, boost: false };
const frame = (x: number, y: number, z: number, heading: number, speed = 80, vertical = 0) =>
  stepFlight({ ...initialState(), position: { x, y, z }, heading, speed, vertical, status: "flying" }, idle, 0.05, missions[0], true);

describe("solid roads and ramps", () => {
  test("the curved ramp blocks a fast flight through its upright section", () => {
    const hit = frame(STUNT_RAMP.x, 18, -42, 0);
    expect(hit.status).toBe("crashed");
    expect(hit.position.z).toBeGreaterThan(-46);
    expect(hit.speed).toBe(0);
  });
  test("the overhead deck blocks ascent from underneath", () => {
    const hit = frame(STUNT_RAMP.x, 34, -31, 0, 0, 14);
    expect(hit.status).toBe("crashed");
    expect(hit.position.y).toBeLessThan(34.6);
  });
  test("the stunt ramp supports block high-speed crossings", () => {
    const hit = frame(STUNT_RAMP.x + 7, 10, -26, 0);
    expect(hit.status).toBe("crashed");
    expect(hit.position.z).toBeGreaterThan(-29);
  });
  test("the training ramp side cannot lift a car through its wall", () => {
    const hit = frame(11, 0, -60, -Math.PI / 2);
    expect(hit.status).toBe("crashed");
    expect(hit.position.x).toBeGreaterThan(8);
    expect(hit.position.y).toBe(0);
  });
  test("the tall rear edge of the training ramp is solid", () => {
    const hit = frame(0, 1, -69, Math.PI);
    expect(hit.status).toBe("crashed");
    expect(hit.position.z).toBeLessThan(-65);
  });
  test("a flight above the overhang remains unobstructed", () => {
    expect(frame(STUNT_RAMP.x, 42, -26, 0).status).toBe("flying");
  });
  test("the road catches a descending car instead of letting it fall through", () => {
    const landed = frame(0, 0.1, 20, 0, 0, -2);
    expect(landed.position.y).toBe(0);
    expect(landed.vertical).toBe(0);
    expect(landed.status).toBe("landed");
  });
  test("a valid stunt remains playable with 50 ms physics steps", () => {
    let state = initialState();
    state.position.x = STUNT_RAMP.x;
    const mission = missions.find((m) => m.id === "stunt")!;
    for (let i = 0; i < 400 && state.status !== "complete" && state.status !== "crashed"; i++) {
      state = stepFlight(state, { ...idle,
        throttle: state.stuntLaunched ? (state.position.y < 10 ? -1 : 0) : 1,
      }, 0.05, mission, false);
    }
    expect(state.status).toBe("complete");
    expect(state.flipComplete).toBe(true);
  });
});
