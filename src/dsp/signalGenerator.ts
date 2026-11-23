import { CompositeComponent, GeneratedMessage, SignalParams } from '../types/simulation';
import { SeededRNG } from './prng';

/**
 * Generates a common discrete-time baseband message signal (3-5 kHz)
 * shared identically by both AM and FM modulators.
 */
export function generateMessageSignal(params: SignalParams): GeneratedMessage {
  const fs = Math.max(200_000, Math.min(params.samplingFreqHz, 3_000_000));
  const durationSec = Math.max(0.001, Math.min(params.durationMs / 1000, 0.02));
  const numSamples = Math.min(60_000, Math.max(256, Math.round(fs * durationSec)));
  const dt = 1 / fs;

  const timeSec = new Float64Array(numSamples);
  const normalized = new Float64Array(numSamples);
  const messageV = new Float64Array(numSamples);

  const fCenter = Math.max(3000, Math.min(5000, params.messageFreqHz));
  const components: CompositeComponent[] = [];
  let fMaxHz = fCenter;

  if (params.mode === 'single') {
    components.push({ freqHz: fCenter, amplitude: 1.0, phaseRad: 0 });
    const omega = 2 * Math.PI * fCenter;
    for (let i = 0; i < numSamples; i++) {
      const t = i * dt;
      timeSec[i] = t;
      normalized[i] = Math.cos(omega * t);
    }
  } else {
    const rng = new SeededRNG(params.seed + 101);
    const fLow = Math.max(3000, Math.min(4600, Math.round(fCenter - 650)));
    const fMid = Math.round(fCenter);
    const fHigh = Math.max(3200, Math.min(5000, Math.round(fCenter + 600)));
    const freqSet = Array.from(new Set([fLow, fMid, fHigh, 4850]))
      .map((f) => Math.max(3000, Math.min(5000, f)))
      .sort((a, b) => a - b);

    // Ensure at least 3 distinct frequencies in 3-5 kHz
    if (freqSet.length < 3) {
      for (const fallback of [3150, 4050, 4900]) {
        if (!freqSet.includes(fallback)) freqSet.push(fallback);
      }
      freqSet.sort((a, b) => a - b);
    }

    fMaxHz = freqSet[freqSet.length - 1];
    for (let c = 0; c < freqSet.length; c++) {
      const isPrimary = Math.abs(freqSet[c] - fMid) < 50;
      components.push({
        freqHz: freqSet[c],
        amplitude: isPrimary ? 1.0 : Number((0.45 + 0.4 * rng.nextUniform()).toFixed(3)),
        phaseRad: Number((rng.nextUniform() * 2 * Math.PI).toFixed(4)),
      });
    }

    let maxAbs = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i * dt;
      timeSec[i] = t;
      let val = 0;
      for (let c = 0; c < components.length; c++) {
        const comp = components[c];
        val += comp.amplitude * Math.cos(2 * Math.PI * comp.freqHz * t + comp.phaseRad);
      }
      normalized[i] = val;
      const absV = Math.abs(val);
      if (absV > maxAbs) maxAbs = absV;
    }

    const invMax = maxAbs > 1e-12 ? 1 / maxAbs : 1;
    for (let i = 0; i < numSamples; i++) {
      normalized[i] *= invMax;
    }
  }

  let sumSq = 0;
  let peakV = 0;
  for (let i = 0; i < numSamples; i++) {
    const v = params.messageAmplitudeV * normalized[i];
    messageV[i] = v;
    sumSq += v * v;
    const absV = Math.abs(v);
    if (absV > peakV) peakV = absV;
  }

  return {
    timeSec,
    messageV,
    normalized,
    fs,
    numSamples,
    durationSec: numSamples * dt,
    fMaxHz,
    rmsV: Math.sqrt(sumSq / numSamples),
    peakV,
    components,
  };
}
