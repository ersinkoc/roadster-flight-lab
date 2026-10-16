"use client";
import {
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { FlightState, Input } from "../lib/flight";
import { rampHeight } from "../lib/flight";
import { THRUSTERS, thrusterPower } from "../lib/thrusters";
import { vaporOpacity } from "../lib/vapor";

type Props = {
  car: RefObject<THREE.Group | null>;
  state: MutableRefObject<FlightState>;
  input: MutableRefObject<Input>;
  active: boolean;
  quality: string;
  reset: number;
  night: boolean;
};
function vaporTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const pixels = ctx.createImageData(128, 128);
  // Soft, irregular condensation instead of identical circular smoke sprites.
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const u = (x - 64) / 64, v = (y - 64) / 64;
    const noise = 0.68 + 0.16 * Math.sin(u * 11 + Math.sin(v * 9))
      + 0.1 * Math.cos(v * 19 - u * 8) + 0.06 * Math.sin(u * 37 + v * 31);
    const edge = Math.max(0, 1 - Math.hypot(u, v) / (0.88 + noise * 0.12));
    const i = (y * 128 + x) * 4;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    pixels.data[i + 3] = Math.round(255 * edge ** 1.7 * noise);
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export default function ThrusterEffects(p: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = p.quality === "low" ? 650 : p.quality === "high" ? 2200 : 1400;
  const pool = useMemo(
    () => ({
      position: new Float32Array(count * 3),
      velocity: new Float32Array(count * 3),
      life: new Float32Array(count),
      maxLife: new Float32Array(count),
      size: new Float32Array(count),
      kind: new Uint8Array(count),
      alpha: new Float32Array(count),
      spin: new Float32Array(count),
      cursor: 0,
    }),
    [count],
  );
  const texture = useMemo(vaporTexture, []);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute(
      "vaporOpacity",
      new THREE.InstancedBufferAttribute(pool.alpha, 1),
    );
    return g;
  }, [pool]);
  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      vertexColors: false,
      color: "#ffffff",
      fog: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float vaporOpacity; varying float vVaporOpacity;",
        )
        .replace(
          "#include <color_vertex>",
          "#include <color_vertex>\nvVaporOpacity = vaporOpacity;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vVaporOpacity;",
        )
        .replace(
          "#include <color_fragment>",
          "#include <color_fragment>\ndiffuseColor.a *= vVaporOpacity;",
        );
    };
    m.customProgramCacheKey = () => "white-air-finite-opacity-v3";
    return m;
  }, [texture]);
  const scratch = useMemo(
    () => ({
      matrix: new THREE.Object3D(),
      origin: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      rotation: new THREE.Quaternion(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      travel: new THREE.Vector3(),
      axis: new THREE.Vector3(0, 0, 1),
      billboard: new THREE.Quaternion(),
      tangent: new THREE.Vector3(),
      bitangent: new THREE.Vector3(),
      rates: new Float32Array(THRUSTERS.length),
    }),
    [],
  );
  const seed = useRef(0x8fc123);
  useEffect(() => {
    material.color.set("#ffffff");
  }, [p.night, material]);
  const random = () => {
    seed.current = (Math.imul(seed.current, 1664525) + 1013904223) >>> 0;
    return seed.current / 4294967296;
  };
  useEffect(() => {
    if (mesh.current) mesh.current.instanceColor = null;
    material.needsUpdate = true;
    pool.life.fill(0);
    pool.alpha.fill(0);
    scratch.rates.fill(0);
  }, [p.reset, pool, scratch]);
  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useFrame(({ camera }, delta) => {
    if (!mesh.current || !p.car.current) return;
    // Pausing also freezes the existing cloud rather than erasing it.
    const dt = p.active ? Math.min(delta, 0.05) : 0;
    const emit = (
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      kind: number,
      power: number,
    ) => {
      const i = pool.cursor++ % count,
        j = i * 3;
      pool.position[j] = x;
      pool.position[j + 1] = y;
      pool.position[j + 2] = z;
      pool.velocity[j] = vx;
      pool.velocity[j + 1] = vy;
      pool.velocity[j + 2] = vz;
      pool.life[i] = pool.maxLife[i] =
        kind === 0
          ? 0.09 + random() * 0.07
          : kind === 1
            ? 0.6 + random() * 0.65
            : 0.8 + random() * 0.8;
      pool.size[i] =
        (kind === 0 ? 0.055 : kind === 1 ? 0.16 : 0.45) *
        (0.75 + random() * 0.6) *
        (0.6 + power * 0.4);
      pool.kind[i] = kind;
      pool.spin[i] = random() * Math.PI * 2;
    };
    p.car.current.updateWorldMatrix(true, false);
    p.car.current.getWorldQuaternion(scratch.rotation);
    const s = p.state.current;
    scratch.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    scratch.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    THRUSTERS.forEach((n, index) => {
      const power = thrusterPower(index, s, p.input.current, p.active);
      scratch.rates[index] += dt * power * (p.quality === "low" ? 100 : 280);
      scratch.origin
        .set(...(n.position as [number, number, number]))
        .applyMatrix4(p.car.current!.matrixWorld);
      scratch.direction
        .set(...(n.direction as [number, number, number]))
        .applyQuaternion(scratch.rotation);
      // An orthogonal emission cone works for underside, rear, and side ports.
      scratch.tangent.set(0, 1, 0);
      if (Math.abs(scratch.direction.y) > 0.9) scratch.tangent.set(1, 0, 0);
      scratch.tangent.cross(scratch.direction).normalize();
      scratch.bitangent.crossVectors(scratch.direction, scratch.tangent);
      while (scratch.rates[index] >= 1) {
        scratch.rates[index]--;
        const speed = (38 + random() * 20) * (0.45 + 0.55 * power);
        const mist = random() > 0.58;
        const angle = random() * Math.PI * 2;
        const spread = (mist ? 2.8 : 0.5) * Math.sqrt(random());
        const lateral = Math.cos(angle) * spread, cross = Math.sin(angle) * spread;
        const birthOffset = random() * dt;
        const vx = scratch.direction.x * speed + scratch.tangent.x * lateral + scratch.bitangent.x * cross;
        const vy = scratch.direction.y * speed + scratch.tangent.y * lateral + scratch.bitangent.y * cross;
        const vz = scratch.direction.z * speed + scratch.tangent.z * lateral + scratch.bitangent.z * cross;
        emit(
          scratch.origin.x + vx * birthOffset,
          scratch.origin.y + vy * birthOffset,
          scratch.origin.z + vz * birthOffset,
          vx + Math.sin(s.heading) * s.speed,
          vy + s.vertical,
          vz - Math.cos(s.heading) * s.speed,
          mist ? 1 : 0,
          power,
        );
      }
    });
    for (let i = 0; i < count; i++) {
      if (pool.life[i] <= 0) {
        pool.alpha[i] = 0;
        scratch.matrix.scale.setScalar(0);
        scratch.matrix.updateMatrix();
        mesh.current.setMatrixAt(i, scratch.matrix.matrix);
        continue;
      }
      pool.life[i] -= dt;
      const j = i * 3,
        kind = pool.kind[i];
      let age = 1 - pool.life[i] / pool.maxLife[i];
      const drag = Math.exp(-dt * (kind === 0 ? 2 : kind === 2 ? 2.1 : 4));
      pool.velocity[j] *= drag;
      pool.velocity[j + 1] *= drag;
      pool.velocity[j + 2] *= drag;
      if (kind !== 0) {
        const phase = pool.spin[i] + age * 8;
        pool.velocity[j] += Math.sin(phase + pool.position[j + 2] * 0.8) * dt * 2;
        pool.velocity[j + 2] += Math.cos(phase + pool.position[j] * 0.8) * dt * 2;
      }
      pool.position[j] += (pool.velocity[j] + (kind === 0 ? 0 : 1.2)) * dt;
      pool.position[j + 1] += pool.velocity[j + 1] * dt;
      pool.position[j + 2] += pool.velocity[j + 2] * dt;
      const floor = rampHeight(pool.position[j], pool.position[j + 2]) + 0.12;
      if (pool.position[j + 1] < floor) {
        pool.position[j + 1] = floor;
        if (kind !== 2) {
          const a = Math.atan2(
            pool.position[j + 2] - p.car.current.position.z,
            pool.position[j] - p.car.current.position.x,
          ) + (random() - 0.5) * 0.7;
          const v = Math.min(15, 4 + Math.abs(pool.velocity[j + 1]) * 0.25);
          pool.kind[i] = 2;
          pool.velocity[j] = Math.cos(a) * v;
          pool.velocity[j + 2] = Math.sin(a) * v;
          pool.velocity[j + 1] = 0.15 + random() * 0.35;
          pool.life[i] = pool.maxLife[i] = 0.8 + random() * 0.9;
          pool.size[i] = 0.25 + random() * 0.4;
          age = 0;
        }
      }
      if (pool.kind[i] !== 0) pool.velocity[j + 1] += 0.25 * dt;
      const radius =
        pool.size[i] +
        age * (pool.kind[i] === 0 ? 0.12 : pool.kind[i] === 2 ? 2.4 : 1.5);
      scratch.matrix.position.set(
        pool.position[j],
        pool.position[j + 1],
        pool.position[j + 2],
      );
      scratch.matrix.quaternion.copy(camera.quaternion);
      let stretch = 1;
      if (pool.kind[i] === 0) {
        scratch.travel.set(pool.velocity[j], pool.velocity[j + 1], pool.velocity[j + 2]);
        const x = scratch.travel.dot(scratch.right), y = scratch.travel.dot(scratch.up);
        scratch.billboard.setFromAxisAngle(scratch.axis, Math.atan2(y, x) - Math.PI / 2);
        stretch = Math.min(9, 1 + Math.hypot(x, y) * 0.13);
      } else {
        scratch.billboard.setFromAxisAngle(scratch.axis, pool.spin[i] + age * 0.5);
      }
      scratch.matrix.quaternion.multiply(scratch.billboard);
      scratch.matrix.scale.set(
        radius * (pool.kind[i] === 2 ? 1.5 : 1),
        radius * stretch,
        1,
      );
      scratch.matrix.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.matrix.matrix);
      pool.alpha[i] = vaporOpacity(age, pool.kind[i]);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    geometry.attributes.vaporOpacity.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
      renderOrder={4}
      dispose={null}
    />
  );
}
