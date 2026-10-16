"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function shell(stations: number[][]) {
  const vertices: number[] = [],
    indices: number[] = [];
  for (const [z, w, h, b] of stations)
    for (const [x, y] of [
      [-w * 0.8, b],
      [-w, b + 0.08],
      [-w * 0.98, h - 0.06],
      [-w * 0.73, h],
      [w * 0.73, h],
      [w * 0.98, h - 0.06],
      [w, b + 0.08],
      [w * 0.8, b],
    ])
      vertices.push(x, y, z);
  for (let j = 0; j < stations.length - 1; j++)
    for (let i = 0; i < 8; i++) {
      const a = j * 8 + i,
        b = j * 8 + ((i + 1) % 8);
      indices.push(a, a + 8, b, b, a + 8, b + 8);
    }
  for (let i = 1; i < 7; i++) {
    indices.push(0, i, i + 1);
    const a = (stations.length - 1) * 8;
    indices.push(a, a + i + 1, a + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function sidePanel(side: number) {
  const shape = new THREE.Shape();
  const points = [
    [-2.48, 0.61],
    [-2.12, 0.79],
    [-1.7, 0.97],
    [-1.28, 0.96],
    [-0.82, 0.82],
    [0.8, 0.85],
    [1.25, 0.98],
    [1.7, 0.98],
    [2.28, 0.8],
    [2.4, 0.7],
    [2.4, 0.26],
    [1.97, 0.26],
    [1.97, 0.45],
  ];
  shape.moveTo(-points[0][0], points[0][1]);
  for (const [z, y] of points.slice(1)) shape.lineTo(-z, y);
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI;
    shape.lineTo(-(1.48 + 0.49 * Math.cos(a)), 0.45 + 0.49 * Math.sin(a));
  }
  shape.lineTo(-0.99, 0.26);
  shape.lineTo(0.99, 0.26);
  shape.lineTo(0.99, 0.45);
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI;
    shape.lineTo(-(-1.48 + 0.49 * Math.cos(a)), 0.45 + 0.49 * Math.sin(a));
  }
  shape.lineTo(1.97, 0.26);
  shape.lineTo(2.48, 0.26);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSize: 0.009,
    bevelThickness: 0.008,
    bevelSegments: 2,
    steps: 1,
  });
  g.rotateY(Math.PI / 2);
  g.translate(side === 1 ? 0.95 : -1.04, 0, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i),
      taper =
        z < -2.05 ? 1 - (-z - 2.05) * 0.19 : z > 2.2 ? 1 - (z - 2.2) * 0.18 : 1;
    p.setX(i, p.getX(i) * taper);
  }
  g.computeVertexNormals();
  return g;
}
function lines(points: number[][]) {
  const vertices: number[] = [];
  for (let i = 1; i < points.length; i++)
    vertices.push(...points[i - 1], ...points[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return g;
}
function lamp(side: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        side * 0.67,
        0.78,
        -2.11,
        side * 0.96,
        0.8,
        -2.06,
        side * 0.79,
        0.63,
        -2.27,
      ],
      3,
    ),
  );
  g.computeVertexNormals();
  return g;
}

