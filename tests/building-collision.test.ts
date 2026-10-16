import { describe, expect, test } from "bun:test";
import { initialState, missions, stepFlight, type Input } from "../lib/flight";

const idle: Input = { throttle: 0, steer: 0, lift: false, descend: false, boost: false };
const advance = (position: { x: number; y: number; z: number }, heading = 0, vertical = 0) =>
  stepFlight({ ...initialState(), position, heading, speed: 80, vertical, status: "flying" }, idle, 0.05, missions[0], true);

describe("building collision", () => {
  test("a fast sideways approach stops the front of the car outside the wall", () => {
    const hit = advance({ x: 58, y: 0, z: 48 }, Math.PI / 2);
    expect(hit.status).toBe("crashed");
    expect(hit.position.x).toBeLessThan(58.5);
    expect(hit.speed).toBe(0);
    expect(hit.message).toContain("building");
    expect(stepFlight(hit, { ...idle, throttle: 1, lift: true }, 0.05, missions[0], true)).toEqual(hit);
  });

  test("both front and rear walls block the full vehicle", () => {
    for (const [z, heading] of [[60, 0], [36, Math.PI]]) {
      const hit = advance({ x: 74, y: 0, z }, heading);
      expect(hit.status).toBe("crashed");
      expect(Math.abs(hit.position.z - 48)).toBeGreaterThan(9.5);
    }
  });

  test("the roof overhang blocks an airborne approach outside the body footprint", () => {
    const hit = advance({ x: 57, y: 7, z: 48 }, Math.PI / 2);
    expect(hit.status).toBe("crashed");
    expect(hit.position.x).toBeLessThan(57.5);
  });

  test("descending onto the roof cannot enter the building", () => {
    const hit = advance({ x: 74, y: 7.8, z: 48 }, 0, -15);
    expect(hit.status).toBe("crashed");
    expect(hit.position.y).toBeGreaterThan(7.25);
    expect(hit.vertical).toBe(0);
  });

  test("flights above the roof and beside the building stay clear", () => {
    expect(advance({ x: 58, y: 12, z: 48 }, Math.PI / 2).status).toBe("flying");
    expect(advance({ x: 55, y: 3, z: 48 }, 0).status).toBe("flying");
  });
});
