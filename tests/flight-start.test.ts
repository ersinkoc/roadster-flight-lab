import { expect, test } from "bun:test";
import { initialState, missions, stepFlight } from "../lib/flight";
import { STUNT_RAMP } from "../lib/stunt-ramp";
const stunt = missions.find(m => m.id === "stunt")!;
test("free flight starts on its own apron regardless of the selected mission", () => {
  const mission = initialState(missions[0], false);
  const free = initialState(missions[0], true);
  expect(free.position).not.toEqual(mission.position);
  expect(initialState(stunt, true).position).toEqual(free.position);
  expect(mission.position).toEqual({x:0,y:0,z:24});
});
test("the playable roller-coaster start is lined up and holding accelerate reaches inversion", () => {
  let s = initialState(stunt, false);
  expect(s.position.x).toBe(STUNT_RAMP.x);
  let inverted = false;
  for (let i=0;i<1200 && s.status!=="crashed" && s.status!=="complete";i++) {
    s=stepFlight(s,{throttle:s.stuntLaunched ? (s.position.y<10 ? -1 : 0) : 1,
      steer:0,lift:false,descend:false,boost:false},1/60,stunt,false);
    inverted ||= s.rampProgress > Math.PI/2;
  }
  expect(inverted).toBe(true);
  expect(s.flipComplete).toBe(true);
  expect(s.status).toBe("complete");
});
