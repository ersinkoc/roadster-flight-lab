import {
  initialState,
  missions,
  stepFlight,
  type FlightState,
  type Input,
} from "./flight";
import { STUNT_RAMP } from "./stunt-ramp";
export function createStuntReplay() {
  const mission = missions.find((m) => m.id === "stunt")!;
  let state = initialState();
  state.position.x = STUNT_RAMP.x;
  state.message =
    "STUNT REPLAY — inverted climb, flip, attitude recovery, and landing.";
  const frames: { state: FlightState; input: Input }[] = [];
  for (let i = 0; i <= 1200; i++) {
    const input: Input = {
      throttle: state.stuntLaunched ? (state.position.y < 10 ? -1 : 0) : 1,
      steer: 0,
      lift: false,
      descend: false,
      boost: false,
    };
    frames.push({ state, input });
    if (state.status === "complete" || state.status === "crashed") break;
    state = stepFlight(state, input, 1 / 60, mission, false);
  }
  return frames;
}
export const STUNT_REPLAY = createStuntReplay();
export const STUNT_REPLAY_DURATION =
  STUNT_REPLAY[STUNT_REPLAY.length - 1].state.elapsed;
