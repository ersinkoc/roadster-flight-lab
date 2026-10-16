"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const FRONT_AXLE = -1.56, REAR_AXLE = 1.67;
const LAMP_SHAPE = [[0.65, 0.74, -2.29], [0.84, 0.79, -2.23], [0.73, 0.646, -2.51]];
// Proportions reconstructed from the white flight-demo car's front and side
// photographs. These are visual reference coordinates, not Tesla CAD data.
// Side-photo landmarks: nose, wheel crowns, continuous rising belt, rear deck.
// The belt does not dip between the wheels like the earlier red concept.
const SHOULDER = [[-2.48, 0.56], [-2.12, 0.76], [-1.8, 0.91], [-1.32, 0.95],
  [-0.82, 0.96], [0.8, 1.04], [1.44, 1.05], [1.91, 1.01], [2.28, 0.96], [2.4, 0.94]];
const BODY_PROFILE = [[-2.48, 0.67, 0.64, 0.23], [-2.04, 0.73, 0.76, 0.23],
  [FRONT_AXLE, 0.76, 0.87, 0.23], [-1.12, 0.83, 0.90, 0.23],
  [0.82, 0.84, 0.96, 0.23], [REAR_AXLE, 0.80, 0.99, 0.23], [2.4, 0.76, 0.94, 0.25]];

const CABIN = {
  base: [0.85, 0.91, -1.32], front: [0.73, 1.29, -0.30],
  rear: [0.74, 1.31, 0.57], tail: [0.91, 1.045, 1.19],
};

