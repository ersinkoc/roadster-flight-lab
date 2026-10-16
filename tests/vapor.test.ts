import { describe, expect, test } from "bun:test";
import { vaporOpacity } from "../lib/vapor";
describe("white air particle lifecycle", () => {
  test("expired particles have zero opacity, including a frame that overshoots their lifetime", () => {
    for (const kind of [0, 1, 2])
      for (const age of [1, 1.001, 1.1, 2, NaN, Infinity, -0.1])
        expect(vaporOpacity(age, kind)).toBe(0);
  });
  test("live particles fade smoothly and never produce invalid shader values", () => {
    for (const kind of [0, 1, 2]) {
      expect(vaporOpacity(0, kind)).toBe(0);
      expect(vaporOpacity(0.2, kind)).toBeGreaterThan(vaporOpacity(0.8, kind));
      for (let i = 0; i <= 110; i++) {
        const alpha = vaporOpacity(i / 100, kind);
        expect(Number.isFinite(alpha)).toBe(true);
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThanOrEqual(1);
      }
    }
  });
});
