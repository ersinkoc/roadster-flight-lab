import { describe, expect, test } from "bun:test";
import { initialState, type Input } from "../lib/flight";
import { THRUSTERS, thrusterPower } from "../lib/thrusters";
const idle: Input = {
  throttle: 0,
  steer: 0,
  lift: false,
  boost: false,
  descend: false,
};
describe("directional cold-gas visualization", () => {
  test("lift fires downwards; boost uses the four rear outlets", () => {
    const s = initialState();
    const lift = THRUSTERS.filter(
      (_, i) => thrusterPower(i, s, { ...idle, lift: true }, true) > 0,
    );
    expect(lift).toHaveLength(4);
    expect(lift.every((n) => n.direction[1] === -1)).toBe(true);
    const rear = THRUSTERS.filter(
      (_, i) =>
        thrusterPower(i, s, { ...idle, throttle: 1, boost: true }, true) > 0,
    );
    expect(rear).toHaveLength(4);
    expect(rear.every((n) => n.kind === "rear" && n.direction[2] === 1)).toBe(
      true,
    );
  });
  test("empty, paused and crashed runs cannot emit jets", () => {
    for (const i of THRUSTERS.keys()) {
      expect(
        thrusterPower(
          i,
          { ...initialState(), pressure: 0 },
          { ...idle, lift: true, boost: true, throttle: 1 },
          true,
        ),
      ).toBe(0);
      expect(
        thrusterPower(i, initialState(), { ...idle, lift: true }, false),
      ).toBe(0);
      expect(
        thrusterPower(
          i,
          { ...initialState(), status: "crashed" },
          { ...idle, lift: true },
          true,
        ),
      ).toBe(0);
    }
  });
  test("pressure reduces visible thrust and airborne turns fire the opposing side", () => {
    expect(
      thrusterPower(
        0,
        { ...initialState(), pressure: 20 },
        { ...idle, lift: true },
        true,
      ),
    ).toBeLessThan(
      thrusterPower(0, initialState(), { ...idle, lift: true }, true),
    );
    const s = { ...initialState(), position: { x: 0, y: 10, z: 0 } };
    expect(thrusterPower(8, s, { ...idle, steer: 1 }, true)).toBeGreaterThan(0);
    expect(thrusterPower(9, s, { ...idle, steer: 1 }, true)).toBe(0);
  });
});
