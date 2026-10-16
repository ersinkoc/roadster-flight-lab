import { STUNT_RAMP, stuntRampPoint, smoothRecovery } from "./stunt-ramp";
import { buildingImpact } from "./buildings";
export type Vec3 = { x: number; y: number; z: number };
export type Input = {
  throttle: number;
  steer: number;
  lift: boolean;
  descend: boolean;
  boost: boolean;
  barrel?: boolean;
};
export type Gate = Vec3 & { radius: number };
export type Mission = {
  id: string;
  name: string;
  subtitle: string;
  difficulty: string;
  gates: Gate[];
  landing: Vec3;
  seconds: number;
};
export const missions: Mission[] = [
  {
    id: "first-flight",
    name: "First flight",
    subtitle: "Accelerate. Climb. Defy expectations.",
    difficulty: "BEGINNER",
    seconds: 180,
    gates: [
      { x: 0, y: 7, z: -90, radius: 10 },
      { x: 8, y: 15, z: -200, radius: 11 },
      { x: -10, y: 24, z: -320, radius: 12 },
      { x: 15, y: 17, z: -440, radius: 12 },
      { x: 0, y: 9, z: -560, radius: 12 },
    ],
    landing: { x: 0, y: 0, z: -660 },
  },
  {
    id: "canyon",
    name: "High altitude",
    subtitle: "Fly higher. Be bolder.",
    difficulty: "INTERMEDIATE",
    seconds: 150,
    gates: [
      { x: 0, y: 12, z: -90, radius: 9 },
      { x: 25, y: 32, z: -210, radius: 10 },
      { x: -15, y: 50, z: -340, radius: 10 },
      { x: 25, y: 40, z: -470, radius: 10 },
      { x: 0, y: 18, z: -600, radius: 10 },
    ],
    landing: { x: 0, y: 0, z: -720 },
  },
  {
    id: "precision",
    name: "Precision approach",
    subtitle: "Every meter. Every second.",
    difficulty: "EXPERT",
    seconds: 120,
    gates: [
      { x: 0, y: 8, z: -90, radius: 7 },
      { x: -30, y: 19, z: -180, radius: 8 },
      { x: 35, y: 30, z: -290, radius: 8 },
      { x: -20, y: 20, z: -410, radius: 8 },
      { x: 0, y: 8, z: -530, radius: 7 },
    ],
    landing: { x: 0, y: 0, z: -620 },
  },
  {
    id: "stunt",
    name: "Stunt ramp",
    subtitle: "Go inverted. Flip. Recover. Land.",
    difficulty: "STUNT",
    seconds: 150,
    gates: [],
    landing: { x: STUNT_RAMP.x, y: 0, z: 130 },
  },
];
export type FlightState = {
  position: Vec3;
  heading: number;
  speed: number;
  vertical: number;
  pressure: number;
  elapsed: number;
  nextGate: number;
  score: number;
  peak: number;
  status: "ready" | "flying" | "landed" | "crashed" | "complete";
  message: string;
  roll: number;
  distance: number;
  stunt: number;
  rollHeld: boolean;
  rampProgress: number;
  flipTimer: number;
  pitch: number;
  stuntLaunched: boolean;
  flipComplete: boolean;
};
export function initialState(): FlightState {
  return {
    position: { x: 0, y: 0, z: 24 },
    heading: 0,
    speed: 0,
    vertical: 0,
    pressure: 100,
    elapsed: 0,
    nextGate: 0,
    score: 0,
    peak: 0,
    status: "ready",
    message: "The runway is yours. W to accelerate, SPACE to climb.",
    roll: 0,
    distance: 0,
    stunt: 0,
    rollHeld: false,
    rampProgress: -1,
    flipTimer: -1,
    pitch: 0,
    stuntLaunched: false,
    flipComplete: false,
  };
}
export function stabilizerActive(s: FlightState) {
  return (
    s.stuntLaunched &&
    s.position.y > 0 &&
    s.position.y < 22 &&
    s.vertical < -5 &&
    s.pressure > 0
  );
}
export function rampHeight(x: number, z: number) {
  return Math.abs(x) < 8 && z <= -35 && z >= -65
    ? 6 * ((-z - 35) / 30) ** 2
    : 0;
}
export function stepFlight(
  s: FlightState,
  input: Input,
  delta: number,
  mission: Mission,
  free: boolean,
): FlightState {
  if (s.status === "crashed" || s.status === "complete") return s;
  const dt = Math.max(0, Math.min(delta, 0.05));
  const p = { ...s.position };
  const previous = { ...p };
  let {
    speed,
    heading,
    vertical,
    pressure,
    nextGate,
    score,
    message,
    distance,
  } = s;
  let status: FlightState["status"] = s.status;
  const priorFloor = rampHeight(p.x, p.z);
  const airborne = p.y > priorFloor + 0.05;
  const thrust = (input.lift || stabilizerActive(s)) && pressure > 0;
  const boosted = input.boost && pressure > 0 && input.throttle > 0;
  speed = Math.max(
    0,
    Math.min(
      80,
      speed +
        (input.throttle > 0
          ? boosted
            ? 23
            : 11
          : input.throttle < 0
            ? -28
            : -2.5) *
          dt,
    ),
  );
  const entersRamp =
    !s.stuntLaunched &&
    s.rampProgress < 0 &&
    Math.abs(p.x - STUNT_RAMP.x) < STUNT_RAMP.width / 2 - 1 &&
    p.y < 0.65 &&
    Math.cos(heading) > 0.94 &&
    p.z >= STUNT_RAMP.z &&
    p.z - Math.cos(heading) * speed * dt <= STUNT_RAMP.z;
  if (s.rampProgress >= 0 || entersRamp) {
    if (entersRamp && speed < STUNT_RAMP.minSpeed)
      return {
        ...s,
        status: "crashed",
        message:
          "Not enough speed for the inverted ramp. Approach above 87 km/h.",
      };
    const angle = Math.min(
      STUNT_RAMP.endAngle,
      Math.max(0, s.rampProgress) + (speed / STUNT_RAMP.radius) * dt,
    );
    const next = stuntRampPoint(angle),
      exit = angle >= STUNT_RAMP.endAngle;
    const elapsed = s.elapsed + dt;
    return {
      ...s,
      position: next,
      speed: Math.max(22, speed - 9.81 * Math.sin(angle) * dt),
      vertical: exit ? 2 : 0,
      heading: exit ? Math.PI : 0,
      pitch: angle,
      rampProgress: exit ? -1 : angle,
      flipTimer: exit ? 0 : -1,
      stuntLaunched: exit,
      elapsed,
      peak: Math.max(s.peak, next.y),
      distance: s.distance + speed * dt,
      status: !free && elapsed >= mission.seconds ? "crashed" : "flying",
      message: exit
        ? "Release! Automatic flip and attitude recovery."
        : angle > Math.PI / 2
          ? "INVERTED — suction holding. Keep your line."
          : "CLIMB — suction engaged. Stay on the ramp.",
    };
  }
  heading +=
    input.steer * Math.min(1, speed / 8) * (airborne ? 0.7 : 1.05) * dt;
  if (thrust) {
    vertical += 15 * dt;
    status = "flying";
  } else if (airborne) vertical -= (input.descend ? 17 : 8) * dt;
  else vertical = 0;
  vertical = Math.max(-22, Math.min(14, vertical));
  pressure = Math.max(
    0,
    Math.min(
      100,
      pressure +
        (thrust ? -5.5 : airborne ? -0.25 : 7) * dt -
        (boosted ? 9 * dt : 0),
    ),
  );
  p.x += Math.sin(heading) * speed * dt;
  p.z -= Math.cos(heading) * speed * dt;
  const floor = rampHeight(p.x, p.z);
  if (!airborne && !thrust && priorFloor > 0 && floor === 0 && p.z < -65) {
    vertical = Math.min(14, speed * 0.38);
    status = "flying";
    message = "Liftoff! Use SPACE to control your flight.";
  }
  p.y = Math.min(100, p.y + vertical * dt);
  if (p.y >= 100) vertical = Math.min(0, vertical);
  if (p.y <= floor) {
    p.y = floor;
    if (airborne && vertical < -12) {
      status = "crashed";
      message = "Hard landing. Use SPACE near the ground to slow your descent.";
    } else if (airborne) {
      status = "landed";
      message = "Soft landing. Thruster pressure is recharging on the runway.";
    }
    vertical = 0;
  }
  distance += Math.hypot(p.x - previous.x, p.z - previous.z);
  if (Math.abs(p.x) > 650 || Math.abs(p.z) > 1800) {
    status = "crashed";
    message = "You left the test area. Start a new flight.";
  }
  if (!free && nextGate < mission.gates.length) {
    const g = mission.gates[nextGate];
    // Intersect the swept segment with the ring plane, so fast flights cannot skip gates.
    const travel = p.z - previous.z;
    const t = travel !== 0 ? (g.z - previous.z) / travel : -1;
    if (t >= 0 && t <= 1) {
      const x = previous.x + (p.x - previous.x) * t,
        y = previous.y + (p.y - previous.y) * t;
      if (Math.hypot(x - g.x, y - g.y) < g.radius - 1.1) {
        nextGate++;
        score += 500;
        message =
          nextGate === mission.gates.length
            ? "All rings cleared! Land gently on the marked pad."
            : `Ring ${nextGate}/${mission.gates.length}. Nice flying!`;
      }
    }
  }
  const elapsed = s.elapsed + dt;
  let flipTimer = s.flipTimer,
    flipComplete = s.flipComplete;
  let pitch = Math.max(-0.16, Math.min(0.16, vertical * 0.008));
  if (flipTimer >= 0 && !flipComplete) {
    flipTimer = Math.min(STUNT_RAMP.recoverySeconds, flipTimer + dt);
    pitch =
      Math.PI +
      Math.PI * smoothRecovery(flipTimer / STUNT_RAMP.recoverySeconds);
    if (flipTimer >= STUNT_RAMP.recoverySeconds) {
      flipComplete = true;
      pitch = 0;
      score += 750;
      message =
        "FLIP COMPLETE +750 — attitude stable. Brake and land on the H pad.";
    }
  }
  let stunt = s.stunt;
  if (
    input.barrel &&
    !s.rollHeld &&
    airborne &&
    p.y > 8 &&
    pressure >= 10 &&
    stunt === 0
  ) {
    stunt = 0.001;
    pressure -= 10;
  }
  if (stunt > 0) {
    stunt += dt * 5;
    if (stunt >= Math.PI * 2) {
      stunt = 0;
      if (status !== "crashed") {
        score += 250;
        message = "Barrel roll! +250 points. The sky is your playground.";
      }
    }
  }
  const roll = input.steer * (airborne ? -0.22 : -0.05) + stunt;
  const impact = buildingImpact(previous, p, s, { heading, pitch, roll });
  if (impact) {
    return {
      ...s,
      position: impact,
      heading,
      pitch,
      roll,
      speed: 0,
      vertical: 0,
      elapsed,
      pressure,
      peak: Math.max(s.peak, impact.y),
      distance: s.distance + Math.hypot(impact.x - previous.x, impact.z - previous.z),
      status: "crashed",
      message: "You hit the building. Fly around it or climb above the roof. R to retry.",
    };
  }
  if (!free && status !== "crashed" && elapsed >= mission.seconds) {
    status = "crashed";
    message = "Time is up. Try the course again.";
  }
  if (
    !free &&
    status !== "crashed" &&
    nextGate === mission.gates.length &&
    (mission.id !== "stunt" || flipComplete) &&
    p.y === 0 &&
    speed < 5 &&
    Math.hypot(p.x - mission.landing.x, p.z - mission.landing.z) < 23
  ) {
    status = "complete";
    score += Math.round(
      1000 + pressure * 10 + Math.max(0, mission.seconds - elapsed) * 10,
    );
    message = "Mission complete. You made peace with gravity.";
  }
  return {
    position: p,
    heading,
    speed,
    vertical,
    pressure,
    elapsed,
    nextGate,
    score,
    peak: Math.max(s.peak, p.y),
    status,
    message,
    roll,
    distance,
    stunt,
    rollHeld: !!input.barrel,
    rampProgress: -1,
    flipTimer,
    pitch,
    stuntLaunched: s.stuntLaunched,
    flipComplete,
  };
}
