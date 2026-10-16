"use client";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ComponentRef,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Sky, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Roadster from "./Roadster";
import ThrusterHardware from "./ThrusterHardware";
import ThrusterEffects from "./ThrusterEffects";
import StuntRamp from "./StuntRamp";
import { STUNT_RAMP, flipRecovery } from "../lib/stunt-ramp";
import { STUNT_REPLAY } from "../lib/stunt-replay";
import { BUILDING_PARTS } from "../lib/buildings";
import {
  initialState,
  stepFlight,
  rampHeight,
  type FlightState,
  type Input,
  type Mission,
} from "../lib/flight";

export type WorldProps = {
  running: boolean;
  paused: boolean;
  free: boolean;
  mission: Mission;
  color: string;
  quality: string;
  night: boolean;
  demo: boolean;
  cameraMode: number;
  modelView: "front" | "side" | "rear";
  reset: number;
  replay: boolean;
  replaySeek: { time: number; nonce: number };
  input: MutableRefObject<Input>;
  onTelemetry: (state: FlightState, fps: number) => void;
  onReady: () => void;
};
function terrainGeometry() {
  const g = new THREE.PlaneGeometry(4000, 4000, 100, 100);
  g.rotateX(-Math.PI / 2);
  const a = g.attributes.position;
  const colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < a.count; i++) {
    const x = a.getX(i),
      z = a.getZ(i);
    const n =
      Math.sin(x * 0.04) * Math.cos(z * 0.03) * 0.5 +
      Math.sin(x * 0.13 + z * 0.08) * 0.15;
    a.setY(i, -0.13 + (Math.abs(x) > 40 ? n * 0.8 : 0));
    c.setHSL(0.1, 0.16, 0.7 + n * 0.035);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}
