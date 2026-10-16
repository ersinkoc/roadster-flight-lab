import type { SolidBox } from "./buildings";

export const STUNT_RAMP = {
  x: -36,
  z: -30,
  radius: 18,
  width: 12,
  endAngle: Math.PI,
  minSpeed: 24,
  recoverySeconds: 1.65,
  releaseClearanceSeconds: 0.18,
};
export function stuntRampPoint(angle: number) {
  return {
    x: STUNT_RAMP.x,
    y: STUNT_RAMP.radius * (1 - Math.cos(angle)),
    z: STUNT_RAMP.z - STUNT_RAMP.radius * Math.sin(angle),
  };
}
export function smoothRecovery(t: number) {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
}

export function flipRecovery(t: number) {
  return smoothRecovery((t - STUNT_RAMP.releaseClearanceSeconds) /
    (STUNT_RAMP.recoverySeconds - STUNT_RAMP.releaseClearanceSeconds));
}

export const STUNT_DECK: SolidBox[] = Array.from({ length: 96 }, (_, i) => {
  const a = (i / 96) * Math.PI, b = ((i + 1) / 96) * Math.PI;
  const start = stuntRampPoint(a), end = stuntRampPoint(b), angle = (a + b) / 2;
  return {
    position: [STUNT_RAMP.x, (start.y + end.y) / 2 - 0.18 * Math.cos(angle),
      (start.z + end.z) / 2 - 0.18 * Math.sin(angle)],
    size: [STUNT_RAMP.width, 0.26, Math.hypot(end.y - start.y, end.z - start.z) + 0.01],
    rotationX: angle,
  };
});

export const STUNT_SUPPORTS: SolidBox[] = [-1, 1].flatMap((side) => [
  { position: [STUNT_RAMP.x + side * 7, 18, STUNT_RAMP.z], size: [0.45, 36, 0.7] },
  { position: [STUNT_RAMP.x + side * 7, 9, STUNT_RAMP.z - 18], size: [0.4, 18, 0.6] },
]);

export const STUNT_RIBS: SolidBox[] = Array.from({ length: 13 }, (_, i) => {
  const a = (i / 12) * Math.PI, p = stuntRampPoint(a);
  return { position: [p.x, p.y - 0.18 * Math.cos(a), p.z - 0.18 * Math.sin(a)],
    size: [STUNT_RAMP.width + 1, 0.32, 0.45], rotationX: a };
});

export const STUNT_RAILS: SolidBox[] = STUNT_DECK.flatMap((part, i) => {
  const a = ((i + 0.5) / STUNT_DECK.length) * Math.PI;
  return [-1, 1].map((side) => ({
    position: [STUNT_RAMP.x + side * (STUNT_RAMP.width / 2 + 0.05),
      part.position[1] + 0.28 * Math.cos(a), part.position[2] + 0.28 * Math.sin(a)] as [number, number, number],
    size: [0.13, 0.13, part.size[2]] as [number, number, number], rotationX: a,
  }));
});
export const STUNT_SOLIDS = [...STUNT_DECK, ...STUNT_SUPPORTS, ...STUNT_RIBS, ...STUNT_RAILS];
// The front wheels ride onto the first shallow section before the rear axle
// reaches the curve. The rest of the structure stays solid during that entry.
export const STUNT_APPROACH_SOLIDS = [...STUNT_DECK.slice(10), ...STUNT_SUPPORTS, ...STUNT_RIBS.slice(1), ...STUNT_RAILS];
