import { initialState, stepFlight, type FlightState, type Input, type Mission } from "./flight";

const neutral: Input = { throttle: 0, steer: 0, lift: false, descend: false, boost: false };
export function rampRideStart(mission: Mission): FlightState {
  return { ...initialState(mission), launchCountdown: 3,
    message: "RAMP RIDE — get ready. Assisted throttle, lane guidance and landing are enabled." };
}
export function rampRideInput(s: FlightState): Input {
  if ((s.launchCountdown ?? 0) > 0 || s.status === "complete" || s.status === "crashed") return neutral;
  return { ...neutral, throttle: s.stuntLaunched ? (s.position.y < 10 ? -1 : 0) : 1 };
}
export function stepRampRide(s: FlightState, delta: number, mission: Mission): FlightState {
  // Substeps keep the ride responsive on slower devices without widening
  // physics steps or allowing a stalled frame to teleport the vehicle.
  let remaining=Math.max(0,Math.min(delta,0.25));
  while(remaining>1e-8) {
    const dt=Math.min(remaining,1/60);
    if ((s.launchCountdown ?? 0)>0) s={...s,launchCountdown:Math.max(0,s.launchCountdown!-dt)};
    else s=stepFlight(s,rampRideInput(s),dt,mission,false);
    remaining-=dt;
  }
  return s;
}
