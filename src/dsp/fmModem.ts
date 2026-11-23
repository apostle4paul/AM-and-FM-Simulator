import { FMAnalysisMetrics, FMParams, GeneratedMessage } from '../types/simulation';
import { applyDeEmphasis, applyPreEmphasis, bandpassFilter6, butterworthLPF4 } from './filters';

/**
 * Frequency Modulation via trapezoidal integration of instantaneous frequency:
 * f_i(t) = fc + deltaF * m_norm(t)
 * s_FM(t) = Ac * cos(phi(t)), where phi(t) = 2 * pi * integral(f_i(tau) dtau)
 */
export function modulateFM(
  message: GeneratedMessage,
  params: FMParams
): { txSignal: Float64Array; instFreqHz: Float64Array } {
  const { normalized, fs, numSamples } = message;
  const ac = Math.max(0.1, params.carrierAmplitudeV);
  const fc = params.carrierFreqHz;
  const deltaF = Math.max(500, params.freqDeviationHz);
  const dt = 1 / fs;
  const tauUs = params.deEmphasisUs ?? 0;
  const modSignal = tauUs > 0 ? applyPreEmphasis(normalized, tauUs, fs) : normalized;

  const instFreqHz = new Float64Array(numSamples);
  const txSignal = new Float64Array(numSamples);
  let phaseRad = 0;

  for (let n = 0; n < numSamples; n++) {
    const fi = fc + deltaF * modSignal[n];
    instFreqHz[n] = fi;
    txSignal[n] = ac * Math.cos(phaseRad);

    if (n + 1 < numSamples) {
      const fiNext = fc + deltaF * modSignal[n + 1];
      phaseRad += Math.PI * (fi + fiNext) * dt;
    }
  }

  return { txSignal, instFreqHz };
}

/**
 * FM Receiver & Quadrature Phase-Difference Discriminator:
 * Received -> 6th-order IF BPF -> I/Q Mixing -> Complex LPF -> atan2(Im, Re) phase diff -> DC removal -> Audio LPF
 */
export function demodulateFM(
  received: Float64Array,
  fs: number,
  params: FMParams
): {
  bandpassFiltered: Float64Array;
  demodulatedAudio: Float64Array;
} {
  const n = received.length;
  const dt = 1 / fs;
  const fc = params.carrierFreqHz;

  const bandpassFiltered = bandpassFilter6(received, fc, params.rxBandwidthHz, fs);

  const iMix = new Float64Array(n);
  const qMix = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const angle = 2 * Math.PI * fc * (k * dt);
    const r = bandpassFiltered[k];
    iMix[k] = 2 * r * Math.cos(angle);
    qMix[k] = -2 * r * Math.sin(angle);
  }

  const iqCutoff = Math.min(
    0.42 * fs,
    1.35 * fc,
    Math.max(params.rxBandwidthHz * 0.6, params.freqDeviationHz * 1.4 + 10_000)
  );
  const iBase = butterworthLPF4(iMix, iqCutoff, fs);
  const qBase = butterworthLPF4(qMix, iqCutoff, fs);

  const instFreqDevNorm = new Float64Array(n);
  const sensitivity = Math.max(0.1, params.demodSensitivity);
  const normScale = sensitivity / Math.max(100, params.freqDeviationHz);

  for (let k = 1; k < n; k++) {
    const iPrev = iBase[k - 1];
    const qPrev = qBase[k - 1];
    const iCurr = iBase[k];
    const qCurr = qBase[k];

    const dot = iCurr * iPrev + qCurr * qPrev;
    const cross = qCurr * iPrev - iCurr * qPrev;
    const dPhi = Math.atan2(cross, dot);

    const freqDevHz = dPhi / (2 * Math.PI * dt);
    instFreqDevNorm[k] = freqDevHz * normScale;
  }
  instFreqDevNorm[0] = instFreqDevNorm[1] || 0;

  let dcSum = 0;
  const startSteady = Math.floor(n * 0.05);
  for (let k = startSteady; k < n; k++) {
    dcSum += instFreqDevNorm[k];
  }
  const dcOffset = dcSum / Math.max(1, n - startSteady);

  const dcRemoved = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    dcRemoved[k] = instFreqDevNorm[k] - dcOffset;
  }

  const lpfAudio = butterworthLPF4(dcRemoved, params.rxLpfCutoffHz, fs);
  const tauUs = params.deEmphasisUs ?? 0;
  const demodulatedAudio = tauUs > 0 ? applyDeEmphasis(lpfAudio, tauUs, fs) : lpfAudio;

  return {
    bandpassFiltered,
    demodulatedAudio,
  };
}

export function analyzeFMMetrics(
  message: GeneratedMessage,
  instFreqHz: Float64Array,
  params: FMParams,
  measuredBw98Hz: number,
  measuredBw20DbHz: number
): FMAnalysisMetrics {
  let minInstFreqHz = Infinity;
  let maxInstFreqHz = -Infinity;
  for (let i = 0; i < instFreqHz.length; i++) {
    const f = instFreqHz[i];
    if (f < minInstFreqHz) minInstFreqHz = f;
    if (f > maxInstFreqHz) maxInstFreqHz = f;
  }
  if (!Number.isFinite(minInstFreqHz)) minInstFreqHz = params.carrierFreqHz;
  if (!Number.isFinite(maxInstFreqHz)) maxInstFreqHz = params.carrierFreqHz;

  const deltaF = Math.max(500, params.freqDeviationHz);
  const measuredPeakDeviationHz = Math.max(
    Math.abs(maxInstFreqHz - params.carrierFreqHz),
    Math.abs(params.carrierFreqHz - minInstFreqHz)
  );
  const beta = deltaF / message.fMaxHz;
  const carsonBwHz = 2 * (deltaF + message.fMaxHz);
  const isInstantaneousFreqValid = minInstFreqHz > 5000 && maxInstFreqHz < 0.42 * message.fs;

  return {
    beta,
    freqDeviationHz: deltaF,
    measuredPeakDeviationHz,
    carsonBwHz,
    measuredBw98Hz,
    measuredBw20DbHz,
    instFreqHz,
    minInstFreqHz,
    maxInstFreqHz,
    isInstantaneousFreqValid,
  };
}
