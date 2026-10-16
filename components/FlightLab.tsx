"use client";
import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Crosshair,
  Expand,
  Flag,
  Layers3,
  MousePointer2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  initialState,
  missions,
  stabilizerActive,
  flightMedal,
  type FlightState,
  type Input,
} from "../lib/flight";
import { STUNT_RAMP } from "../lib/stunt-ramp";
import { STUNT_REPLAY, STUNT_REPLAY_DURATION } from "../lib/stunt-replay";
import { AirBurstAudio, airBurstLevel } from "../lib/air-audio";
import OfficialMedia from "./OfficialMedia";
const World = dynamic(() => import("./World"), { ssr: false });
const colors = [
  { name: "Ano White", hex: "#ecece5" },
  { name: "Ultra Red", hex: "#be382c" },
  { name: "Quicksilver", hex: "#7d858b" },
  { name: "Stealth Black", hex: "#262d31" },
];
const emptyInput = (): Input => ({
  throttle: 0,
  steer: 0,
  lift: false,
  descend: false,
  boost: false,
});
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-error">
        <Wind size={40} />
        <h2>Unable to start the 3D engine</h2>
        <p>
          Enable hardware acceleration in your browser, then reload the page.
        </p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function CarDrawing() {
  return (
    <svg
      viewBox="0 0 240 75"
      fill="none"
      className="car-drawing"
      aria-label="Roadster technical side drawing"
    >
      <path
        d="M15 48 26 35 66 30 95 12 153 12 184 31 219 37 229 49 226 57 204 57M59 57h103M16 57h9"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="m72 30 26-15h52l26 16-104-1ZM20 43l40-4 105 1 55 5M90 35l-4 19M167 35l8 15M96 17l-5 12M145 17l13 13"
        stroke="currentColor"
        strokeWidth=".8"
      />
      <circle cx="43" cy="54" r="16" stroke="currentColor" />
      <circle cx="43" cy="54" r="11" stroke="currentColor" strokeWidth=".6" />
      <circle cx="185" cy="54" r="16" stroke="currentColor" />
      <circle cx="185" cy="54" r="11" stroke="currentColor" strokeWidth=".6" />
      <path
        d="M8 73h224M43 71v4m142-4v4M6 17v39m-3-39h6M3 56h6"
        stroke="currentColor"
        strokeWidth=".5"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
function Radar({
  state,
  missionIndex,
  free,
}: {
  state: FlightState;
  missionIndex: number;
  free: boolean;
}) {
  const m = missions[missionIndex];
  return (
    <svg viewBox="0 0 160 130" className="radar" aria-label="Route map">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M20 0H0v20"
            fill="none"
            stroke="currentColor"
            strokeWidth=".5"
            opacity=".18"
          />
        </pattern>
      </defs>
      <rect width="160" height="130" fill="url(#grid)" />
      <path
        d="M80 120V10"
        stroke="currentColor"
        opacity=".25"
        strokeDasharray="3 4"
      />
      {!free &&
        m.gates.map((g, i) => (
          <circle
            key={i}
            cx={80 + g.x * 0.5}
            cy={115 + g.z * 0.135}
            r="3"
            fill={
              i < state.nextGate
                ? "#6d876c"
                : i === state.nextGate
                  ? "#ee743c"
                  : "none"
            }
            stroke={i === state.nextGate ? "#ee743c" : "currentColor"}
          />
        ))}
      <path
        d="m0-5 4 9-4-2-4 2Z"
        fill="#ee743c"
        transform={`translate(${Math.max(6, Math.min(154, 80 + state.position.x * 0.5))},${Math.max(6, Math.min(124, 115 + state.position.z * 0.135))}) rotate(${(state.heading * 180) / Math.PI})`}
      />
    </svg>
  );
}
export default function FlightLab() {
  const [running, setRunning] = useState(false),
    [paused, setPaused] = useState(false),
    [free, setFree] = useState(false),
    [missionIndex, setMissionIndex] = useState(missions.length - 2),
    [color, setColor] = useState(0),
    [quality, setQuality] = useState("balanced"),
    [night, setNight] = useState(false),
    [demo, setDemo] = useState(false),
    [homeView, setHomeView] = useState<"photo" | "3d">("photo"),
    [modelView, setModelView] = useState<"front" | "side" | "rear">("side"),
    [photo, setPhoto] = useState(1),
    [cameraMode, setCameraMode] = useState(0),
    [reset, setReset] = useState(0),
    [replay, setReplay] = useState(false),
    [replaySeek, setReplaySeek] = useState({ time: 0, nonce: 0 }),
    [modal, setModal] = useState<"help" | "sources" | "settings" | "media" | null>(null),
    [sound, setSound] = useState(false),
    [ready, setReady] = useState(false),
    [telemetry, setTelemetry] = useState(initialState),
    [fps, setFps] = useState(0),
    [best, setBest] = useState(0),
    [courseBests, setCourseBests] = useState<Record<string, number>>({}),
    [tab, setTab] = useState<"mission" | "vehicle">("mission");
  const input = useRef<Input>(emptyInput()),
    keys = useRef(new Set<string>()),
    touch = useRef(new Set<string>()),
    audio = useRef<AirBurstAudio | null>(null),
    demoAudioRef = useRef(false),
    soundRef = useRef(false),
    dialog = useRef<HTMLDialogElement>(null);
  const mission = missions[missionIndex];
  const ended =
    telemetry.status === "crashed" || telemetry.status === "complete";
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "3d") setHomeView("3d");
    try {
      setBest(Number(localStorage.getItem("flightlab-best")) || 0);
      const saved = JSON.parse(localStorage.getItem("flightlab-courses") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved))
        setCourseBests(Object.fromEntries(Object.entries(saved).filter(([,v]) => typeof v === "number" && Number.isFinite(v)) as [string, number][]));
      const q = localStorage.getItem("flightlab-quality");
      if (q && ["low", "balanced", "high"].includes(q)) setQuality(q);
    } catch {}
  }, []);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      dialog.current?.focus();
    } else dialog.current?.close();
  }, [modal]);
  const updateInput = useCallback(() => {
    const has = (...names: string[]) =>
      names.some((k) => keys.current.has(k) || touch.current.has(k));
    input.current = {
      throttle: has("KeyW", "ArrowUp") ? 1 : has("KeyS", "ArrowDown") ? -1 : 0,
      steer:
        (has("KeyD", "ArrowRight") ? 1 : 0) -
        (has("KeyA", "ArrowLeft") ? 1 : 0),
      lift: has("Space"),
      descend: has("ControlLeft", "ControlRight"),
      boost: has("ShiftLeft", "ShiftRight"),
      barrel: has("KeyQ"),
    };
  }, []);
  const clearInput = useCallback(() => {
    keys.current.clear();
    touch.current.clear();
    input.current = emptyInput();
  }, []);
  const restart = useCallback(() => {
    clearInput();
    setReplaySeek({ time: 0, nonce: 0 });
    setReset((v) => v + 1);
    setPaused(false);
  }, [clearInput]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["SELECT", "INPUT"].includes((e.target as HTMLElement)?.tagName))
        return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (modal) setModal(null);
        else if (running) setPaused((v) => !v);
        clearInput();
        return;
      }
      if (modal) return;
      if (e.code === "KeyR") {
        restart();
        return;
      }
      if (e.code === "KeyC") {
        setCameraMode((v) => (v + 1) % 3);
        return;
      }
      keys.current.add(e.code);
      updateInput();
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      updateInput();
    };
    const blur = () => {
      clearInput();
      if (running) setPaused(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [running, modal, updateInput, clearInput, restart]);
  useEffect(() => {
    if (paused || modal) clearInput();
  }, [paused, modal, clearInput]);
  useEffect(
    () => () => {
      audio.current?.dispose();
    },
    [],
  );
  const onTelemetry = useCallback((s: FlightState, f: number) => {
    setTelemetry(s);
    setFps(f);
    audio.current?.update(
      airBurstLevel(
        s,
        demoAudioRef.current ? { ...input.current, lift: true } : input.current,
        soundRef.current,
      ),
    );
  }, []);
  useEffect(() => {
    soundRef.current =
      sound && (running || demo) && !paused && !modal && !ended;
    demoAudioRef.current = demo && !running;
    if (!soundRef.current) audio.current?.mute();
  }, [sound, running, demo, paused, modal, ended]);
  useEffect(() => {
    if (telemetry.status === "complete" && running && !replay) {
      setCourseBests(previous => {
        const updated = { ...previous, [mission.id]: Math.max(previous[mission.id] || 0, telemetry.score) };
        try { localStorage.setItem("flightlab-courses", JSON.stringify(updated)); } catch {}
        return updated;
      });
    }
  }, [telemetry.status, telemetry.score, running, replay, mission.id]);
  useEffect(() => {
    if (telemetry.status === "complete" && running && !replay)
      setBest((b) => {
        const next = Math.max(b, telemetry.score);
        try {
          localStorage.setItem("flightlab-best", String(next));
        } catch {}
        return next;
      });
  }, [telemetry.status, telemetry.score, replay, running]);
  const toggleSound = () => {
    if (!audio.current || audio.current.ctx.state === "closed")
      audio.current = new AirBurstAudio();
    void audio.current.resume();
    if (sound) audio.current.mute();
    setSound((v) => !v);
  };
  const launch = () => {
    setReplay(false);
    setDemo(false);
    restart();
    setRunning(true);
    setModal(null);
  };
  const openModal = (m: typeof modal) => {
    setModal(m);
    if (running) setPaused(true);
  };
  const goHome = () => {
    setReplay(false);
    setRunning(false);
    setPaused(false);
    restart();
  };
  const touchProps = (code: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      touch.current.add(code);
      updateInput();
    },
    onPointerUp: () => {
      touch.current.delete(code);
      updateInput();
    },
    onPointerCancel: () => {
      touch.current.delete(code);
      updateInput();
    },
    onLostPointerCapture: () => {
      touch.current.delete(code);
      updateInput();
    },
  });
  const next = mission.gates[telemetry.nextGate];
  const rampTarget = mission.id === "stunt" && !telemetry.stuntLaunched;
  const targetDistance = rampTarget
    ? Math.round(
        Math.hypot(
          STUNT_RAMP.x - telemetry.position.x,
          STUNT_RAMP.z - telemetry.position.z,
        ),
      )
    : next
      ? Math.round(
          Math.hypot(
            next.x - telemetry.position.x,
            next.z - telemetry.position.z,
          ),
        )
      : Math.round(
          Math.hypot(
            mission.landing.x - telemetry.position.x,
            mission.landing.z - telemetry.position.z,
          ),
        );
  return (
    <main
      className={`flight-app ${running ? "is-running" : ""} ${!running && homeView === "photo" ? "photo-home" : ""} ${night || (!running && homeView === "photo") ? "demo-night" : ""}`}
    >
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="Flight Lab home">
          <span className="brand-icon">↗</span>
          <span>
            ROADSTER<span className="brand-divider">/</span>
            <b>FLIGHT LAB</b>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={!modal ? "nav-active" : ""}
            onClick={() => setModal(null)}
          >
            Simulator
          </button>
          <button onClick={() => openModal("sources")}>
            Story & sources <ArrowUpRight size={12} />
          </button>
        </nav>
        <div className="top-right">
          <span className="concept">
            <i /> EXPERIMENTAL CONCEPT
          </span>
          <button
            className="icon-button"
            onClick={() => openModal("help")}
            aria-label="Controls & help"
          >
            <CircleHelp size={18} />
          </button>
          <button
            className="icon-button"
            onClick={() => openModal("settings")}
            aria-label="Settings"
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>
      <section className="viewport" aria-label="3D Roadster flight simulator">
        <div className="canvas-shell">
          <SceneBoundary>
            <World
              running={running}
              paused={paused || !!modal}
              free={free}
              mission={mission}
              color={colors[color].hex}
              quality={quality}
              night={night}
              demo={demo}
              cameraMode={cameraMode}
              modelView={modelView}
              reset={reset}
              replay={replay}
              replaySeek={replaySeek}
              input={input}
              onTelemetry={onTelemetry}
              onReady={useCallback(() => setReady(true), [])}
            />
          </SceneBoundary>
        </div>
        {!running && homeView === "photo" && <div className="official-photo">
          <img src={photo === 1 ? "/images/tesla-roadster-side.jpg" : "/images/tesla-roadster-front.jpg"}
            data-view={photo === 1 ? "side" : "front"}
            alt={photo === 1 ? "Actual Tesla Roadster — official Tesla side photograph" : "Actual Tesla Roadster — official Tesla front photograph"} fetchPriority="high" />
        </div>}
        <div className="scene-vignette" />
        {!running && homeView === "3d" && <div className="model-views" aria-label="Car inspection views">
          {(["front", "side", "rear"] as const).map((view) => <button key={view}
            aria-pressed={modelView === view} onClick={() => { setModelView(view); setReset((v) => v + 1); }}>
            {view === "front" ? "Front view" : view === "side" ? "Side view" : "Rear view"}
          </button>)}
        </div>}
        <div className="location">
          <span className="live-dot" />
          <span>{!running && homeView === "photo" ? "TESLA / OFFICIAL PHOTOGRAPHY" : "BLACK ROCK DESERT"}</span>
          <span className="location-divider">/</span>
          <span>40.9° N · 119.1° W</span>
        </div>
        <div className="weather">
          <Wind size={14} /> 3.2 m/s <span>NW</span>
          <span className="weather-line" /> 24°C <span>CLEAR</span>
        </div>
        {!running && (
          <div className="intro">
            <div className="eyebrow">
              <span className="line" /> THE WORLD IS NO LONGER TWO-DIMENSIONAL.
            </div>
            <h1>
              Give gravity
              <br />a <em>break.</em>
              <span className="title-dot">®</span>
            </h1>
            <p>
              Where the road ends, flight begins.
              <br />
              Take control of the Roadster. Leave the limits behind.
            </p>
            <div className="intro-actions">
              <button className="primary" onClick={launch} disabled={!ready}>
                {ready ? "Start flying" : "Preparing flight"}{" "}
                <ArrowUpRight size={19} />
              </button>
              <button
                className="watch-button"
                onClick={() => openModal("media")}
              >
                <span>
                  <Play size={12} fill="currentColor" />
                </span>
                Watch Tesla footage
              </button>
            </div>

            <div className="intro-note">
              <MousePointer2 size={13} /> {homeView === "photo" ? "Actual Tesla photography. Image © Tesla." : "Drag to inspect the car. Scroll to zoom."}
            </div>
            {homeView === "photo" && <div className="photo-choices">
              <button aria-pressed={photo === 1} onClick={() => setPhoto(1)}>Side photo</button>
              <button aria-pressed={photo === 0} onClick={() => setPhoto(0)}>Front photo</button>
            </div>}
            <button className="demo-trigger" onClick={() => {
              setHomeView(homeView === "photo" ? "3d" : "photo");
              setDemo(false);
            }}>{homeView === "photo" ? "Explore 3D simulator" : "Back to Tesla photos"} <ArrowUpRight size={13} /></button>
            {homeView === "3d" &&
            <button
              className={`demo-trigger ${demo ? "active" : ""}`}
              onClick={() => setDemo((v) => !v)}
            >
              <Wind size={14} />
              {demo ? "Stop thruster demo" : "Watch thruster demo"}
            </button>
            }
          </div>
        )}
        {!running && (
          <button
            className="stunt-trigger"
            onClick={() => {
              setMissionIndex(missions.length - 1);
              setFree(false);
              setDemo(false);
              restart();
              setReplay(true);
              setRunning(true);
            }}
          >
            Watch stunt replay <ArrowUpRight size={14} />
          </button>
        )}
        <div className="vehicle-caption">
          <span className="tiny-square" />
          <span>ROADSTER</span>
          <span className="caption-light">{!running && homeView === "photo" ? "OFFICIAL TESLA PHOTOGRAPHY" : "ROCKET CONCEPT"}</span>
          <span className="caption-line" />
        </div>
        {!running ? (
          <aside className="briefing">
            <div className="briefing-tabs">
              <button
                className={tab === "mission" ? "selected" : ""}
                onClick={() => setTab("mission")}
              >
                FLIGHT PLAN
              </button>
              <button
                className={tab === "vehicle" ? "selected" : ""}
                onClick={() => setTab("vehicle")}
              >
                VEHICLE
              </button>
              <span>
                {String(missionIndex + 1).padStart(2, "0")} /{" "}
                {String(missions.length).padStart(2, "0")}
              </span>
            </div>
            {tab === "mission" ? (
              <>
                <div className="briefing-title">
                  <span className="section-number">
                    {String(missionIndex + 1).padStart(2, "0")}
                  </span>
                  <Flag size={17} />
                </div>
                <h2>{free ? "Explore the limits" : mission.name}</h2>
                <p>
                  {free
                    ? "No objectives. Just you and the sky."
                    : mission.subtitle}
                </p>
                {mission.challenge && !free && <p className="challenge-brief">Center passes build a ×5 combo and restore air. Gold: 5 perfect passes in under 82.5s.</p>}
                {!!courseBests[mission.id] && !free && <div className="course-best">COURSE BEST · {courseBests[mission.id].toLocaleString("en-US")}</div>}
                <label className="mission-select">
                  <span>COURSE</span>
                  <select
                    value={missionIndex}
                    onChange={(e) => {
                      setMissionIndex(Number(e.target.value));
                      restart();
                    }}
                    disabled={free}
                  >
                    {missions.map((m, i) => (
                      <option key={m.id} value={i}>
                        {String(i + 1).padStart(2, "0")} — {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </label>
                <div className="mission-facts">
                  <div>
                    <span>{mission.id === "stunt" ? "FLIP" : "RINGS"}</span>
                    <b>
                      {free
                        ? "∞"
                        : mission.id === "stunt"
                          ? "01"
                          : String(mission.gates.length).padStart(2, "0")}
                    </b>
                  </div>
                  <div>
                    <span>TIME</span>
                    <b>
                      {free
                        ? "∞"
                        : `${Math.floor(mission.seconds / 60)}:${String(mission.seconds % 60).padStart(2, "0")}`}
                    </b>
                  </div>
                  <div>
                    <span>LEVEL</span>
                    <b className="difficulty">
                      {free ? "FREE" : mission.difficulty}
                    </b>
                  </div>
                </div>
                <div className="mode-switch">
                  <button
                    className={!free ? "active" : ""}
                    onClick={() => {
                      setFree(false);
                      restart();
                    }}
                  >
                    <Crosshair size={13} /> Mission flight
                  </button>
                  <button
                    className={free ? "active" : ""}
                    onClick={() => {
                      setFree(true);
                      restart();
                    }}
                  >
                    <Wind size={13} /> Free flight
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="briefing-title">
                  <span className="section-number">R</span>
                  <Zap size={17} />
                </div>
                <h2>Beyond the ground.</h2>
                <CarDrawing />
                <p>
                  White body. Gold glass.
                  <br />
                  Four independent lift thrusters.
                </p>
                <div className="spec-line">
                  <span>POWERTRAIN</span>
                  <b>All-electric</b>
                </div>
                <div className="spec-line">
                  <span>FLIGHT SYSTEM</span>
                  <b>Cold-gas concept</b>
                </div>
              </>
            )}
            <div className="briefing-bottom">
              <span className="live-dot" /> SYSTEMS READY <span>↗</span>
            </div>
          </aside>
        ) : (
          <>
            <div className="flight-heading">
              <span className="eyebrow">
                <Radio size={13} />{" "}
                {free ? "FREE FLIGHT" : mission.name.toLocaleUpperCase("en-US")}
              </span>
              <h2>
                {paused
                  ? "Flight on hold."
                  : mission.id === "stunt"
                    ? telemetry.rampProgress >= 0
                      ? "Grip beyond gravity."
                      : telemetry.stuntLaunched && !telemetry.flipComplete
                        ? "Recovering attitude."
                        : telemetry.flipComplete
                          ? "Stable. Line up to land."
                          : "Build speed for inversion."
                    : telemetry.position.y > 1
                      ? "The sky is your road."
                      : "Ready for liftoff."}
              </h2>
            </div>
            <aside className="flight-panel">
              <div className="panel-top">
                <span>{free ? "TELEMETRY" : "NEXT TARGET"}</span>
                <Radio size={13} />
              </div>
              <h3>
                {free
                  ? "Explore mode"
                  : mission.id === "stunt"
                    ? rampTarget
                      ? "Inverted ramp"
                      : !telemetry.flipComplete
                        ? "Flip & recover"
                        : "Landing pad"
                    : telemetry.nextGate < mission.gates.length
                      ? `Ring ${String(telemetry.nextGate + 1).padStart(2, "0")}`
                      : "Landing pad"}
              </h3>
              <div className="target-distance">
                {free ? Math.round(telemetry.distance) : targetDistance}
                <small> m</small>
              </div>
              <Radar
                state={telemetry}
                missionIndex={missionIndex}
                free={free}
              />
              <div className="panel-row">
                <span>{free ? "PEAK ALTITUDE" : "TARGET ALTITUDE"}</span>
                <b>
                  {free
                    ? telemetry.peak.toFixed(1)
                    : rampTarget
                      ? 36
                      : next?.y || 0}{" "}
                  m
                </b>
              </div>
              <div className="panel-row">
                <span>
                  {mission.id === "stunt" ? "FLIP RECOVERY" : "RINGS"}
                </span>
                <b>
                  {mission.id === "stunt"
                    ? telemetry.flipComplete
                      ? "STABLE"
                      : telemetry.rampProgress >= 0
                        ? "ON RAMP"
                        : telemetry.flipTimer >= 0
                          ? "RECOVERING"
                          : "READY"
                    : `${telemetry.nextGate} / ${mission.gates.length}`}
                </b>
              </div>
              <div className="panel-row">
                <span>TIME REMAINING</span>
                <b>
                  {free
                    ? "∞"
                    : `${Math.floor(Math.max(0, mission.seconds - telemetry.elapsed) / 60)}:${String(Math.floor(Math.max(0, mission.seconds - telemetry.elapsed) % 60)).padStart(2, "0")}`}
                </b>
              </div>
            </aside>
            <div className="flight-reticle">
              <span />
              <i />
              <span />
            </div>
            {!free && mission.challenge && <div className="challenge-hud" aria-label="Challenge progress">
              <div><span>AIR SLALOM</span><b>{telemetry.nextGate} / {mission.gates.length}</b></div>
              <div className="gate-progress">{mission.gates.map((_,i) => <i key={i} data-cleared={i < telemetry.nextGate} />)}</div>
              <div><span>{telemetry.perfectGates} PERFECT</span><b>COMBO ×{Math.max(1,telemetry.combo)}</b></div>
            </div>}
            {!ended && !paused && telemetry.elapsed - telemetry.rewardAt < 2 && telemetry.reward &&
              <div className="skill-reward" key={telemetry.rewardAt} role="status"><span>{telemetry.reward}</span>
                <b>+{telemetry.rewardPoints.toLocaleString("en-US")}</b>
                {telemetry.combo > 0 && <small>×{telemetry.combo} COMBO · AIR +6%</small>}
              </div>}
            <div className="flight-message" role="status">
              {telemetry.message}
            </div>
          </>
        )}
        <div className="scene-tools">
          <button
            onClick={toggleSound}
            aria-label={sound ? "Mute air bursts" : "Enable air bursts"}
            title={sound ? "Mute air bursts" : "Enable air bursts"}
          >
            {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button
            onClick={() => setCameraMode((v) => (v + 1) % 3)}
            aria-label="Change camera"
            title="Camera (C)"
          >
            <Layers3 size={17} />
          </button>
          {running && (
            <>
              <button
                onClick={() => setPaused((v) => !v)}
                aria-label={paused ? "Resume" : "Pause"}
              >
                {paused ? <Play size={17} /> : <Pause size={17} />}
              </button>
              <button onClick={restart} aria-label="Reset flight">
                <RotateCcw size={17} />
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (!document.fullscreenElement)
                void document.documentElement
                  .requestFullscreen?.()
                  .catch(() => {});
              else void document.exitFullscreen();
            }}
            aria-label="Fullscreen"
          >
            <Expand size={17} />
          </button>
        </div>
        {running && replay && (
          <div className="replay-controls">
            <span>{paused ? "REPLAY PAUSED" : "STUNT REPLAY"}</span>
            <input
              type="range"
              aria-label="Stunt replay position"
              min="0"
              max={STUNT_REPLAY_DURATION}
              step="0.5"
              value={telemetry.elapsed}
              onChange={(e) => {
                const time = Number(e.target.value);
                setReplaySeek((v) => ({ time, nonce: v.nonce + 1 }));
                setTelemetry(
                  STUNT_REPLAY[
                    Math.min(STUNT_REPLAY.length - 1, Math.round(time * 60))
                  ].state,
                );
                setPaused(true);
              }}
            />
            <span>{telemetry.elapsed.toFixed(1)}s</span>
          </div>
        )}
        {running && !replay && (
          <div className="touch-controls">
            <div className="touch-directions">
              <button {...touchProps("KeyW")} aria-label="Accelerate">
                <ArrowUp />
              </button>
              <div>
                <button {...touchProps("KeyA")} aria-label="Turn left">
                  <ArrowLeft />
                </button>
                <button {...touchProps("KeyS")} aria-label="Brake">
                  <ArrowDown />
                </button>
                <button {...touchProps("KeyD")} aria-label="Turn right">
                  <ArrowRight />
                </button>
              </div>
            </div>
            <div className="touch-flight">
              <button {...touchProps("KeyQ")} aria-label="Barrel roll">
                <RotateCcw size={18} />
              </button>
              <button {...touchProps("ShiftLeft")} aria-label="Boost">
                <Zap size={18} />
              </button>
              <button {...touchProps("ControlLeft")} aria-label="Descend">
                DOWN
              </button>
              <button
                className="lift"
                {...touchProps("Space")}
                aria-label="Climb"
              >
                FLY <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        )}
        {running && ((paused && !replay) || ended) && !modal && (
          <div className="pause-scrim">
            <div className="result-card">
              <span className="eyebrow">
                {ended
                  ? telemetry.status === "complete"
                    ? "MISSION COMPLETE"
                    : "ONE MORE FLIGHT?"
                  : "TAKE A BREATH."}
              </span>
              <h2>
                {ended
                  ? telemetry.status === "complete"
                    ? "The sky is yours."
                    : "Rise again."
                  : "The sky can wait."}
              </h2>
              <p>
                {ended
                  ? telemetry.message
                  : "Continue your flight whenever you are ready."}
              </p>
              {ended && (
                <div className="flight-medal" data-medal={flightMedal(telemetry, mission)}>
                  {flightMedal(telemetry, mission) && <><span>✦</span> {flightMedal(telemetry, mission)} FLIGHT</>}
                  {mission.challenge && <small>{telemetry.perfectGates} perfect passes · final combo ×{telemetry.combo}</small>}
                </div>
              )}
              {ended && (
                <div className="result-stats">
                  <span>
                    <b>{telemetry.score.toLocaleString("en-US")}</b>POINTS
                  </span>
                  <span>
                    <b>{telemetry.peak.toFixed(1)} m</b>PEAK ALTITUDE
                  </span>
                </div>
              )}
              <button
                className="primary"
                onClick={ended ? restart : () => setPaused(false)}
              >
                {ended
                  ? replay
                    ? "Replay again"
                    : "Fly again"
                  : "Resume flight"}{" "}
                <ArrowUpRight size={18} />
              </button>
              <button className="text-button" onClick={goHome}>
                Back to hangar
              </button>
              {telemetry.status === "complete" && !replay && <button className="text-button" onClick={() => {
                setMissionIndex((v) => (v+1)%missions.length); restart();
              }}>Next course →</button>}
            </div>
          </div>
        )}
      </section>
      <section className="instrument-bar" aria-label="Flight instruments">
        <div className="vehicle-spec">
          <div className="instrument-label">
            TESLA ROADSTER <span>ROCKET</span>
          </div>
          <CarDrawing />
        </div>
        <div className="instrument speed">
          <span className="instrument-label">GROUND SPEED</span>
          <div>
            <b>
              {Math.round(telemetry.speed * 3.6)
                .toString()
                .padStart(3, "0")}
            </b>
            <span>km/h</span>
          </div>
          <div className="micro-bars">
            {Array.from({ length: 22 }, (_, i) => (
              <i
                key={i}
                className={i < (telemetry.speed / 80) * 22 ? "filled" : ""}
              />
            ))}
          </div>
        </div>
        <div className="instrument altitude">
          <span className="instrument-label">ALTITUDE</span>
          <div>
            <b>{telemetry.position.y.toFixed(1)}</b>
            <span>meters</span>
          </div>
          <span className="instrument-foot">
            <span className="live-dot" />
            {telemetry.position.y > 1 ? "AIRBORNE" : "GROUNDED"}
          </span>
        </div>
        <div className="instrument pressure">
          <span className="instrument-label">
            THRUSTER PRESSURE <Zap size={12} />
          </span>
          <div>
            <b>{Math.round(telemetry.pressure)}</b>
            <span>%</span>
          </div>
          <div className="pressure-track">
            <i style={{ width: `${telemetry.pressure}%` }} />
          </div>
          <span className="instrument-foot">
            {telemetry.pressure <= 0 ? "ASSIST: NO PRESSURE"
              : running && !paused && !modal && stabilizerActive(telemetry)
                ? "AUTO LANDING ASSIST" : "LANDING ASSIST STANDBY"}
          </span>
        </div>
        <div className="paint-panel">
          <span className="instrument-label">BODY COLOR</span>
          <div className="swatches">
            {colors.map((c, i) => (
              <button
                key={c.name}
                aria-label={c.name}
                title={c.name}
                aria-pressed={color === i}
                onClick={() => setColor(i)}
                style={{ "--swatch": c.hex } as React.CSSProperties}
                className={color === i ? "active" : ""}
              >
                {color === i && <Check size={12} />}
              </button>
            ))}
          </div>
          <span className="paint-name">{colors[color].name}</span>
        </div>
        <div className="score-panel">
          <span className="instrument-label">
            {running ? "FLIGHT SCORE" : "PERSONAL BEST"}
          </span>
          <b>
            {(running ? telemetry.score : best)
              .toLocaleString("en-US")
              .padStart(4, "0")}
          </b>
          <span className="instrument-foot">REACH FOR MORE ↗</span>
        </div>
      </section>
      <footer className="footer">
        <div className="keyboard-hints">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> Drive
          </span>
          <span>
            <kbd>SPACE</kbd> Climb
          </span>
          <span>
            <kbd>CTRL</kbd> Descend
          </span>
          <span>
            <kbd>SHIFT</kbd> Boost
          </span>
          <span>
            <kbd>Q</kbd> Roll
          </span>
          <span>
            <kbd>C</kbd> Camera
          </span>
          <span>
            <kbd>R</kbd> Reset
          </span>
        </div>
        <div className="footer-meta">
          <span className="live-dot" />
          {fps || "—"} FPS <span>·</span>
          <button onClick={() => openModal("settings")}>
            {quality === "high"
              ? "HIGH"
              : quality === "low"
                ? "LOW"
                : "BALANCED"}
          </button>
          <span className="footer-version">v1.0</span>
        </div>
      </footer>
      <p className="project-credit">
        An independent fan project made for fun. Not affiliated with, endorsed
        by, or sponsored by Tesla, Inc. Created by{" "}
        <a href="https://x.com/ersinkoc" target="_blank" rel="noopener noreferrer">
          @ersinkoc
        </a>.
      </p>
      <dialog
        ref={dialog}
        className={`modal ${modal === "sources" || modal === "media" ? "sources-modal" : ""}`}
        onCancel={() => setModal(null)}
        aria-labelledby="modal-title"
      >
        <button
          className="modal-close icon-button"
          onClick={() => setModal(null)}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        {modal === "media" ? <OfficialMedia /> : modal === "help" ? (
          <>
            <span className="eyebrow">PILOT HANDBOOK / 001</span>
            <h2 id="modal-title">You are in control.</h2>
            <p>
              Build speed on the runway. Hold SPACE to climb; release it to
              descend under gravity. Use short thrust bursts before landing to
              slow your descent.
            </p>
            {mission.id === "stunt" && (
              <p className="help-tip">
                Stunt course: hold W and approach above 87 km/h. Suction carries
                you upside down; flip recovery is automatic. Brake with S for
                the H landing pad.
              </p>
            )}
            <div className="help-grid">
              {[
                ["W / ↑", "Accelerate"],
                ["S / ↓", "Brake"],
                ["A D / ← →", "Steer"],
                ["SPACE", "Hold to climb"],
                ["CTRL", "Descend faster"],
                ["SHIFT", "Boost"],
                ["Q", "Aerial barrel roll"],
                ["C", "Change camera"],
                ["R", "Reset flight"],
                ["ESC", "Pause / resume"],
              ].map(([key, text]) => (
                <div key={key}>
                  <kbd>{key}</kbd>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <p className="help-tip">
              <Zap size={17} /> Pressure is limited and recharges on the ground.
              Fly through the rings in order, then land gently on the H pad
              below 18 km/h. Landing assist fires automatic air bursts near the
              ground to slow a fast descent and level the car. It uses the same
              pressure reserve and cannot always recover a last-second fall.
            </p>
            <button className="primary" onClick={() => setModal(null)}>
              Got it <Check size={16} />
            </button>
          </>
        ) : modal === "settings" ? (
          <>
            <span className="eyebrow">FLIGHT PREFERENCES</span>
            <h2 id="modal-title">Make it yours.</h2>
            <label className="setting-row">
              <span>
                Scene lighting
                <small>Night lighting makes the gas jets easier to see.</small>
              </span>
              <select
                value={night ? "night" : "day"}
                onChange={(e) => setNight(e.target.value === "night")}
              >
                <option value="night">Demo night</option>
                <option value="day">Desert daylight</option>
              </select>
            </label>
            <label className="setting-row">
              <span>
                Graphics quality
                <small>
                  Low quality disables shadows and reduces pixel density.
                </small>
              </span>
              <select
                value={quality}
                onChange={(e) => {
                  setQuality(e.target.value);
                  try {
                    localStorage.setItem("flightlab-quality", e.target.value);
                  } catch {}
                }}
              >
                <option value="low">Low</option>
                <option value="balanced">Balanced</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="setting-row">
              <span>
                Camera<small>Press C to change it during flight.</small>
              </span>
              <select
                value={cameraMode}
                onChange={(e) => setCameraMode(Number(e.target.value))}
              >
                <option value={0}>Chase</option>
                <option value={1}>Close chase</option>
                <option value={2}>Wide view</option>
              </select>
            </label>
            <div className="setting-row">
              <span>
                Thruster air bursts
                <small>
                  Short compressed-air bursts when the thrusters fire.
                </small>
              </span>
              <button className="setting-toggle" onClick={toggleSound}>
                {sound ? "On" : "Off"}{" "}
                {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>
            <p className="small-note">
              A fan-made arcade experience. Flight dynamics and telemetry are
              designed for gameplay and do not represent real vehicle
              performance. Not affiliated with Tesla or SpaceX.
            </p>
          </>
        ) : (
          <>
            <span className="eyebrow">
              INSPIRED BY REALITY. POWERED BY IMAGINATION.
            </span>
            <h2 id="modal-title">
              More than
              <br />a car.
            </h2>
            <p>
              Inspired by the October 15, 2026 demonstration and Tesla’s current
              Roadster design. The angular white body, gold glass and cold-gas
              thrusters reference the official design; desert courses and flight
              physics are created for this game.
            </p>
            <a
              className="source-video"
              href="https://www.youtube.com/watch?v=cvKIR-c1SsU"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src="https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Roadster-03-Carousel-Slide-1-Desktop.jpg"
                alt="The new white Roadster in an official Tesla image"
              />
              <span className="video-play">
                <Play fill="currentColor" size={22} />
              </span>
              <span className="video-caption">
                TESLA / THE LAST BEST DRIVER’S CAR <ArrowUpRight size={16} />
              </span>
            </a>
            <div className="source-list">
              <a
                href="https://www.tesla.com/roadster"
                target="_blank"
                rel="noreferrer"
              >
                <span>01</span>
                <div>
                  <b>Tesla · Roadster</b>
                  <small>
                    Primary source · Design, fan system, and Thrust / Rocket
                    variants
                  </small>
                </div>
                <ArrowUpRight size={18} />
              </a>
              <a
                href="https://www.youtube.com/watch?v=7p5LxFdc-Qg"
                target="_blank"
                rel="noreferrer"
              >
                <span>02</span>
                <div>
                  <b>Demonstration video</b>
                  <small>
                    Visual reference for aerial maneuvers and thruster-assisted
                    landing
                  </small>
                </div>
                <ArrowUpRight size={18} />
              </a>
              <a
                href="https://x.com/elonmusk/status/2110913107094606330"
                target="_blank"
                rel="noreferrer"
              >
                <span>03</span>
                <div>
                  <b>Elon Musk · Original post</b>
                  <small>
                    X · October 16, 2026 · Original post sharing the flight
                    video
                  </small>
                </div>
                <ArrowUpRight size={18} />
              </a>
            </div>
            <div className="source-disclaimer">
              <b>Reality / gameplay</b>
              <p>
                Tesla attributes flight capability to the Rocket version and
                states that it is not approved for public road use. Extended
                flights, pressure recharge, speeds and missions here are
                fictional. Image: Tesla.
              </p>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
