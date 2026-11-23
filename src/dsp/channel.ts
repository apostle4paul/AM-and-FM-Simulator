import { ChannelImpairmentMode } from '../types/simulation';
import { SeededRNG } from './prng';

export interface AWGNChannelOutput {
  normalizedTx: Float64Array;
  receivedNoisy: Float64Array;
  noiseAdded: Float64Array;
  rawSignalPowerW: number;
  channelSignalPowerW: number;
  noisePowerW: number;
  measuredInputSnrDb: number;
}

export function computeAveragePower(signal: Float64Array): number {
  let sumSq = 0;
  const n = signal.length;
  for (let i = 0; i < n; i++) {
    sumSq += signal[i] * signal[i];
  }
  return sumSq / (n || 1);
}

export function passThroughAWGNChannel(
  transmittedRaw: Float64Array,
  referencePowerW: number,
  targetSnrDb: number,
  noiseEnabled: boolean,
  seed: number,
  impairmentMode: ChannelImpairmentMode = 'awgn',
  fs = 1_000_000
): AWGNChannelOutput {
  const n = transmittedRaw.length;
  const rawPower = computeAveragePower(transmittedRaw);
  const normFactor = rawPower > 1e-15 ? Math.sqrt(referencePowerW / rawPower) : 1.0;

  const normalizedTx = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    normalizedTx[i] = transmittedRaw[i] * normFactor;
  }

  // Optional 2-ray specular multipath fading distortion (before AWGN), equalized to P_ref
  let channelSignal = normalizedTx;
  if (impairmentMode === 'multipath-fading') {
    const delaySamples = Math.max(1, Math.round(3.5e-6 * fs));
    const echoGain = 0.35;
    const mp = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const delayed = i >= delaySamples ? normalizedTx[i - delaySamples] : 0;
      mp[i] = normalizedTx[i] + echoGain * delayed;
    }
    const mpPower = computeAveragePower(mp);
    const mpScale = mpPower > 1e-15 ? Math.sqrt(referencePowerW / mpPower) : 1.0;
    for (let i = 0; i < n; i++) mp[i] *= mpScale;
    channelSignal = mp;
  }

  const channelSignalPowerW = computeAveragePower(channelSignal);

  const noiseAdded = new Float64Array(n);
  const receivedNoisy = new Float64Array(n);

  if (!noiseEnabled) {
    receivedNoisy.set(channelSignal);
    return {
      normalizedTx: channelSignal,
      receivedNoisy,
      noiseAdded,
      rawSignalPowerW: rawPower,
      channelSignalPowerW,
      noisePowerW: 0,
      measuredInputSnrDb: Infinity,
    };
  }

  const linearSnr = Math.pow(10, targetSnrDb / 10);
  const targetNoisePower = channelSignalPowerW / Math.max(linearSnr, 1e-12);
  const noiseStd = Math.sqrt(targetNoisePower);

  const rng = new SeededRNG(seed);
  const unitNoise = rng.generateUnitGaussianVector(n);

  if (impairmentMode === 'kiremt-impulsive') {
    // Combine Gaussian background with Bernoulli impulsive lightning/EMI bursts, then scale to calibrated power
    const combined = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const impulse = rng.nextUniform() < 0.015 ? rng.nextGaussian() * 7.5 : 0;
      combined[i] = unitNoise[i] + impulse;
    }
    const combPower = computeAveragePower(combined);
    const combNorm = combPower > 1e-18 ? Math.sqrt(targetNoisePower / combPower) : noiseStd;
    for (let i = 0; i < n; i++) {
      const w = combined[i] * combNorm;
      noiseAdded[i] = w;
      receivedNoisy[i] = channelSignal[i] + w;
    }
  } else {
    for (let i = 0; i < n; i++) {
      const w = unitNoise[i] * noiseStd;
      noiseAdded[i] = w;
      receivedNoisy[i] = channelSignal[i] + w;
    }
  }

  const measuredNoisePower = computeAveragePower(noiseAdded);
  const measuredInputSnrDb =
    measuredNoisePower > 1e-18
      ? 10 * Math.log10(channelSignalPowerW / measuredNoisePower)
      : Infinity;

  return {
    normalizedTx: channelSignal,
    receivedNoisy,
    noiseAdded,
    rawSignalPowerW: rawPower,
    channelSignalPowerW,
    noisePowerW: measuredNoisePower,
    measuredInputSnrDb,
  };
}
