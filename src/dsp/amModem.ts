import { AMAnalysisMetrics, AMParams, GeneratedMessage } from '../types/simulation';
import { computeAveragePower } from './channel';
import { bandpassFilter6, butterworthLPF4 } from './filters';

/**
 * Conventional DSB-FC Amplitude Modulation:
 * s_AM(t) = Ac * [1 + mu * m_norm(t)] * cos(2 * pi * fc * t)
 */
export function modulateAM(
  message: GeneratedMessage,
  params: AMParams
): { txSignal: Float64Array; effectiveMu: number } {
  const { timeSec, messageV, normalized, numSamples } = message;
  const ac = Math.max(0.1, params.carrierAmplitudeV);
  const fc = params.carrierFreqHz;

  const effectiveMu = params.coupleAmplitudeToIndex
    ? message.peakV / ac
    : Math.max(0, Math.min(params.modulationIndex, 1.5));

  const txSignal = new Float64Array(numSamples);
  for (let n = 0; n < numSamples; n++) {
    const t = timeSec[n];
    const modTerm = params.coupleAmplitudeToIndex
      ? messageV[n] / ac
      : effectiveMu * normalized[n];
    txSignal[n] = ac * (1 + modTerm) * Math.cos(2 * Math.PI * fc * t);
  }

  return { txSignal, effectiveMu };
}

/**
 * AM Receiver Chain:
 * Received -> 6th-order BPF -> RC Diode Envelope Detector -> DC Removal -> 4th-order Audio LPF
 */
export function demodulateAM(
  received: Float64Array,
  fs: number,
  params: AMParams
): {
  bandpassFiltered: Float64Array;
  envelope: Float64Array;
  demodulatedAudio: Float64Array;
} {
  const n = received.length;
  const dt = 1 / fs;

  const bandpassFiltered = bandpassFilter6(received, params.carrierFreqHz, params.rxBandwidthHz, fs);

  const tauSec = Math.max(5e-6, params.envelopeTauUs * 1e-6);
  const decayFactor = Math.exp(-dt / tauSec);
  const attackAlpha = 0.85;

  const envelope = new Float64Array(n);
  let vCap = Math.abs(bandpassFiltered[0] || 0);
  envelope[0] = vCap;

  for (let i = 1; i < n; i++) {
    const rectified = Math.max(0, bandpassFiltered[i]);
    if (rectified > vCap) {
      vCap = vCap + attackAlpha * (rectified - vCap);
    } else {
      vCap = vCap * decayFactor;
    }
    envelope[i] = vCap;
  }

  let dcSum = 0;
  const startSteady = Math.floor(n * 0.05);
  for (let i = startSteady; i < n; i++) {
    dcSum += envelope[i];
  }
  const dcOffset = dcSum / Math.max(1, n - startSteady);

  const dcRemoved = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    dcRemoved[i] = envelope[i] - dcOffset;
  }

  const demodulatedAudio = butterworthLPF4(dcRemoved, params.rxLpfCutoffHz, fs);

  return {
    bandpassFiltered,
    envelope,
    demodulatedAudio,
  };
}

export function analyzeAMMetrics(
  message: GeneratedMessage,
  txSignal: Float64Array,
  params: AMParams,
  effectiveMu: number,
  measuredBw98Hz: number,
  measuredBw20DbHz = 2 * message.fMaxHz
): AMAnalysisMetrics {
  const ac = Math.max(0.1, params.carrierAmplitudeV);
  const fc = params.carrierFreqHz;

  const totalPowerW = computeAveragePower(txSignal);
  const carrierPowerW = (ac * ac) / 2;

  // Compute exact modulation term x[n] statistics: s_AM[n] = Ac * [1 + x[n]] * cos(2*pi*fc*t)
  const nLen = message.numSamples || 1;
  let sumX = 0;
  let sumXSq = 0;
  let sumOnePlusXSq = 0;
  let minEnvelopeFactor = Infinity;

  for (let n = 0; n < nLen; n++) {
    const x = params.coupleAmplitudeToIndex
      ? message.messageV[n] / ac
      : effectiveMu * message.normalized[n];
    sumX += x;
    sumXSq += x * x;
    const env = 1 + x;
    sumOnePlusXSq += env * env;
    if (env < minEnvelopeFactor) minEnvelopeFactor = env;
  }

  const meanModTerm = sumX / nLen;
  const meanSqModTerm = sumXSq / nLen;
  const meanOnePlusXSq = sumOnePlusXSq / nLen;
  const varianceModTerm = Math.max(0, meanSqModTerm - meanModTerm * meanModTerm);

  // If message has non-zero DC (meanModTerm != 0), DC shifts effective carrier amplitude to Ac*(1 + meanX)
  const theoreticalCarrierPowerW = carrierPowerW * (1 + meanModTerm) * (1 + meanModTerm);
  const theoreticalSidebandPowerW = carrierPowerW * varianceModTerm;
  const theoreticalTotalPowerW = carrierPowerW * meanOnePlusXSq;
  const singleTonePowerW = carrierPowerW * (1 + (effectiveMu * effectiveMu) / 2);

  // Sideband power separated from effective carrier power
  const sidebandPowerW = Math.max(0, totalPowerW - theoreticalCarrierPowerW);

  const effDenom = (1 + meanModTerm) * (1 + meanModTerm) + varianceModTerm;
  const theoreticalEfficiencyPct = effDenom > 1e-18 ? (varianceModTerm / effDenom) * 100 : 0;
  const modulationEfficiencyPct =
    totalPowerW > 1e-18 ? (sidebandPowerW / totalPowerW) * 100 : theoreticalEfficiencyPct;

  return {
    effectiveMu,
    isOvermodulated: effectiveMu > 1.0 + 1e-6 || minEnvelopeFactor < -1e-6,
    meanModTerm,
    meanSqModTerm,
    varianceModTerm,
    carrierPowerW,
    theoreticalCarrierPowerW,
    totalPowerW,
    sidebandPowerW,
    theoreticalTotalPowerW,
    theoreticalSidebandPowerW,
    singleTonePowerW,
    usbFreqHz: fc + message.fMaxHz,
    lsbFreqHz: Math.max(0, fc - message.fMaxHz),
    theoreticalBwHz: 2 * message.fMaxHz,
    measuredBw98Hz,
    measuredBw20DbHz,
    modulationEfficiencyPct,
    theoreticalEfficiencyPct,
  };
}