function panels(faces: number[][][]) {
  const vertices: number[] = [];
  for (const face of faces) for (let i = 1; i < face.length - 1; i++)
    vertices.push(...face[0], ...face[i], ...face[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.computeVertexNormals();
  return g;
}
function canopy() {
  const {base: b, front: f, rear: r, tail: t} = CABIN;
  const point = (p: number[], s: number) => [p[0]*s, p[1], p[2]];
  return panels([
    [point(b,-1),point(b,1),point(f,1),point(f,-1)],
    [point(f,-1),point(f,1),point(r,1),point(r,-1)],
    [point(r,-1),point(r,1),[0.78,1.02,1.47],[-0.78,1.02,1.47]],
    ...[-1,1].map((s) => [point(b,s),point(f,s),point(r,s),point(t,s),
      [s*0.955,0.99,0.55],[s*0.963,0.925,-0.72]]),
  ]);
}
function pillar(side: number) {
  const points = [CABIN.base, CABIN.front, CABIN.rear, CABIN.tail]
    .map(([x,y,z]) => [side*x,y,z]);
  const path = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 1; i < points.length; i++)
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1] as [number,number,number]),
      new THREE.Vector3(...points[i] as [number,number,number])));
  return new THREE.TubeGeometry(path, 64, 0.012, 8, false);
}

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
function fender(side: number) {
  const vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 128; i++) for (let j = 0; j <= 6; j++) {
    const t = j / 6, z = -2.48 + i / 128 * 4.88;
    const k = Math.max(1, SHOULDER.findIndex((p) => p[0] >= z));
    const lo = SHOULDER[k - 1], hi = SHOULDER[k];
    const shoulder = THREE.MathUtils.lerp(lo[1], hi[1], (z - lo[0]) / (hi[0] - lo[0]));
    const found = BODY_PROFILE.findIndex((p) => p[0] >= z);
    const h = found < 0 ? BODY_PROFILE.length - 1 : Math.max(1, found);
    const a = BODY_PROFILE[h - 1], b = BODY_PROFILE[h];
    const hood = THREE.MathUtils.lerp(a[2], b[2], (z - a[0]) / (b[0] - a[0]));
    const taper = z < -2.05 ? 1 - (-z - 2.05) * 0.19 : z > 2.2 ? 1 - (z - 2.2) * 0.18 : 1;
    const height = THREE.MathUtils.lerp(shoulder, hood, t);
    vertices.push(side * (1.045 * taper * (1 - t) + 0.54 * t), height, z);
    if (i < 128 && j < 6) {
      const n = i * 7 + j;
      indices.push(n, n + 7, n + 1, n + 1, n + 7, n + 8);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(side > 0 ? indices : indices.reverse());
  g.computeVertexNormals();
  return g;
}
function sidePanel(side: number) {
  const shape = new THREE.Shape();
  const points = [
    ...SHOULDER,
    [2.4, 0.72],
    [REAR_AXLE + 0.49, 0.26],
    [REAR_AXLE + 0.49, 0.45],
  ];
  shape.moveTo(-points[0][0], points[0][1]);
  for (const [z, y] of points.slice(1)) shape.lineTo(-z, y);
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI;
    shape.lineTo(-(REAR_AXLE + 0.49 * Math.cos(a)), 0.45 + 0.49 * Math.sin(a));
  }
  shape.lineTo(-(REAR_AXLE - 0.49), 0.26);
  shape.lineTo(-(FRONT_AXLE + 0.49), 0.26);
  shape.lineTo(-(FRONT_AXLE + 0.49), 0.45);
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI;
    shape.lineTo(-(FRONT_AXLE + 0.49 * Math.cos(a)), 0.45 + 0.49 * Math.sin(a));
  }
  shape.lineTo(-(FRONT_AXLE - 0.49), 0.26);
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
    const waist = Math.max(0, 0.93-p.getY(i))*0.10;
    p.setX(i, (p.getX(i)-side*waist) * taper);
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
  const g = panels([LAMP_SHAPE.map(([x,y,z]) => [side*x,y,z])]);
  // UVs trace the actual triangular lens in Tesla's front photograph.
  g.setAttribute("uv", new THREE.Float32BufferAttribute([
    790/2048,1-503/968, 720/2048,1-494/968, 758/2048,1-558/968,
  ],2));
  return g;
}
function photographedWheel() {
  // Only the circular alloy face is sampled; the tire, depth and rotation stay 3D.
  const g = new THREE.CircleGeometry(0.342, 64);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i=0;i<p.count;i++) uv.setXY(i,
    (1018 + p.getX(i)/0.342*64)/2048,
    1-(412-p.getY(i)/0.342*65)/610);
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
  const [wheelPhoto, lampPhoto] = useTexture([
    "/images/tesla-roadster-side.jpg", "/images/tesla-roadster-front.jpg",
  ]);
  useEffect(() => {
    for (const texture of [wheelPhoto, lampPhoto]) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
  }, [wheelPhoto, lampPhoto]);
  useFrame((_, delta) => {
    for (const wheel of wheels.current)
      if (wheel) wheel.rotation.y -= (speed / 0.431) * Math.min(delta, 0.05);
  });
  const geometries = useMemo(
    () => ({
      body: shell(BODY_PROFILE),
      glass: canopy(),
      intake: panels([[[-0.72,0.64,-2.536],[0.72,0.64,-2.536],
        [0.83,0.24,-2.536],[-0.83,0.24,-2.536]]]),
      rearPillars: panels([-1,1].map((s) => [[s*0.74,1.31,0.57],[s*0.97,1.035,1.70],
        [s*1.01,1.035,1.19],[s*0.91,1.045,1.19]])),
      belt: panels([-1,1].map((s) => [[s*0.85,0.91,-1.32],[s*0.963,0.925,-0.72],
        [s*0.955,0.99,0.55],[s*0.91,1.045,1.19],
        [s*1.043,1.04,1.19],[s*1.043,0.91,-0.94]])),
      wheelFace: photographedWheel(),
      cheeks: panels([-1,1].map(s => [[s*0.72,0.64,-2.536],
        [s*0.965,0.56,-2.536],[s*0.965,0.25,-2.536],[s*0.83,0.24,-2.536]])),
      tail: panels([[[-0.99,0.94,2.415],[0.99,0.94,2.415],
        [0.94,0.57,2.415],[-0.94,0.57,2.415]]]),
      sides: [sidePanel(-1), sidePanel(1)],
      fenders: [fender(-1), fender(1)],
      pillars: [-1, 1].map((s) => lines([
        [s * 0.953, 0.995, 0.46], [s * 0.739, 1.309, 0.40],
      ])),
      seams: [-1, 1].map((s) =>
        lines([
          [s * 1.048, 0.91, -0.94],
          [s * 1.048, 0.4, -0.76],
          [s * 1.048, 0.29, -0.7],
          [s * 1.048, 0.29, 0.99],
          [s * 1.048, 1.035, 0.46],
        ]),
      ),
      hood: lines([
        [-0.68, 0.657, -2.4],
        [-0.74, 0.798, -1.28],
        [0.74, 0.798, -1.28],
        [0.68, 0.657, -2.4],
      ]),
      lamps: [lamp(-1), lamp(1)],
      frames: [pillar(-1), pillar(1)],
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
          metalness={0.18}
          roughness={0.23}
          clearcoat={1}
          clearcoatRoughness={0.07}
        />
      </mesh>
      {[...geometries.sides, ...geometries.fenders, geometries.rearPillars, geometries.belt, geometries.cheeks, geometries.tail].map((g, i) => (
        <mesh key={i} geometry={g} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={color}
            metalness={0.18}
            roughness={0.23}
            clearcoat={1}
            clearcoatRoughness={0.07}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh geometry={geometries.glass} renderOrder={1}>
        <meshPhysicalMaterial
          color="#211c19"
          metalness={0}
          roughness={0.18}
          envMapIntensity={0.7}
          reflectivity={0.4}
          clearcoat={0.45}
          clearcoatRoughness={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.8, 0.1]}>
        <boxGeometry args={[1.45, 0.04, 1.8]} />
        <meshStandardMaterial color="#11191d" roughness={0.85} />
      </mesh>
      {[-0.34, 0.34].map((x) => (
        <group key={x} position={[x, 0.91, 0.32]}>
          <mesh position={[0, 0.06, 0.18]} rotation={[-0.16, 0, 0]}>
            <capsuleGeometry args={[0.13, 0.17, 6, 12]} />
            <meshStandardMaterial color="#242c2c" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.05, -0.02]}>
            <boxGeometry args={[0.31, 0.08, 0.43]} />
            <meshStandardMaterial color="#20292a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.25, 0.2]}>
            <boxGeometry args={[0.17, 0.13, 0.09]} />
            <meshStandardMaterial color="#222a2b" roughness={0.75} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.88, -0.65]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[1.3, 0.09, 0.27]} />
        <meshStandardMaterial color="#141c20" roughness={0.65} />
      </mesh>
      <mesh position={[-0.34, 1.01, -0.47]} rotation={[-0.35, 0, 0]}>
        <torusGeometry args={[0.105, 0.012, 8, 24]} />
        <meshStandardMaterial color="#141b20" roughness={0.55} />
      </mesh>
      <mesh position={[-0.34, 0.99, -0.475]}>
        <boxGeometry args={[0.18, 0.022, 0.018]} />
        <meshStandardMaterial color="#6d777b" metalness={0.8} roughness={0.3} />
      </mesh>
      {geometries.pillars.map((g, i) => <lineSegments key={i} geometry={g}>
        <lineBasicMaterial color="#1c252b" />
      </lineSegments>)}
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
      <mesh geometry={geometries.intake}>
        <meshStandardMaterial color="#080d11" metalness={0.2} roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      {[0.33,0.43,0.53].map(y => <mesh key={y} position={[0,y,-2.54]}>
        <boxGeometry args={[1.47,0.012,0.03]} />
        <meshStandardMaterial color="#263039" metalness={0.65} roughness={0.35} />
      </mesh>)}
      <mesh position={[0, 0.28, -2.48]}>
        <boxGeometry args={[1.84, 0.045, 0.24]} />
        <meshStandardMaterial color="#131b22" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.642, -2.54]}>
        <boxGeometry args={[1.43, 0.014, 0.018]} />
        <meshStandardMaterial
          color="#c9ccca"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      {geometries.lamps.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial
            map={lampPhoto}
            emissiveMap={lampPhoto}
            emissive="#ffffff"
            emissiveIntensity={0.6}
            roughness={0.2}
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
            position={[side * 1.035, 0.91, -0.94]}
            rotation={[0, side * -0.2, 0]}
          >
            <boxGeometry args={[0.07, 0.022, 0.25]} />
            <meshPhysicalMaterial
              color={color}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
          {[FRONT_AXLE, REAR_AXLE].map((z, wheelIndex) => (
            <group
              key={z}
              position={[side * 0.958, 0.45, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <mesh position={[0.18, -side * 0.12, -0.08]} rotation={[0, 0.3, 0]}>
                <boxGeometry args={[0.1, 0.065, 0.23]} />
                <meshStandardMaterial color="#a92e25" metalness={0.45} roughness={0.35} />
              </mesh>
              <group ref={(node) => { wheels.current[sideIndex * 2 + wheelIndex] = node; }}>
              <mesh castShadow>
                <cylinderGeometry args={[0.427, 0.427, 0.14, 64]} />
                <meshStandardMaterial color="#131719" roughness={0.96} />
              </mesh>
              {[-0.065, 0.065].map((offset) => <mesh key={offset} position={[0, offset, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <torusGeometry args={[0.375, 0.056, 12, 64]} />
                <meshStandardMaterial color="#15191b" roughness={0.9} />
              </mesh>)}
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
              <mesh geometry={geometries.wheelFace} position={[0,-side*0.205,0]}
                rotation={[side*Math.PI/2,0,0]}>
                <meshStandardMaterial map={wheelPhoto} roughness={0.32} metalness={0.15}
                  emissiveMap={wheelPhoto} emissive="#ffffff" emissiveIntensity={0.18} />
              </mesh>
              <mesh position={[0,-side*0.219,0]} rotation={[Math.PI/2,0,0]}>
                <torusGeometry args={[0.341,0.007,8,64]} />
                <meshStandardMaterial color="#899399" metalness={0.95} roughness={0.22} />
              </mesh>
              <mesh position={[0,-side*0.225,0]}>
                <cylinderGeometry args={[0.057,0.057,0.026,24]} />
                <meshStandardMaterial color="#242d31" metalness={0.8} roughness={0.25} />
              </mesh>
              {Array.from({length:5},(_,i) => <group key={i} rotation={[0,i*Math.PI*2/5,0]}>
                <mesh position={[0,-side*0.219,0.198]} rotation={[0,-0.12,0]}>
                  <boxGeometry args={[0.016,0.022,0.258]} />
                  <meshStandardMaterial color="#30383c" metalness={0.85} roughness={0.25} />
                </mesh>
              </group>)}
              </group>
            </group>
          ))}
        </group>
      ))}
      <mesh position={[0, 0.90, 2.433]}>
        <boxGeometry args={[1.88, 0.023, 0.018]} />
        <meshStandardMaterial
          color="#b7261d"
          emissive="#ff2616"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[0, 0.73, 2.435]}>
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
