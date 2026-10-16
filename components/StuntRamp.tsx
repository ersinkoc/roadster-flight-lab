"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { STUNT_RAMP, stuntRampPoint } from "../lib/stunt-ramp";
export default function StuntRamp() {
  const surface = useMemo(() => {
    const vertices: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * STUNT_RAMP.endAngle,
        p = stuntRampPoint(theta);
      for (const side of [-1, 1]) {
        vertices.push(p.x + (side * STUNT_RAMP.width) / 2, p.y, p.z);
        uv.push(side === -1 ? 0 : 1, (i / segments) * 6);
      }
      if (i < segments) {
        const j = i * 2;
        indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  const rails = useMemo(
    () =>
      [-1, 1].map(
        (side) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(
              Array.from({ length: 65 }, (_, i) => {
                const a = (i / 64) * Math.PI,
                  p = stuntRampPoint(a);
                return new THREE.Vector3(
                  p.x + side * (STUNT_RAMP.width / 2 + 0.05),
                  p.y + 0.1 * Math.cos(a),
                  p.z + 0.1 * Math.sin(a),
                );
              }),
            ),
            96,
            0.065,
            6,
            false,
          ),
      ),
    [],
  );
  return (
    <group>
      <mesh geometry={surface} receiveShadow castShadow>
        <meshStandardMaterial
          color="#54616b"
          roughness={0.78}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {rails.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            color="#e4a452"
            metalness={0.45}
            roughness={0.4}
          />
        </mesh>
      ))}
      {Array.from({ length: 13 }, (_, i) => {
        const a = (i / 12) * Math.PI,
          p = stuntRampPoint(a);
        return (
          <group key={i} position={[p.x, p.y, p.z]} rotation={[a, 0, 0]}>
            <mesh position={[0, -0.18, 0]}>
              <boxGeometry args={[STUNT_RAMP.width + 1, 0.32, 0.45]} />
              <meshStandardMaterial
                color="#b25b35"
                metalness={0.4}
                roughness={0.6}
              />
            </mesh>
          </group>
        );
      })}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[STUNT_RAMP.x + side * 7, 18, STUNT_RAMP.z]}
            castShadow
          >
            <boxGeometry args={[0.45, 36, 0.7]} />
            <meshStandardMaterial
              color="#4c5861"
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
          <mesh
            position={[STUNT_RAMP.x + side * 7, 9, STUNT_RAMP.z - 18]}
            castShadow
          >
            <boxGeometry args={[0.4, 18, 0.6]} />
            <meshStandardMaterial
              color="#4c5861"
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[STUNT_RAMP.x, 0.015, 0]} receiveShadow>
        <boxGeometry args={[12, 0.03, 60]} />
        <meshStandardMaterial color="#56616a" roughness={0.9} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[STUNT_RAMP.x, 0.04, 25 - i * 7]}>
          <boxGeometry args={[0.16, 0.02, 3]} />
          <meshBasicMaterial color="#e7d7b1" />
        </mesh>
      ))}
    </group>
  );
}
