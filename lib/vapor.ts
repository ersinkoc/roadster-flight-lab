export function vaporOpacity(age: number, kind: number) {
  if (!Number.isFinite(age) || age <= 0 || age >= 1) return 0;
  return (
    Math.max(0, Math.min(1, age * 15)) *
    (1 - age) ** 1.5 *
    (kind === 0 ? 0.75 : kind === 2 ? 0.48 : 0.32)
  );
}
