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
import {vaporOpacity} from '../lib/vapor';

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
  const g = ctx.createRadialGradient(64, 60, 3, 64, 64, 63);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.2, "rgba(255,255,255,0.78)");
  g.addColorStop(0.5, "rgba(255,255,255,0.4)");
  g.addColorStop(0.78, "rgba(255,255,255,0.1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
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
          ? 0.35 + random() * 0.32
          : kind === 1
            ? 1.1 + random() * 0.8
            : 1.7 + random() * 1.4;
      pool.size[i] =
        (kind === 0 ? 0.12 : kind === 1 ? 0.32 : 0.6) *
        (0.75 + random() * 0.6) *
        (0.6 + power * 0.4);
      pool.kind[i] = kind;
    };
    p.car.current.updateWorldMatrix(true, false);
    p.car.current.getWorldQuaternion(scratch.rotation);
    const s = p.state.current;
    THRUSTERS.forEach((n, index) => {
      const power = thrusterPower(index, s, p.input.current, p.active);
      scratch.rates[index] += dt * power * (p.quality === "low" ? 100 : 280);
      scratch.origin
        .set(...(n.position as [number, number, number]))
        .applyMatrix4(p.car.current!.matrixWorld);
      scratch.direction
        .set(...(n.direction as [number, number, number]))
        .applyQuaternion(scratch.rotation);
      while (scratch.rates[index] >= 1) {
        scratch.rates[index]--;
        const speed = (18 + random() * 15) * (0.6 + 0.4 * power),
          spread = 0.6;
        const birthOffset = random() * dt;
        emit(
          scratch.origin.x - scratch.direction.x * speed * birthOffset,
          scratch.origin.y - scratch.direction.y * speed * birthOffset,
          scratch.origin.z - scratch.direction.z * speed * birthOffset,
          scratch.direction.x * speed + (random() - 0.5) * spread,
          scratch.direction.y * speed,
          scratch.direction.z * speed + (random() - 0.5) * spread,
          random() < 0.7 ? 0 : 1,
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
      const drag = Math.exp(-dt * (kind === 0 ? 0.7 : 1.1));
      pool.velocity[j] *= drag;
      pool.velocity[j + 1] *= drag;
      pool.velocity[j + 2] *= drag;
      pool.position[j] += (pool.velocity[j] + (kind === 0 ? 0 : 1.2)) * dt;
      pool.position[j + 1] += pool.velocity[j + 1] * dt;
      pool.position[j + 2] += pool.velocity[j + 2] * dt;
      const floor = rampHeight(pool.position[j], pool.position[j + 2]) + 0.12;
      if (pool.position[j + 1] < floor) {
        pool.position[j + 1] = floor;
        if (kind !== 2) {
          const a = random() * Math.PI * 2,
            v = 3 + random() * 7;
          pool.kind[i] = 2;
          pool.velocity[j] = Math.cos(a) * v;
          pool.velocity[j + 2] = Math.sin(a) * v;
          pool.velocity[j + 1] = 0.4 + random();
          pool.life[i] = pool.maxLife[i] = 1.4 + random() * 1.1;
          pool.size[i] = 0.35 + random() * 0.5;
          age = 0;
        }
      }
      if (pool.kind[i] !== 0) pool.velocity[j + 1] += 0.25 * dt;
      const radius =
        pool.size[i] +
        age * (pool.kind[i] === 0 ? 0.65 : pool.kind[i] === 2 ? 3.5 : 1.9);
      scratch.matrix.position.set(
        pool.position[j],
        pool.position[j + 1],
        pool.position[j + 2],
      );
      scratch.matrix.quaternion.copy(camera.quaternion);
      scratch.matrix.scale.set(
        radius * (pool.kind[i] === 2 ? 1.5 : 1),
        radius,
        1,
      );
      scratch.matrix.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.matrix.matrix);
      pool.alpha[i] = vaporOpacity(age,pool.kind[i]);
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
