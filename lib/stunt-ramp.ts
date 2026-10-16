export const STUNT_RAMP = {
  x: -36,
  z: -30,
  radius: 18,
  width: 12,
  endAngle: Math.PI,
  minSpeed: 24,
  recoverySeconds: 1.65,
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
