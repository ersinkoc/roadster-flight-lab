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

function vehicleBounds(pose: Pose) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  const cy = Math.cos(-pose.heading), sy = Math.sin(-pose.heading);
  const cx = Math.cos(pose.pitch), sx = Math.sin(pose.pitch);
  const cz = Math.cos(pose.roll), sz = Math.sin(pose.roll);
  // Conservative body envelope around the wheel-contact origin. Match the
  // renderer's XYZ Euler order, including the car's height above that origin.
  for (const x of [-1.2, 1.2]) for (const y of [0, 1.65]) for (const z of [-2.55, 2.55]) {
    const rx = cz * x - sz * y, ry = sz * x + cz * y;
    const px = cy * rx + sy * z, pz = -sy * rx + cy * z;
    const point = { x: px, y: cx * ry - sx * pz, z: sx * ry + cx * pz };
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
  const a = vehicleBounds(before), b = vehicleBounds(after);
  // A tumbling vehicle sweeps a larger volume between endpoint poses.
  const tumbling = Math.abs(after.pitch - before.pitch) > 0.05 || Math.abs(after.roll - before.roll) > 0.05;
  let earliest = Infinity;
  for (const part of BUILDING_PARTS) {
    let enter = 0, exit = 1;
    for (const [index, axis] of (["x", "y", "z"] as const).entries()) {
      const min = part.position[index] - part.size[index] / 2 - (tumbling ? 3.1 : Math.max(a.max[axis], b.max[axis]));
      const max = part.position[index] + part.size[index] / 2 - (tumbling ? -3.1 : Math.min(a.min[axis], b.min[axis]));
      const travel = to[axis] - from[axis];
      if (Math.abs(travel) < 1e-10) {
        if (from[axis] < min || from[axis] > max) { enter = Infinity; break; }
      } else {
        const t1 = (min - from[axis]) / travel, t2 = (max - from[axis]) / travel;
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
