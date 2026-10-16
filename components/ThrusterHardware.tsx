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
      <mesh position={[0, 0.33, 2.33]}>
        <boxGeometry args={[1.89, 0.44, 0.17]} />
        <meshStandardMaterial
          color="#10171b"
          metalness={0.35}
          roughness={0.6}
        />
      </mesh>
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
      {THRUSTERS.map((n, i) => (
        <group
          key={n.id}
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
        <mesh castShadow>
          <boxGeometry args={[2.09, 0.035, 0.39]} />
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
