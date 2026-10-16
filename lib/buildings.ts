import type { Vec3 } from "./flight";

// One source of truth for the visible test facility and its solid volumes.
export const BUILDING_PARTS: {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}[] = [
  { id: "hangar", position: [74, 3.5, 48], size: [26, 7, 14], color: "#a59d8d" },
  { id: "roof", position: [74, 7.1, 48], size: [28, 0.3, 16], color: "#605f57" },
  { id: "door", position: [65, 2.8, 40.9], size: [5, 5, 0.1], color: "#484d4a" },
];

type Pose = { heading: number; pitch: number; roll: number };
export type SolidBox = {
  position: [number, number, number];
  size: [number, number, number];
  rotationX?: number;
};

function vehicleBounds(pose: Pose, rotationX = 0, wheelClearance = 0) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  const cy = Math.cos(-pose.heading), sy = Math.sin(-pose.heading);
  const cx = Math.cos(pose.pitch), sx = Math.sin(pose.pitch);
  const cz = Math.cos(pose.roll), sz = Math.sin(pose.roll);
  // Conservative body envelope around the wheel-contact origin. Match the
  // renderer's XYZ Euler order, including the car's height above that origin.
  for (const x of [-1.2, 1.2]) for (const y of [wheelClearance, 1.65]) for (const z of [-2.55, 2.55]) {
    const rx = cz * x - sz * y, ry = sz * x + cz * y;
    const px = cy * rx + sy * z, pz = -sy * rx + cy * z;
    const py = cx * ry - sx * pz, wz = sx * ry + cx * pz;
    const c = Math.cos(rotationX), sn = Math.sin(rotationX);
    const point = { x: px, y: c * py + sn * wz, z: -sn * py + c * wz };
    for (const axis of ["x", "y", "z"] as const) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  }
  for (const axis of ["x", "y", "z"] as const) {
    min[axis] -= 0.02;
    max[axis] += 0.02;
  }
  return { min, max };
}

export function buildingImpact(from: Vec3, to: Vec3, before: Pose, after: Pose): Vec3 | null {
  return solidImpact(BUILDING_PARTS, from, to, before, after);
}

export function solidImpact(parts: readonly SolidBox[], from: Vec3, to: Vec3, before: Pose, after: Pose, wheelClearance = 0): Vec3 | null {
  // A tumbling vehicle sweeps a larger volume between endpoint poses.
  const tumbling = Math.abs(after.pitch - before.pitch) > 0.05 || Math.abs(after.roll - before.roll) > 0.05;
  let earliest = Infinity;
  for (const part of parts) {
    const angle = part.rotationX ?? 0;
    const c = Math.cos(angle), sn = Math.sin(angle);
    const local = (p: Vec3) => {
      const y = p.y - part.position[1], z = p.z - part.position[2];
      return { x: p.x - part.position[0], y: c * y + sn * z, z: -sn * y + c * z };
    };
    const start = local(from), end = local(to);
    // Cheap broad phase keeps distant structures out of the corner transforms.
    if ((["x", "y", "z"] as const).some((axis, i) =>
      Math.min(start[axis], end[axis]) > part.size[i] / 2 + 3.4 ||
      Math.max(start[axis], end[axis]) < -part.size[i] / 2 - 3.4)) continue;
    const a = vehicleBounds(before, angle, wheelClearance), b = vehicleBounds(after, angle, wheelClearance);
    let enter = 0, exit = 1;
    for (const [index, axis] of (["x", "y", "z"] as const).entries()) {
      const min = -part.size[index] / 2 - (tumbling ? 3.4 : Math.max(a.max[axis], b.max[axis]));
      const max = part.size[index] / 2 - (tumbling ? -3.4 : Math.min(a.min[axis], b.min[axis]));
      const travel = end[axis] - start[axis];
      if (Math.abs(travel) < 1e-10) {
        if (start[axis] < min || start[axis] > max) { enter = Infinity; break; }
      } else {
        const t1 = (min - start[axis]) / travel, t2 = (max - start[axis]) / travel;
        enter = Math.max(enter, Math.min(t1, t2));
        exit = Math.min(exit, Math.max(t1, t2));
      }
    }
    if (enter <= exit) earliest = Math.min(earliest, enter);
  }
  if (!Number.isFinite(earliest)) return null;
  // Stop just before contact, rather than leaving the nose embedded in a wall.
  const t = Math.max(0, earliest - 0.001);
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, z: from.z + (to.z - from.z) * t };
}
