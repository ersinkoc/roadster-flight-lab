import { describe, expect, test } from "bun:test";
import {
  initialState,
  missions,
  stepFlight,
  rampHeight,
  type Input,
} from "../lib/flight";
const idle: Input = {
  throttle: 0,
  steer: 0,
  lift: false,
  descend: false,
  boost: false,
};
function simulate(input: Input, frames: number, state = initialState()) {
  for (let i = 0; i < frames; i++)
    state = stepFlight(state, input, 1 / 60, missions[0], true);
  return state;
}
describe("Roadster flight", () => {
  test("accelerates down the runway and launches from its ramp", () => {
    const state = simulate({ ...idle, throttle: 1 }, 270);
    expect(state.speed).toBeGreaterThan(40);
    expect(state.position.z).toBeLessThan(-65);
    expect(state.status).toBe("flying");
    expect(state.position.y).toBeGreaterThan(5);
  });
  test("lift spends pressure, then the ground replenishes it", () => {
    const flying = simulate({ ...idle, lift: true }, 60);
    expect(flying.position.y).toBeGreaterThan(5);
    expect(flying.pressure).toBeLessThan(100);
    const grounded = simulate(idle, 60, { ...initialState(), pressure: 50 });
    expect(grounded.pressure).toBeGreaterThan(50);
  });
  test("an empty tank cannot provide lift or boost", () => {
    const state = stepFlight(
      { ...initialState(), position: { x: 50, y: 10, z: 0 }, pressure: 0 },
      { ...idle, lift: true, boost: true, throttle: 1 },
      0.05,
      missions[0],
      true,
    );
    expect(state.vertical).toBeLessThan(0);
    expect(state.speed).toBeCloseTo(0.55);
    expect(state.pressure).toBe(0);
  });
  test("hard landings end the run; gentle landings stay playable", () => {
    const before = {
      ...initialState(),
      position: { x: 20, y: 0.1, z: 0 },
      vertical: -15,
    };
    expect(stepFlight(before, idle, 0.05, missions[0], true).status).toBe(
      "crashed",
    );
    expect(
      stepFlight({ ...before, vertical: -2 }, idle, 0.05, missions[0], true)
        .status,
    ).toBe("landed");
  });
  test("collects only the next ring through a swept crossing", () => {
    const state = {
      ...initialState(),
      position: { x: 0, y: 7, z: -89 },
      speed: 80,
    };
    const result = stepFlight(state, idle, 0.05, missions[0], false);
    expect(result.nextGate).toBe(1);
    expect(result.score).toBe(500);
    const miss = stepFlight(
      { ...state, position: { x: 30, y: 7, z: -89 } },
      idle,
      0.05,
      missions[0],
      false,
    );
    expect(miss.nextGate).toBe(0);
  });
  test("requires all rings, a gentle landing and low speed to complete", () => {
    const state = {
      ...initialState(),
      position: { ...missions[0].landing },
      nextGate: 5,
    };
    const finished = stepFlight(state, idle, 0.05, missions[0], false);
    expect(finished.status).toBe("complete");
    expect(finished.score).toBeGreaterThan(1000);
    expect(
      stepFlight({ ...state, nextGate: 4 }, idle, 0.05, missions[0], false)
        .status,
    ).not.toBe("complete");
    expect(
      stepFlight({ ...state, speed: 15 }, idle, 0.05, missions[0], false)
        .status,
    ).not.toBe("complete");
    expect(stepFlight(finished, idle, 0.05, missions[0], false).score).toBe(
      finished.score,
    );
  });
  test("mission timeout and arena limits stop the run", () => {
    expect(
      stepFlight(
        { ...initialState(), elapsed: 180 },
        idle,
        0.05,
        missions[0],
        false,
      ).status,
    ).toBe("crashed");
    expect(
      stepFlight(
        { ...initialState(), position: { x: 651, y: 0, z: 0 } },
        idle,
        0.05,
        missions[0],
        true,
      ).status,
    ).toBe("crashed");
  });
  test("background-sized frames cannot teleport the vehicle", () => {
    const state = stepFlight(
      { ...initialState(), speed: 80 },
      idle,
      10,
      missions[0],
      true,
    );
    expect(state.position.z).toBeGreaterThan(19);
    expect(state.elapsed).toBe(0.05);
  });
  test("ramp is bounded to its actual width and length", () => {
    expect(rampHeight(0, -65)).toBe(6);
    expect(rampHeight(9, -65)).toBe(0);
    expect(rampHeight(0, -66)).toBe(0);
  });
  test("barrel roll spends pressure once per press and awards a completed stunt", () => {
    const s = simulate({ ...idle, barrel: true }, 90, {
      ...initialState(),
      position: { x: 0, y: 70, z: 0 },
    });
    expect(s.score).toBe(250);
    expect(s.pressure).toBeLessThan(91);
    expect(s.pressure).toBeGreaterThan(89);
    expect(simulate({ ...idle, barrel: true }, 90).score).toBe(0);
  });
});
