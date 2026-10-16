import type { SolidBox } from "./buildings";

export function trainingRampHeight(x: number, z: number) {
  return Math.abs(x) < 8 && z <= -35 && z >= -65
    ? 6 * ((-z - 35) / 30) ** 2 : 0;
}

// Solid wedge below the visible driving surface, including its sides and rear.
export const TRAINING_RAMP_SOLIDS: SolidBox[] = Array.from({ length: 60 }, (_, i) => {
  const z = -35 - (i + 0.5) * 0.5;
  const height = trainingRampHeight(0, z - 0.25);
  return { position: [0, height / 2, z], size: [16, height, 0.5] };
});