export default function Roadster({
  color,
  speed = 0,
}: {
  color: string;
  speed?: number;
}) {
  const wheels = useRef<(THREE.Group | null)[]>([]);
  useFrame((_, delta) => {
    for (const wheel of wheels.current)
      if (wheel) wheel.rotation.x -= (speed / 0.431) * Math.min(delta, 0.05);
  });
  const geometries = useMemo(
    () => ({
      body: shell([
        [-2.47, 0.79, 0.63, 0.27],
        [-2.04, 0.89, 0.75, 0.25],
        [-1.48, 0.81, 0.79, 0.24],
        [-0.82, 1.01, 0.81, 0.24],
        [0.82, 1.02, 0.84, 0.24],
        [1.48, 0.81, 0.82, 0.24],
        [2.3, 0.95, 0.72, 0.27],
      ]),
      glass: shell([
        [-1.26, 0.77, 0.84, 0.77],
        [-0.36, 0.71, 1.3, 0.81],
        [0.64, 0.7, 1.32, 0.82],
        [1.48, 0.79, 0.88, 0.79],
      ]),
      sides: [sidePanel(-1), sidePanel(1)],
      seams: [-1, 1].map((s) =>
        lines([
          [s * 1.048, 0.82, -0.9],
          [s * 1.048, 0.4, -0.76],
          [s * 1.048, 0.29, -0.7],
          [s * 1.048, 0.29, 0.99],
          [s * 1.048, 0.83, 1.15],
        ]),
      ),
      hood: lines([
        [-0.68, 0.657, -2.4],
        [-0.74, 0.798, -1.28],
        [0.74, 0.798, -1.28],
        [0.68, 0.657, -2.4],
      ]),
      lamps: [lamp(-1), lamp(1)],
      frames: [-1, 1].map(
        (s) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(s * 0.78, 0.83, -1.26),
              new THREE.Vector3(s * 0.71, 1.3, -0.36),
              new THREE.Vector3(s * 0.7, 1.32, 0.64),
              new THREE.Vector3(s * 0.79, 0.87, 1.48),
            ]),
            36,
            0.013,
            6,
            false,
          ),
      ),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const value of Object.values(geometries))
        for (const g of Array.isArray(value) ? value : [value]) g.dispose();
    },
    [geometries],
  );
  return (
    <group>
      <mesh geometry={geometries.body} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={color}
          metalness={0.28}
          roughness={0.26}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>
      {geometries.sides.map((g, i) => (
        <mesh key={i} geometry={g} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={color}
            metalness={0.28}
            roughness={0.26}
            clearcoat={1}
          />
        </mesh>
      ))}
      <mesh geometry={geometries.glass} castShadow>
        <meshPhysicalMaterial
          color="#63563b"
          metalness={0.42}
          roughness={0.105}
          clearcoat={1}
        />
      </mesh>
      {geometries.frames.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshPhysicalMaterial color={color} metalness={0.4} roughness={0.2} />
        </mesh>
      ))}
      {geometries.seams.map((g, i) => (
        <lineSegments key={i} geometry={g}>
          <lineBasicMaterial color="#42494c" transparent opacity={0.65} />
        </lineSegments>
      ))}
      <lineSegments geometry={geometries.hood}>
        <lineBasicMaterial color="#969b9c" transparent opacity={0.5} />
      </lineSegments>
      <mesh position={[0, 0.235, 0]}>
        <boxGeometry args={[1.7, 0.12, 4.65]} />
        <meshStandardMaterial color="#11181e" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.45, -2.455]}>
        <boxGeometry args={[1.55, 0.22, 0.07]} />
        <meshStandardMaterial color="#070d12" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.28, -2.48]}>
        <boxGeometry args={[1.84, 0.045, 0.24]} />
        <meshStandardMaterial color="#131b22" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.637, -2.445]}>
        <boxGeometry args={[1.55, 0.014, 0.018]} />
        <meshStandardMaterial
          color="#c9ccca"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      {geometries.lamps.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            color="#e8f4ff"
            emissive="#e8f4ff"
            emissiveIntensity={1.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {[-1, 1].map((side, sideIndex) => (
        <group key={side}>
          <mesh position={[side * 1.047, 0.26, 0.02]}>
            <boxGeometry args={[0.07, 0.1, 2.16]} />
            <meshStandardMaterial color="#151c22" roughness={0.5} />
          </mesh>
          <mesh position={[side * 1.053, 0.78, 0.99]}>
            <boxGeometry args={[0.012, 0.04, 0.055]} />
            <meshStandardMaterial
              color="#8c9599"
              metalness={0.8}
              roughness={0.3}
            />
          </mesh>
          <mesh
            position={[side * 1.068, 0.94, -0.69]}
            rotation={[0, side * -0.2, 0]}
          >
            <boxGeometry args={[0.21, 0.045, 0.16]} />
            <meshPhysicalMaterial
              color={color}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
          {[-1.48, 1.48].map((z, wheelIndex) => (
            <group
              ref={(node) => {
                wheels.current[sideIndex * 2 + wheelIndex] = node;
              }}
              key={z}
              position={[side * 0.958, 0.45, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <mesh castShadow>
                <cylinderGeometry args={[0.431, 0.431, 0.24, 64]} />
                <meshStandardMaterial color="#131719" roughness={0.96} />
              </mesh>
              {[-0.074, 0, 0.074].map((offset) => (
                <mesh
                  key={offset}
                  position={[0, offset, 0]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <torusGeometry args={[0.432, 0.004, 4, 64]} />
                  <meshStandardMaterial color="#080d10" roughness={1} />
                </mesh>
              ))}
              <mesh position={[0, -side * 0.13, 0]}>
                <cylinderGeometry args={[0.354, 0.354, 0.015, 48]} />
                <meshStandardMaterial
                  color="#131a20"
                  metalness={0.7}
                  roughness={0.35}
                />
              </mesh>
              <mesh
                position={[0, -side * 0.143, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <torusGeometry args={[0.34, 0.014, 8, 48]} />
                <meshStandardMaterial
                  color="#b1b7b9"
                  metalness={0.95}
                  roughness={0.22}
                />
              </mesh>
              <mesh position={[0, -side * 0.146, 0]}>
                <cylinderGeometry args={[0.265, 0.265, 0.009, 48]} />
                <meshStandardMaterial
                  color="#697076"
                  metalness={0.8}
                  roughness={0.55}
                />
              </mesh>
              {Array.from({ length: 5 }, (_, i) => (
                <group key={i} rotation={[0, (i * Math.PI * 2) / 5, 0]}>
                  {[-1, 1].map((fork) => (
                    <mesh
                      key={fork}
                      position={[fork * 0.024, -side * 0.16, 0.18]}
                      rotation={[0, fork * 0.1, 0]}
                    >
                      <boxGeometry args={[0.024, 0.026, 0.31]} />
                      <meshStandardMaterial
                        color="#b6bfc3"
                        metalness={0.9}
                        roughness={0.25}
                      />
                    </mesh>
                  ))}
                </group>
              ))}
              <mesh position={[0, -side * 0.18, 0]}>
                <cylinderGeometry args={[0.065, 0.065, 0.023, 16]} />
                <meshStandardMaterial
                  color="#303b43"
                  metalness={0.8}
                  roughness={0.3}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.74, 2.32]}>
        <boxGeometry args={[1.79, 0.026, 0.028]} />
        <meshStandardMaterial
          color="#b7261d"
          emissive="#ff2616"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[0, 0.59, 2.335]}>
        <boxGeometry args={[0.35, 0.13, 0.025]} />
        <meshStandardMaterial
          color="#282e34"
          metalness={0.6}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.765, -2.0]}>
        <boxGeometry args={[0.115, 0.008, 0.02]} />
        <meshStandardMaterial
          color="#9ca5a8"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.765, -1.96]}>
        <boxGeometry args={[0.015, 0.008, 0.09]} />
        <meshStandardMaterial
          color="#9ca5a8"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}
