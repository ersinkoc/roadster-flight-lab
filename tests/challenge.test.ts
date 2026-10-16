import { expect, test } from "bun:test";
import { flightMedal, initialState, missions, stepFlight, type Input } from "../lib/flight";
const mission = missions.find(m => m.id === "air-slalom")!;
const idle: Input = { throttle: 0, steer: 0, lift: false, descend: false, boost: false };
function pass(x: number, combo = 0, free = false) {
  const gate = mission.gates[0];
  return stepFlight({ ...initialState(), position: { x, y: gate.y, z: gate.z + 1 },
    speed: 40, pressure: 50, combo }, idle, 0.05, mission, free);
}
test("perfect passes chain points and recover pressure, capped at five", () => {
  const first = pass(0), chained = pass(0, 4), capped = pass(0, 5);
  expect(first.nextGate).toBe(1);
  expect(first.score).toBe(800);
  expect(first.pressure).toBeGreaterThan(55);
  expect(first.perfectGates).toBe(1);
  expect(chained.score).toBe(1600);
  expect(capped.score).toBe(chained.score);
});
test("edge passes break the combo; misses and free flight do not award points", () => {
  expect(pass(7, 4).combo).toBe(0);
  expect(pass(7, 4).score).toBe(600);
  expect(pass(12, 4).score).toBe(0);
  expect(pass(0, 4, true).score).toBe(0);
});
test("medals require completion and reward accuracy and time", () => {
  expect(flightMedal(initialState(), mission)).toBeNull();
  const done = { ...initialState(), status: "complete" as const, elapsed: 50, perfectGates: 5 };
  expect(flightMedal(done, mission)).toBe("GOLD");
  expect(flightMedal({ ...done, elapsed: 100 }, mission)).toBe("SILVER");
  expect(flightMedal({ ...done, perfectGates: 0 }, mission)).toBe("BRONZE");
});
test("slalom can be flown from the runway to a gold landing using normal controls", () => {
  let s = initialState();
  for (let frame=0;frame<6600 && s.status!=="complete" && s.status!=="crashed";frame++) {
    const target = mission.gates[s.nextGate] || mission.landing;
    const dx=target.x-s.position.x, dz=target.z-s.position.z;
    const desiredHeading=Math.atan2(dx,-dz);
    const error=Math.atan2(Math.sin(desiredHeading-s.heading),Math.cos(desiredHeading-s.heading));
    const landing=s.nextGate===mission.gates.length;
    const verticalTarget=Math.max(-4,Math.min(4,(target.y-s.position.y)*0.85));
    s=stepFlight(s, {
      throttle: landing && Math.hypot(dx,dz)<s.speed*s.speed/50+12 ? -1 : s.speed<23 ? 1 : 0,
      steer: Math.max(-1,Math.min(1,error*3)), lift: s.vertical<verticalTarget && (!landing || s.position.y>0.3),
      descend:false, boost:false,
    },1/60,mission,false);
  }
  expect(s.status).toBe("complete");
  expect(s.nextGate).toBe(7);
  expect(s.pressure).toBeGreaterThan(0);
  expect(flightMedal(s,mission)).toBe("GOLD");
});
