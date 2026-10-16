import { stabilizerActive, type FlightState, type Input } from "./flight";

// Visual reconstruction from Tesla's Roadster rear/underside reference.
// Positions are model coordinates, not published engineering dimensions.
export const THRUSTERS = [
  {
    id: "lift-fl",
    position: [-0.98, 0.25, -2.05],
    direction: [0, -1, 0],
    kind: "lift",
    side: -1,
  },
  {
    id: "lift-fr",
    position: [0.98, 0.25, -2.05],
    direction: [0, -1, 0],
    kind: "lift",
    side: 1,
  },
  {
    id: "lift-rl",
    position: [-0.98, 0.25, 2.05],
    direction: [0, -1, 0],
    kind: "lift",
    side: -1,
  },
  {
    id: "lift-rr",
    position: [0.98, 0.25, 2.05],
    direction: [0, -1, 0],
    kind: "lift",
    side: 1,
  },
  ...[-0.63, -0.21, 0.21, 0.63].map((x, i) => ({
    id: `rear-${i}`,
    position: [x, 0.51, 2.46],
    direction: [0, 0, 1],
    kind: "rear",
    side: Math.sign(x),
  })),
  {
    id: "rcs-left",
    position: [-1.075, 0.57, 0.45],
    direction: [-1, 0, 0],
    kind: "rcs",
    side: -1,
  },
  {
    id: "rcs-right",
    position: [1.075, 0.57, 0.45],
    direction: [1, 0, 0],
    kind: "rcs",
    side: 1,
  },
] as const;

export function thrusterPower(
  index: number,
  state: FlightState,
  input: Input,
  active: boolean,
) {
  if (
    !active ||
    state.pressure <= 0 ||
    state.status === "crashed" ||
    state.status === "complete"
  )
    return 0;
  const nozzle = THRUSTERS[index];
  if (!nozzle) return 0;
  const supply = 0.45 + 0.55 * Math.sqrt(state.pressure / 100);
  const assisting = stabilizerActive(state);
  if (state.rampProgress >= 0) return 0;
  if (nozzle.kind === "rear")
    return input.boost && input.throttle > 0 ? supply : 0;
  if (nozzle.kind === "rcs")
    return state.position.y > 1 &&
      (state.stunt > 0 ||
        (state.flipTimer >= 0 && !state.flipComplete) ||
        (assisting && Math.abs(state.roll) > 0.04 && state.roll * nozzle.side < 0) ||
        input.steer * nozzle.side < 0)
      ? supply * 0.55
      : 0;
  const rolling =
    state.stunt > 0
      ? Math.max(0, Math.sin(state.stunt) * nozzle.side) * 0.65
      : 0;
  const correction = assisting ?
    -Math.sin(state.roll) * nozzle.side * 0.15 +
    Math.sin(state.pitch) * Math.sign(nozzle.position[2]) * 0.1 : 0;
  return (
    Math.max(0, Math.min(1, (input.lift || assisting ? 0.85 : 0) + correction + rolling)) *
    supply
  );
}
