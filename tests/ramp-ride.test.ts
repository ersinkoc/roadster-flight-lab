import { expect, test } from "bun:test";
import { missions } from "../lib/flight";
import { rampRideStart, rampRideInput, stepRampRide } from "../lib/ramp-ride";
const mission=missions.find(m=>m.id==="stunt")!;
test("countdown holds the car and mission timer before the ride",()=>{
  const start=rampRideStart(mission);
  let s=start;
  for(let i=0;i<120;i++) s=stepRampRide(s,1/60,mission);
  expect(s.position).toEqual(start.position);
  expect(s.elapsed).toBe(0);
  expect(s.launchCountdown).toBeCloseTo(1);
  expect(rampRideInput(s).throttle).toBe(0);
});
test("one click ride reaches inversion, recovers and lands without user input",()=>{
  let s=rampRideStart(mission), inverted=false;
  for(let i=0;i<1500&&s.status!=="complete"&&s.status!=="crashed";i++) {
    s=stepRampRide(s,1/60,mission);
    inverted ||= s.rampProgress>Math.PI/2;
  }
  expect(inverted).toBe(true);
  expect(s.flipComplete).toBe(true);
  expect(s.status).toBe("complete");
  expect(rampRideInput(s).throttle).toBe(0);
});
test("invalid negative time cannot advance the countdown",()=>{
  expect(stepRampRide(rampRideStart(mission),-1,mission).launchCountdown).toBe(3);
});
test("a low frame rate does not stretch the assisted ride into slow motion",()=>{
  let s=rampRideStart(mission);
  for(let i=0;i<150&&s.status!=="complete";i++) s=stepRampRide(s,0.1,mission);
  expect(s.status).toBe("complete");
});
