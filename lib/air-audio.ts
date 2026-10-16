import type { FlightState, Input } from "./flight";
import { THRUSTERS, thrusterPower } from "./thrusters";

export function airBurstLevel(
  state: FlightState,
  input: Input,
  enabled: boolean,
) {
  const power = THRUSTERS.reduce(
    (maximum, _, i) =>
      Math.max(maximum, thrusterPower(i, state, input, enabled)),
    0,
  );
  return power > 0 ? 0.12 + power * 0.2 : 0;
}

/** Filtered air noise with a quick valve attack, short release, and silence between bursts. */
export class AirBurstAudio {
  readonly ctx: AudioContext;
  private readonly source: AudioBufferSourceNode;
  private readonly gain: GainNode;
  private nextBurst = 0;

  constructor() {
    this.ctx = new AudioContext();
    const buffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * 2,
      this.ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    const highpass = this.ctx.createBiquadFilter(),
      lowpass = this.ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 700;
    highpass.Q.value = 0.5;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 6500;
    lowpass.Q.value = 0.5;
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0;
    this.source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.source.start();
  }

  update(level: number) {
    if (this.ctx.state !== "running") return;
    if (level <= 0) {
      this.mute();
      return;
    }
    const now = this.ctx.currentTime;
    this.nextBurst = Math.max(this.nextBurst, now + 0.003);
    while (this.nextBurst < now + 0.12) {
      const start = this.nextBurst;
      this.gain.gain.setValueAtTime(0.0001, start);
      this.gain.gain.exponentialRampToValueAtTime(
        Math.min(0.4, level),
        start + 0.007,
      );
      this.gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.105);
      this.gain.gain.setValueAtTime(0, start + 0.12);
      this.nextBurst = start + 0.21;
    }
  }

  mute() {
    if (this.ctx.state === "closed") return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setTargetAtTime(0, now, 0.008);
    this.nextBurst = now;
  }
  resume() {
    return this.ctx.resume();
  }
  dispose() {
    this.source.stop();
    this.source.disconnect();
    this.gain.disconnect();
    void this.ctx.close();
  }
}
