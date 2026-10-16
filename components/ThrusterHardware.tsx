"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THRUSTERS, thrusterPower } from "../lib/thrusters";
import type { FlightState, Input } from "../lib/flight";
export default function ThrusterHardware({
  state,
  input,
  active,
  color,
}: {
  state: MutableRefObject<FlightState>;
  input: MutableRefObject<Input>;
  active: boolean;
  color: string;
}) {
  const cores = useRef<THREE.Group>(null);
  const sideOutlets = useRef<(THREE.Group | null)[]>([]);
  const aero = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.21, 0);
    shape.quadraticCurveTo(0.21, 0.026, 0.12, 0.028);
    shape.quadraticCurveTo(-0.08, 0.035, -0.2, 0.008);
    shape.lineTo(-0.2, -0.008);
    shape.quadraticCurveTo(0.1, -0.025, 0.21, 0);
    const wing = new THREE.ExtrudeGeometry(shape, { depth: 2.06, bevelEnabled: true,
      bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 3, curveSegments: 16, steps: 1 });
    wing.rotateY(Math.PI / 2).translate(-1.03, 0, 0);
    const frame = new THREE.Shape();
    frame.moveTo(-0.82, 0.02);
    frame.quadraticCurveTo(-0.93, 0.03, -0.93, 0.16);
    frame.lineTo(-0.93, 0.43);
    frame.quadraticCurveTo(-0.93, 0.56, -0.79, 0.56);
    frame.lineTo(0.79, 0.56);
    frame.quadraticCurveTo(0.93, 0.56, 0.93, 0.43);
    frame.lineTo(0.93, 0.16);
    frame.quadraticCurveTo(0.93, 0.03, 0.82, 0.02);
    frame.closePath();
    const opening = new THREE.Path();
    opening.moveTo(-0.78, 0.07);
    opening.lineTo(0.78, 0.07);
    opening.quadraticCurveTo(0.84, 0.07, 0.84, 0.15);
    opening.lineTo(0.84, 0.42);
    opening.quadraticCurveTo(0.84, 0.47, 0.77, 0.47);
    opening.lineTo(-0.77, 0.47);
    opening.quadraticCurveTo(-0.84, 0.47, -0.84, 0.42);
    opening.lineTo(-0.84, 0.15);
    opening.quadraticCurveTo(-0.84, 0.07, -0.78, 0.07);
    frame.holes.push(opening);
    const tray = new THREE.ExtrudeGeometry(frame, { depth: 0.065, bevelEnabled: true,
      bevelSize: 0.012, bevelThickness: 0.008, bevelSegments: 3, steps: 1, curveSegments: 12 });
    tray.translate(0, 0, 2.43);
    return { wing, tray };
  }, []);
  useEffect(() => () => { aero.wing.dispose(); aero.tray.dispose(); }, [aero]);
  const coreMask = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(32, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) {
      const fade = (1 - y / 127) ** 2;
      const ripple = 0.85 + 0.08 * Math.sin(y * 0.45 + Math.sin(x * 0.4));
      const i = (y * 32 + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.round(255 * fade * ripple);
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => coreMask.dispose(), [coreMask]);
  const coreGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(0.045, 0.105, 1, 16, 1, true).translate(
        0,
        -0.5,
        0,
      ),
    [],
  );
  useEffect(() => () => coreGeometry.dispose(), [coreGeometry]);
  const wing = useRef<THREE.Group>(null),
    fans = useRef<THREE.Group>(null);
  const orientations = useMemo(
    () =>
      THRUSTERS.map((n) =>
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, -1, 0),
          new THREE.Vector3(...(n.direction as [number, number, number])),
        ),
      ),
    [],
  );
  useFrame((_, delta) => {
    const dt = active ? Math.min(delta, 0.05) : 0;
    const deploy =
      active &&
      (state.current.position.y > 0.2 ||
        input.current.lift ||
        input.current.boost)
        ? 1
        : 0;
    THRUSTERS.forEach((n, i) => {
      if (n.kind !== "rcs") return;
      const firing = thrusterPower(i, state.current, input.current, active) > 0;
      if (sideOutlets.current[i]) sideOutlets.current[i]!.visible = firing;
    });
    if (cores.current)
      cores.current.children.forEach((jet, i) => {
        const power = thrusterPower(i, state.current, input.current, active);
        jet.visible = power > 0;
        const length =
          THRUSTERS[i].kind === "lift"
            ? Math.min(3.5, state.current.position.y + 0.28)
            : THRUSTERS[i].kind === "rear"
              ? 3.2
              : 1.15;
        jet.scale.set(
          0.5 + power * 0.6,
          length * (0.7 + power * 0.3),
          0.5 + power * 0.6,
        );
      });
    if (wing.current) {
      wing.current.position.y = THREE.MathUtils.damp(
        wing.current.position.y,
        0.81 + deploy * 0.32,
        7,
        dt || 0.016,
      );
      wing.current.rotation.x = THREE.MathUtils.damp(
        wing.current.rotation.x,
        -0.04 - deploy * 0.15,
        6,
        dt || 0.016,
      );
    }
    if (fans.current && active)
      fans.current.children.forEach((f) => {
        f.rotation.z += dt * (input.current.lift ? 32 : 8);
      });
  });
  return (
    <group>
      <group ref={cores}>
        {THRUSTERS.map((n, i) => (
          <group
            key={n.id}
            position={n.position as [number, number, number]}
            quaternion={orientations[i]}
          >
            <mesh geometry={coreGeometry} renderOrder={3}>
              <meshBasicMaterial
                color="#ffffff"
                alphaMap={coreMask}
                transparent
                opacity={0.065}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
                fog={false}
                blending={THREE.NormalBlending}
              />
            </mesh>
            <mesh
              geometry={coreGeometry}
              scale={[0.55, 1, 0.55]}
              renderOrder={3}
            >
              <meshBasicMaterial
                color="#ffffff"
                alphaMap={coreMask}
                transparent
                opacity={0.12}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
                fog={false}
                blending={THREE.NormalBlending}
              />
            </mesh>
          </group>
        ))}
      </group>
      <group position={[0, 0.35, 2.31]} rotation={[0.10, 0, 0]} scale={0.94}>
      <group position={[0, -0.25, -2.435]}>
      <mesh position={[0, 0.33, 2.33]}>
        <boxGeometry args={[1.89, 0.44, 0.17]} />
        <meshStandardMaterial
          color="#10171b"
          metalness={0.35}
          roughness={0.6}
        />
      </mesh>
      <mesh geometry={aero.tray} castShadow>
        <meshStandardMaterial color="#20282d" metalness={0.55} roughness={0.35} />
      </mesh>
      {[-0.42, 0, 0.42].map((x) => <mesh key={`divider-${x}`} position={[x, 0.27, 2.45]}>
        <boxGeometry args={[0.024, 0.36, 0.06]} />
        <meshStandardMaterial color="#283239" metalness={0.6} roughness={0.4} />
      </mesh>)}
      {[-0.63, -0.21, 0.21, 0.63].map((x) => (
        <group key={x} position={[x, 0.25, 2.435]}>
          <mesh>
            <circleGeometry args={[0.172, 32]} />
            <meshStandardMaterial color="#020508" />
          </mesh>
          <mesh>
            <torusGeometry args={[0.162, 0.016, 8, 32]} />
            <meshStandardMaterial
              color="#3a4248"
              metalness={0.8}
              roughness={0.33}
            />
          </mesh>
        </group>
      ))}
      <group ref={fans}>
        {[-0.63, -0.21, 0.21, 0.63].map((x) => (
          <group key={x} position={[x, 0.25, 2.45]}>
            {Array.from({ length: 9 }, (_, i) => (
              <mesh
                key={i}
                position={[
                  Math.sin((i * Math.PI * 2) / 9) * 0.09,
                  Math.cos((i * Math.PI * 2) / 9) * 0.09,
                  0,
                ]}
                rotation={[0, 0, (-i * Math.PI * 2) / 9 + 0.35]}
              >
                <boxGeometry args={[0.018, 0.13, 0.012]} />
                <meshStandardMaterial
                  color="#4c555b"
                  metalness={0.6}
                  roughness={0.5}
                />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.042, 12, 8]} />
              <meshStandardMaterial
                color="#70797d"
                metalness={0.9}
                roughness={0.3}
              />
            </mesh>
          </group>
        ))}
      </group>
      {[-0.85, -0.43, 0, 0.43, 0.85].map((x) => (
        <mesh key={x} position={[x, 0.16, 2.3]}>
          <boxGeometry args={[0.018, 0.23, 0.44]} />
          <meshStandardMaterial color="#11171b" />
        </mesh>
      ))}
      </group>
      </group>
      {THRUSTERS.map((n, i) => (
        <group
          key={n.id}
          ref={(node) => { if (n.kind === "rcs") sideOutlets.current[i] = node; }}
          position={n.position as [number, number, number]}
          quaternion={orientations[i]}
        >
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.13, 0.12, 0.15, 24]} />
            <meshStandardMaterial
              color="#242d34"
              metalness={0.65}
              roughness={0.38}
            />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.058, 0.095, 0.14, 32, 1, true]} />
            <meshStandardMaterial
              color="#a9a69e"
              metalness={0.93}
              roughness={0.25}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.092, 0.012, 8, 32]} />
            <meshStandardMaterial
              color="#bfc0b8"
              metalness={0.95}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.025, 0]}>
            <cylinderGeometry args={[0.053, 0.053, 0.008, 24]} />
            <meshStandardMaterial color="#03070b" />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.08, 12]} />
            <meshStandardMaterial
              color="#686f73"
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      <group ref={wing} position={[0, 0.81, 2.04]}>
        <mesh geometry={aero.wing} castShadow>
          <meshPhysicalMaterial
            color={color}
            metalness={0.4}
            roughness={0.22}
            clearcoat={1}
          />
        </mesh>
        <mesh position={[0, -0.025, -0.13]}>
          <boxGeometry args={[2.03, 0.022, 0.08]} />
          <meshStandardMaterial color="#10191e" />
        </mesh>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} position={[x, -0.18, -0.015]}>
            <boxGeometry args={[0.025, 0.36, 0.045]} />
            <meshStandardMaterial
              color="#8e979a"
              metalness={0.9}
              roughness={0.3}
            />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 1.04, 0.025, 0]}>
            <boxGeometry args={[0.014, 0.08, 0.4]} />
            <meshStandardMaterial color="#1a232a" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