function mountainGeometry() {
  const g = new THREE.PlaneGeometry(Math.PI * 2, 1, 180, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = p.getX(i) + Math.PI,
      r = (p.getY(i) + 0.5) * 850 + 1000;
    const profile = Math.sin(((r - 1000) / 850) * Math.PI);
    const height =
      (45 +
        Math.sin(a * 13) * 16 +
        Math.sin(a * 29) * 12 +
        Math.sin(a * 47) * 7) *
      profile;
    p.setXYZ(i, Math.cos(a) * r, height - 4, Math.sin(a) * r);
  }
  g.computeVertexNormals();
  return g;
}
function Desert({ night }: { night: boolean }) {
  const terrain = useMemo(terrainGeometry, []);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const ramp = useMemo(() => {
    const g = new THREE.PlaneGeometry(16, 30, 1, 30);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i) - 50;
      p.setZ(i, z);
      p.setY(i, rampHeight(0, z) + 0.02);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const rampWalls = useMemo(() => {
    const vertices: number[] = [];
    for (let i = 0; i < 60; i++) {
      const a = -35 - i * 0.5, b = a - 0.5;
      const ha = rampHeight(0, a), hb = rampHeight(0, b);
      for (const x of [-8, 8]) vertices.push(
        x, -0.1, a, x, ha, a, x, hb, b,
        x, -0.1, a, x, hb, b, x, -0.1, b,
      );
    }
    vertices.push(-8, -0.1, -65, 8, -0.1, -65, 8, 6, -65,
      -8, -0.1, -65, 8, 6, -65, -8, 6, -65);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mountains = useMemo(mountainGeometry, []);
  useEffect(() => {
    if (!rocks.current) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < 180; i++) {
      const x = Math.sin(i * 73.12) * 1000;
      o.position.set(
        x < 0 ? x - 45 : x + 45,
        -0.03,
        Math.cos(i * 18.45) * 1200,
      );
      o.rotation.set(0, i, 0);
      o.scale.set(2 + (i % 5), 0.25 + (i % 3) * 0.1, 0.7 + (i % 3));
      o.updateMatrix();
      rocks.current.setMatrixAt(i, o.matrix);
    }
    rocks.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <mesh geometry={terrain} receiveShadow>
        <meshStandardMaterial
          vertexColors
          color={night ? "#505c6b" : "#ffffff"}
          roughness={1}
        />
      </mesh>
      <mesh geometry={mountains}>
        <meshStandardMaterial
          color="#acaa9c"
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <instancedMesh ref={rocks} args={[undefined, undefined, 180]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#b5ab9b" roughness={1} />
      </instancedMesh>
      <mesh position={[0, -0.035, -335]} receiveShadow>
        <boxGeometry args={[20, 0.04, 850]} />
        <meshStandardMaterial
          color={night ? "#424e5d" : "#a7a399"}
          roughness={1}
        />
      </mesh>
      <mesh geometry={ramp} receiveShadow>
        <meshStandardMaterial
          color="#828b7d"
          roughness={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={rampWalls} castShadow receiveShadow>
        <meshStandardMaterial color="#687268" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {[-10, 10].map((x) => (
        <mesh key={x} position={[x, 0, -335]}>
          <boxGeometry args={[0.13, 0.02, 850]} />
          <meshBasicMaterial color="#e8e5db" />
        </mesh>
      ))}
      {Array.from({ length: 55 }, (_, i) => (
        <mesh key={i} position={[0, 0.006, 65 - i * 15]}>
          <boxGeometry args={[0.18, 0.02, 6]} />
          <meshBasicMaterial color="#eae8dc" />
        </mesh>
      ))}
      {Array.from({ length: 30 }, (_, i) => (
        <group key={i} position={[0, 0, 65 - i * 28]}>
          {[-12, 12].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 0.25, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 0.5, 6]} />
                <meshStandardMaterial color="#544e45" />
              </mesh>
              <mesh position={[0, 0.53, 0]}>
                <sphereGeometry args={[0.13, 8, 6]} />
                <meshBasicMaterial color="#ef9e4c" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {BUILDING_PARTS.map((part) => (
        <mesh key={part.id} position={part.position} castShadow>
          <boxGeometry args={part.size} />
          <meshStandardMaterial color={part.color} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[100, 12, 65]}>
        <cylinderGeometry args={[0.1, 0.2, 24, 8]} />
        <meshStandardMaterial color="#666d69" />
      </mesh>
      <mesh position={[103, 22, 65]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[6, 1.3, 0.05]} />
        <meshStandardMaterial color="#e9713e" side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[-38, 0.6, 5 + i * 4]}>
          <boxGeometry args={[1.3, 1.2, 2]} />
          <meshStandardMaterial color={i % 2 ? "#efe8d8" : "#de774b"} />
        </mesh>
      ))}
    </group>
  );
}
function FlightScene(p: WorldProps) {
  const car = useRef<THREE.Group>(null);
  const state = useRef(initialState());
  const timer = useRef(0);
  const count = useRef(0);
  const frameTime = useRef(0);
  const ready = useRef(false);
  const inspection = useRef<ComponentRef<typeof OrbitControls>>(null);
  const inspecting = useRef(false);
  useEffect(() => { inspecting.current = false; }, [p.modelView]);
  const replayFrames = STUNT_REPLAY;
  const replayClock = useRef(0);
  const replayIndex = useRef(0);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const visualInput = useRef<Input>({ ...p.input.current });
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    inspecting.current = false;
    state.current = initialState();
    if (p.running && p.mission.id === "stunt") {
      state.current.position.x = STUNT_RAMP.x;
      state.current.message =
        "STUNT RAMP — hold W. Reach 87+ km/h. Flip recovery is automatic; S to brake for landing.";
    }
    timer.current = 0;
    p.onTelemetry(state.current, 0);
  }, [p.reset, p.mission, p.onTelemetry, p.demo, p.running]);
  useEffect(() => {
    if (p.replay) {
      replayClock.current = p.replaySeek.time;
      replayIndex.current = Math.min(
        replayFrames.length - 1,
        Math.round(p.replaySeek.time * 60),
      );
      state.current = replayFrames[replayIndex.current].state;
      p.onTelemetry(state.current, 0);
    }
  }, [p.replay, p.replaySeek, p.reset, p.onTelemetry, replayFrames]);
  useFrame(({ camera, clock, size }, delta) => {
    if (!ready.current) {
      ready.current = true;
      p.onReady();
    }
    if (p.running && !p.paused && p.replay) {
      replayClock.current += delta;
      replayIndex.current = Math.min(
        replayFrames.length - 1,
        Math.floor(replayClock.current * 60),
      );
      state.current = replayFrames[replayIndex.current].state;
    } else if (p.running && !p.paused)
      state.current = stepFlight(
        state.current,
        p.input.current,
        delta,
        p.mission,
        p.free,
      );
    const demo = p.demo && !p.running;
    if (demo) {
      const t = clock.elapsedTime;
      state.current.position.y = 1.5 + (1 + Math.sin(t * 0.8)) * 0.45;
      state.current.vertical = Math.cos(t * 0.8) * 0.36;
    }
    const controls = p.replay
      ? replayFrames[replayIndex.current].input
      : p.input.current;
    visualInput.current = {
      ...controls,
      lift: demo || controls.lift,
      throttle: demo ? 1 : controls.throttle,
      boost: demo ? Math.sin(clock.elapsedTime * 1.4) > 0.7 : controls.boost,
    };
    const s = state.current,
      pos = s.position;
    if (car.current) {
      car.current.position.set(
        pos.x,
        pos.y + 0.015 * Math.cos(s.rampProgress >= 0 ? s.pitch : 0),
        pos.z + (s.rampProgress >= 0 ? 0.015 * Math.sin(s.pitch) : 0),
      );
      const rampPitch =
        rampHeight(pos.x, pos.z) > 0 && pos.y <= rampHeight(pos.x, pos.z) + 0.1
          ? Math.atan(((-pos.z - 35) / 30) * 0.4)
          : 0;
      car.current.rotation.set(
        s.rampProgress >= 0 || s.stuntLaunched
          ? s.pitch
          : rampPitch || s.pitch,
        s.flipTimer >= 0 && !s.flipComplete
          ? -s.heading *
              flipRecovery(s.flipTimer)
          : -s.heading,
        s.roll,
      );
    }
    if (keyLight.current) {
      keyLight.current.position.set(pos.x + 25, pos.y + 35, pos.z - 20);
      keyLight.current.target.position.set(pos.x, pos.y, pos.z);
      keyLight.current.target.updateMatrixWorld();
    }
    if (!p.running) {
      const t = clock.elapsedTime * 0.025;
      cameraTarget.set(
        demo ? 7.2 + Math.sin(t) * 1.2 : 9 + Math.sin(t) * 1.2,
        demo ? 3.8 : 4.2,
        demo ? 32.5 : 14,
      );
      lookTarget.set(0, demo ? pos.y + 0.5 : 0.7, 24);
      if (!inspecting.current) {
        cameraTarget.set(pos.x + (p.modelView === "side" ? 7.5 : 0), pos.y + 0.75,
          pos.z + (p.modelView === "front" ? -5.5 : p.modelView === "rear" ? 5.5 : 0));
        lookTarget.set(pos.x, pos.y + 0.75, pos.z);
      }
    } else {
      const h = s.heading;
      const dist = p.cameraMode === 1 ? 6.5 : p.cameraMode === 2 ? 24 : 10;
      const height = p.cameraMode === 1 ? 2.3 : p.cameraMode === 2 ? 18 : 4.3;
      cameraTarget.set(
        pos.x - Math.sin(h) * dist + (p.cameraMode === 1 ? 3 : 0),
        pos.y + height,
        pos.z + Math.cos(h) * dist,
      );
      lookTarget.set(
        pos.x + Math.sin(h) * 9,
        pos.y + 1,
        pos.z - Math.cos(h) * 9,
      );
      if (p.mission.id === "stunt" && p.cameraMode !== 1) {
        cameraTarget.set(
          pos.x + (s.stuntLaunched ? 10 : 24),
          pos.y + (s.stuntLaunched ? 4 : 11),
          pos.z + (s.stuntLaunched ? 12 : 20),
        );
        lookTarget.set(pos.x, pos.y + 1, pos.z);
      }
    }
    if (p.running || !inspecting.current) {
      camera.position.lerp(cameraTarget, p.running ? 1 - Math.exp(-delta * 5) : 0.04);
      camera.lookAt(lookTarget);
    }
    if (inspection.current && !p.running)
      inspection.current.target.set(pos.x, pos.y + 0.65, pos.z);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(
        camera.fov,
        !p.running ? (size.width < size.height * 0.8 ? 55 : 37) : 48,
        4,
        Math.min(delta, 0.05),
      );
      camera.updateProjectionMatrix();
    }
    timer.current += delta;
    count.current++;
    frameTime.current += delta;
    if (timer.current > 0.1) {
      p.onTelemetry(
        { ...s, position: { ...s.position } },
        Math.round(count.current / frameTime.current),
      );
      timer.current = 0;
      if (frameTime.current > 1) {
        frameTime.current = 0;
        count.current = 0;
      }
    }
  });
  return (
    <>
      <OrbitControls ref={inspection} enabled={!p.running} enablePan={false}
        minDistance={4.5} maxDistance={18} minPolarAngle={0.12} maxPolarAngle={1.6}
        rotateSpeed={0.6} zoomSpeed={0.65} onStart={() => { inspecting.current = true; }} />
      <fog
        attach="fog"
        args={[
          p.night ? "#111a25" : "#d8ccba",
          p.night ? 80 : 180,
          p.night ? 650 : 1700,
        ]}
      />
      {p.night ? (
        <color attach="background" args={["#080d16"]} />
      ) : (
        <Sky
          distance={45000}
          sunPosition={[70, 22, -100]}
          turbidity={4}
          rayleigh={0.4}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}
      <ambientLight intensity={p.night ? 0.08 : 0.4} />
      <hemisphereLight
        args={[
          p.night ? "#a7c4e0" : "#fff5de",
          p.night ? "#202732" : "#8f8270",
          p.night ? 0.25 : 1.2,
        ]}
      />
      <directionalLight
        ref={keyLight}
        position={[25, 45, -30]}
        intensity={p.night ? 1.2 : 2}
        color={p.night ? "#c5def5" : "#fff8eb"}
        castShadow={p.quality !== "low"}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.001}
      />
      <Suspense fallback={null}>
        <Environment
          resolution={128}
          frames={1}
          environmentIntensity={p.night ? 0.32 : 1}
        >
          <Lightformer
            position={[0, 8, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[20, 20, 1]}
            intensity={2}
          />
          <Lightformer
            position={[-8, 3, 0]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[6, 4, 1]}
            intensity={3}
          />
          <Lightformer position={[5, 5, -4]} rotation={[Math.PI / 4, -Math.PI / 4, 0]}
            scale={[2, 12, 1]} intensity={1.5} />
        </Environment>
      </Suspense>
      <Desert night={p.night} />
      <StuntRamp />
      <group ref={car} position={[0, 0, 24]}>
        <Roadster
          color={p.color}
          speed={p.running && !p.paused ? state.current.speed : 0}
        />
        <ThrusterHardware
          state={state}
          input={visualInput}
          active={(p.running && !p.paused) || (p.demo && !p.running)}
          color={p.color}
        />
      </group>
      <ThrusterEffects
        car={car}
        state={state}
        input={visualInput}
        active={(p.running && !p.paused) || (p.demo && !p.running)}
        quality={p.quality}
        reset={p.reset + (p.demo ? 100000 : 0)}
        night={p.night}
      />
      {!p.free &&
        p.mission.gates.map((g, i) => (
          <group key={i} position={[g.x, g.y, g.z]}>
            <mesh>
              <torusGeometry args={[g.radius, 0.13, 8, 64]} />
              <meshStandardMaterial
                color={
                  i < state.current.nextGate
                    ? "#839a83"
                    : i === state.current.nextGate
                      ? "#f77738"
                      : "#d9cbb2"
                }
                emissive={i === state.current.nextGate ? "#d94d19" : "#000"}
                emissiveIntensity={0.45}
                metalness={0.35}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, -g.y / 2, 0]}>
              <cylinderGeometry args={[0.045, 0.045, g.y, 5]} />
              <meshStandardMaterial color="#b2a692" transparent opacity={0.6} />
            </mesh>
            <mesh position={[0, 0.6 - g.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[g.radius * 0.3, g.radius * 0.32, 32]} />
              <meshBasicMaterial color="#c08453" transparent opacity={0.4} />
            </mesh>
          </group>
        ))}
      <group position={[p.mission.landing.x, 0.03, p.mission.landing.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[23, 64]} />
          <meshStandardMaterial color="#929c86" roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[21.5, 22, 64]} />
          <meshBasicMaterial color="#ece8d5" />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <boxGeometry args={[9, 0.02, 1.2]} />
          <meshBasicMaterial color="#e7e4d1" />
        </mesh>
        {[-4, 4].map((x) => (
          <mesh key={x} position={[x, 0.03, 0]}>
            <boxGeometry args={[1.2, 0.02, 10]} />
            <meshBasicMaterial color="#e7e4d1" />
          </mesh>
        ))}
      </group>
    </>
  );
}
export default function World(props: WorldProps) {
  return (
    <Canvas
      shadows={props.quality === "low" ? false : "percentage"}
      dpr={
        props.quality === "high"
          ? [1, 1.75]
          : props.quality === "low"
            ? 1
            : [1, 1.25]
      }
      camera={{ position: [9, 4.2, 14], fov: 48, near: 0.1, far: 5000 }}
      gl={{
        antialias: props.quality !== "low",
        powerPreference: "high-performance",
      }}
    >
      <FlightScene {...props} />
    </Canvas>
  );
}
