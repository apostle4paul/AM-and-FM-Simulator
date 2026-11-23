import { FMThresholdSensitivityCheck, ValidationCheckResult } from '../types/simulation';
import { generateMessageSignal } from './signalGenerator';
import { analyzeAMMetrics, demodulateAM, modulateAM } from './amModem';
import { analyzeFMMetrics, demodulateFM, modulateFM } from './fmModem';
import { computeSpectrum } from './fft';
import { passThroughAWGNChannel } from './channel';
import { runFMThresholdSweep, runFullSimulation } from './performance';

export function runIndependentValidationSuite(): ValidationCheckResult[] {
  const results: ValidationCheckResult[] = [];

  // TEST 1: AM Modulation Index (Ac = 10 V, Am = 5 V -> mu = 0.50, Emax = 15 V, Emin = 5 V)
  const sig1 = generateMessageSignal({
    mode: 'single',
    messageFreqHz: 4000,
    messageAmplitudeV: 5.0,
    samplingFreqHz: 1_000_000,
    durationMs: 6,
    seed: 42,
  });

  const amParams1 = {
    carrierAmplitudeV: 10.0,
    carrierFreqHz: 100_000,
    modulationIndex: 0.5,
    coupleAmplitudeToIndex: true,
    rxBandwidthHz: 14_000,
    envelopeTauUs: 35,
    rxLpfCutoffHz: 6000,
  };

  const { txSignal: amTx1, effectiveMu } = modulateAM(sig1, amParams1);

  const samplesPerCarrier = Math.round(sig1.fs / amParams1.carrierFreqHz);
  let envMax = -Infinity;
  let envMin = Infinity;
  for (let i = 0; i < amTx1.length - samplesPerCarrier; i += samplesPerCarrier) {
    let localPeak = 0;
    for (let k = 0; k < samplesPerCarrier; k++) {
      const a = Math.abs(amTx1[i + k]);
      if (a > localPeak) localPeak = a;
    }
    if (localPeak > envMax) envMax = localPeak;
    if (localPeak < envMin) envMin = localPeak;
  }
  const measuredMu = (envMax - envMin) / (envMax + envMin || 1);
  const theoreticalMu = 0.5;
  const absErrMu = Math.abs(measuredMu - theoreticalMu);
  const relErrMuPct = (absErrMu / theoreticalMu) * 100;
  const passTest1 = relErrMuPct <= 1.0 && Math.abs(envMax - 15) <= 0.15 && Math.abs(envMin - 5) <= 0.15;

  results.push({
    id: 'test-1-am-mu',
    title: 'TEST 1 — AM Modulation Index & Envelope Extrema',
    category: 'AM Analytical',
    givenParameters: 'Ac = 10.0 V, Am = 5.0 V, fm = 4.0 kHz, fc = 100 kHz, fs = 1 MHz',
    handCalculation:
      'μ = Am / Ac = 5.0 / 10.0 = 0.500 | E_max = Ac(1 + μ) = 15.0 V | E_min = Ac(1 − μ) = 5.0 V',
    theoreticalValue: 'μ = 0.500 | E_max = 15.00 V | E_min = 5.00 V',
    simulatorValue: `μ = ${measuredMu.toFixed(4)} | E_max = ${envMax.toFixed(3)} V | E_min = ${envMin.toFixed(3)} V`,
    absoluteError: `Δμ = ${absErrMu.toFixed(4)}`,
    relativeError: `${relErrMuPct.toFixed(3)}%`,
    acceptanceTolerance: '≤ 1.0% relative error (discrete sampling peak tolerance)',
    percentDifference: `${relErrMuPct.toFixed(3)}%`,
    status: passTest1 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Extracted directly from simulated carrier-cycle peak extrema (E_max − E_min)/(E_max + E_min) on discrete s_AM[n].',
  });

  // TEST 2: AM Total Power (Sinusoidal: Ac = 10 V -> Pc = 50 W into 1 Ohm, mu = 0.5 -> P_total = 56.25 W)
  const amSpec1 = computeSpectrum(amTx1, sig1.fs);
  const amMetrics1 = analyzeAMMetrics(
    sig1,
    amTx1,
    amParams1,
    effectiveMu,
    amSpec1.occupiedBw98Hz,
    amSpec1.bwMinus20DbHz
  );
  const theoPt = 50 * (1 + (0.5 * 0.5) / 2); // 56.25 W
  const theoEta = ((0.5 * 0.5) / (2 + 0.5 * 0.5)) * 100; // 11.111%
  const absErrP = Math.abs(amMetrics1.totalPowerW - theoPt);
  const relErrPPct = (absErrP / theoPt) * 100;
  const passTest2 = relErrPPct <= 0.5 && Math.abs(amMetrics1.modulationEfficiencyPct - theoEta) <= 0.2;

  results.push({
    id: 'test-2-am-power',
    title: 'TEST 2 — AM Total Power & Sinusoidal Efficiency',
    category: 'Power & Spectrum',
    givenParameters: 'Ac = 10.0 V (Pc = 50.0 W into 1 Ω), μ = 0.50, 6 ms (integer 24 cycles of 4 kHz)',
    handCalculation:
      'P_total = Pc(1 + μ²/2) = 50(1 + 0.25/2) = 56.250 W | η = μ²/(2 + μ²) = 11.11%',
    theoreticalValue: `${theoPt.toFixed(3)} W | η = ${theoEta.toFixed(2)}%`,
    simulatorValue: `${amMetrics1.totalPowerW.toFixed(3)} W | η = ${amMetrics1.modulationEfficiencyPct.toFixed(2)}%`,
    absoluteError: `ΔP = ${absErrP.toFixed(4)} W`,
    relativeError: `${relErrPPct.toFixed(3)}%`,
    acceptanceTolerance: '≤ 0.5% relative power error',
    percentDifference: `${relErrPPct.toFixed(3)}%`,
    status: passTest2 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Measured by discrete-time mean square (1/N) Σ s_AM[n]² across 6,000 RF samples referenced to 1 Ω.',
  });

  // TEST 3: FM Modulation Index (Delta f = 20 kHz, fm = 4 kHz -> beta = 5.00)
  const sig2 = generateMessageSignal({
    mode: 'single',
    messageFreqHz: 4000,
    messageAmplitudeV: 1.0,
    samplingFreqHz: 1_000_000,
    durationMs: 8,
    seed: 42,
  });

  const fmParams2 = {
    carrierAmplitudeV: 1.0,
    carrierFreqHz: 100_000,
    freqDeviationHz: 20_000,
    rxBandwidthHz: 60_000,
    rxLpfCutoffHz: 6000,
    demodSensitivity: 1.0,
  };

  const { txSignal: fmTx2, instFreqHz } = modulateFM(sig2, fmParams2);
  const fmSpec2 = computeSpectrum(fmTx2, sig2.fs);
  const fmMetrics2 = analyzeFMMetrics(
    sig2,
    instFreqHz,
    fmParams2,
    fmSpec2.occupiedBw98Hz,
    fmSpec2.bwMinus20DbHz
  );

  const measuredDeltaF = (fmMetrics2.maxInstFreqHz - fmMetrics2.minInstFreqHz) / 2;
  const measuredBeta = measuredDeltaF / sig2.fMaxHz;
  const theoBeta = 5.0;
  const absErrBeta = Math.abs(measuredBeta - theoBeta);
  const relErrBetaPct = (absErrBeta / theoBeta) * 100;
  const passTest3 = relErrBetaPct <= 0.5;

  results.push({
    id: 'test-3-fm-beta',
    title: 'TEST 3 — FM Modulation Index (β) & Peak Deviation',
    category: 'FM Analytical',
    givenParameters: 'Δf = 20.0 kHz, fm = 4.0 kHz, fc = 100 kHz, fs = 1 MHz',
    handCalculation: 'β = Δf / fm = 20.0 kHz / 4.0 kHz = 5.000',
    theoreticalValue: 'β = 5.000 (Δf = 20.00 kHz)',
    simulatorValue: `β = ${measuredBeta.toFixed(4)} (Δf = ${(measuredDeltaF / 1000).toFixed(2)} kHz)`,
    absoluteError: `Δβ = ${absErrBeta.toFixed(4)}`,
    relativeError: `${relErrBetaPct.toFixed(3)}%`,
    acceptanceTolerance: '≤ 0.5% relative error',
    percentDifference: `${relErrBetaPct.toFixed(3)}%`,
    status: passTest3 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Verified from actual modulated instantaneous frequency bounds (f_i,max − f_i,min) / (2·f_m).',
  });

  // TEST 4: FM Carson Bandwidth (BW = 2*(20 + 4) = 48 kHz vs FFT 98% and -20 dB bandwidths)
  const theoCarson = 48_000;
  const absErrBw98 = Math.abs(fmMetrics2.measuredBw98Hz - theoCarson);
  const relErrBw98Pct = (absErrBw98 / theoCarson) * 100;
  const carsonWithinTolerance =
    fmMetrics2.measuredBw98Hz >= theoCarson * 0.75 &&
    fmMetrics2.measuredBw98Hz <= theoCarson * 1.3 &&
    fmMetrics2.measuredBw20DbHz >= theoCarson * 0.75 &&
    fmMetrics2.measuredBw20DbHz <= theoCarson * 1.35;

  results.push({
    id: 'test-4-fm-carson',
    title: 'TEST 4 — FM Carson Bandwidth vs FFT Occupied Bandwidth',
    category: 'FM Analytical',
    givenParameters: 'Δf = 20.0 kHz, fm = 4.0 kHz, β = 5.0, Hann-windowed 16,384-pt FFT (61.0 Hz/bin)',
    handCalculation: 'BW_Carson = 2(Δf + fm) = 2(20 + 4) = 48.00 kHz',
    theoreticalValue: '48.00 kHz (Carson Rule)',
    simulatorValue: `98% FFT BW = ${(fmMetrics2.measuredBw98Hz / 1000).toFixed(2)} kHz | −20 dB BW = ${(fmMetrics2.measuredBw20DbHz / 1000).toFixed(2)} kHz`,
    absoluteError: `|BW_98% − Carson| = ${(absErrBw98 / 1000).toFixed(2)} kHz`,
    relativeError: `${relErrBw98Pct.toFixed(1)}% (98% FFT vs Carson)`,
    acceptanceTolerance: 'Within [0.75×, 1.30×] of Carson heuristic (36.0–62.4 kHz)',
    percentDifference: `${relErrBw98Pct.toFixed(1)}%`,
    status: carsonWithinTolerance ? 'APPROXIMATION EXPECTED' : 'FAIL',
    engineeringNote:
      'Carson’s Rule is an analytical heuristic (~98% power), whereas finite-window Hann FFT 98% and −20 dB bandwidths depend on discrete Bessel sidebands J_n(5) and window main-lobe broadening; therefore exact equality is not expected.',
  });

  // TEST 5: AWGN Channel Calibration (P_ref = 0.5 W, Target SNR = 20 dB -> P_noise = 0.005 W)
  const targetSnrDb = 20.0;
  const chCheck = passThroughAWGNChannel(fmTx2, 0.5, targetSnrDb, true, 42);
  const snrErrDb = Math.abs(chCheck.measuredInputSnrDb - targetSnrDb);
  const absErrNoiseW = Math.abs(chCheck.noisePowerW - 0.005);
  const passTest5 = snrErrDb <= 0.1 && Math.abs(chCheck.channelSignalPowerW - 0.5) <= 0.001;

  results.push({
    id: 'test-5-awgn',
    title: 'TEST 5 — AWGN Channel Reference Power & SNR Calibration',
    category: 'Channel Calibration',
    givenParameters: 'Reference P_ref = 0.500 W, Target SNR_in = 20.00 dB, Seed = 42',
    handCalculation:
      'P_noise = P_ref / 10^(20/10) = 0.500 / 100 = 0.00500 W | SNR_in = 10 log10(0.5 / 0.005) = 20.00 dB',
    theoreticalValue: 'P_sig = 0.5000 W | P_noise = 0.00500 W | SNR = 20.00 dB',
    simulatorValue: `P_sig = ${chCheck.channelSignalPowerW.toFixed(4)} W | P_noise = ${chCheck.noisePowerW.toFixed(5)} W | SNR = ${chCheck.measuredInputSnrDb.toFixed(3)} dB`,
    absoluteError: `SNR_err = ${snrErrDb.toFixed(4)} dB | ΔP_noise = ${absErrNoiseW.toExponential(2)} W`,
    relativeError: `${((absErrNoiseW / 0.005) * 100).toFixed(3)}% (linear noise power)`,
    acceptanceTolerance: 'SNR_err = |SNR_meas − SNR_target| ≤ 0.10 dB',
    percentDifference: `${snrErrDb.toFixed(4)} dB abs error`,
    status: passTest5 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Evaluated strictly via absolute dB error |SNR_meas − SNR_target| and linear noise power variance rather than dividing dB by dB.',
  });

  // TEST 6: Composite Message AM Power & Sideband Separation
  const compSig = generateMessageSignal({
    mode: 'composite',
    messageFreqHz: 4000,
    messageAmplitudeV: 1.0,
    samplingFreqHz: 1_000_000,
    durationMs: 10,
    seed: 77,
  });
  const compAmParams = {
    carrierAmplitudeV: 10.0,
    carrierFreqHz: 100_000,
    modulationIndex: 0.8,
    coupleAmplitudeToIndex: false,
    rxBandwidthHz: 16_000,
    envelopeTauUs: 35,
    rxLpfCutoffHz: 6000,
  };
  const { txSignal: compTx, effectiveMu: compMu } = modulateAM(compSig, compAmParams);
  const compSpec = computeSpectrum(compTx, compSig.fs);
  const compMetrics = analyzeAMMetrics(
    compSig,
    compTx,
    compAmParams,
    compMu,
    compSpec.occupiedBw98Hz,
    compSpec.bwMinus20DbHz
  );
  let indepSumOnePlusXSq = 0;
  let indepSumX = 0;
  let indepSumXSq = 0;
  for (let i = 0; i < compSig.numSamples; i++) {
    const x = 0.8 * compSig.normalized[i];
    indepSumX += x;
    indepSumXSq += x * x;
    indepSumOnePlusXSq += (1 + x) * (1 + x);
  }
  const indepMeanOnePlusXSq = indepSumOnePlusXSq / compSig.numSamples;
  const indepMeanX = indepSumX / compSig.numSamples;
  const indepVarX = indepSumXSq / compSig.numSamples - indepMeanX * indepMeanX;
  const indepTheoTotalW = 50.0 * indepMeanOnePlusXSq;
  const indepTheoSbW = 50.0 * indepVarX;
  const absErrCompP = Math.abs(compMetrics.totalPowerW - indepTheoTotalW);
  const relErrCompPct = (absErrCompP / indepTheoTotalW) * 100;
  const passTest6 =
    relErrCompPct <= 0.5 && Math.abs(compMetrics.theoreticalTotalPowerW - indepTheoTotalW) < 1e-6;

  results.push({
    id: 'test-6-composite-am-power',
    title: 'TEST 6 — Composite Message AM Power & Sideband Power',
    category: 'AM Composite & Nonlinear',
    givenParameters: 'Mode B Composite (3–5 kHz), Ac = 10 V (Pc = 50 W), peak μ = 0.80, fs = 1 MHz',
    handCalculation: `P_AM = Pc·mean[(1+x)²] = 50×${indepMeanOnePlusXSq.toFixed(4)} = ${indepTheoTotalW.toFixed(3)} W | P_SB = Pc·var(x) = ${indepTheoSbW.toFixed(3)} W (naive single-tone formula would give ${compMetrics.singleTonePowerW.toFixed(2)} W)`,
    theoreticalValue: `P_total = ${indepTheoTotalW.toFixed(3)} W | P_SB = ${indepTheoSbW.toFixed(3)} W`,
    simulatorValue: `P_total = ${compMetrics.totalPowerW.toFixed(3)} W | P_SB = ${compMetrics.sidebandPowerW.toFixed(3)} W`,
    absoluteError: `ΔP = ${absErrCompP.toFixed(4)} W`,
    relativeError: `${relErrCompPct.toFixed(3)}%`,
    acceptanceTolerance: '≤ 0.5% relative power error',
    percentDifference: `${relErrCompPct.toFixed(3)}%`,
    status: passTest6 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Confirms general P_AM = Pc·mean[(1+x)²] accurately models multi-tone composite envelopes where crest factor lowers mean(x²) below μ²/2.',
  });

  // TEST 7: AM Overmodulation (mu = 1.40 > 1.0)
  const overmodParams = {
    ...amParams1,
    carrierAmplitudeV: 1.0,
    coupleAmplitudeToIndex: false,
    modulationIndex: 1.4,
  };
  const { txSignal: overTx, effectiveMu: overMu } = modulateAM(sig2, overmodParams);
  const overMetrics = analyzeAMMetrics(sig2, overTx, overmodParams, overMu, 8000, 8000);
  const overRx = demodulateAM(overTx, sig2.fs, overmodParams);
  const n2 = sig2.numSamples;
  const sIdx = Math.floor(0.2 * n2);
  const eIdx = Math.floor(0.85 * n2);
  let num = 0;
  let den = 0;
  let refP = 0;
  for (let i = sIdx; i < eIdx; i++) {
    num += sig2.messageV[i] * overRx.demodulatedAudio[i];
    den += overRx.demodulatedAudio[i] * overRx.demodulatedAudio[i];
    refP += sig2.messageV[i] * sig2.messageV[i];
  }
  const g = den > 1e-18 ? num / den : 1;
  let errP = 0;
  for (let i = sIdx; i < eIdx; i++) {
    const d = sig2.messageV[i] - g * overRx.demodulatedAudio[i];
    errP += d * d;
  }
  const overDistPct = (errP / (refP || 1)) * 100;
  const passTest7 = overMetrics.isOvermodulated && overDistPct > 1.0;

  results.push({
    id: 'test-7-am-overmod',
    title: 'TEST 7 — AM Overmodulation Envelope Foldover (μ = 1.40 > 1)',
    category: 'AM Composite & Nonlinear',
    givenParameters: 'μ = 1.40 > 1.00, fm = 4.0 kHz, RC diode envelope detector (τ = 35 μs)',
    handCalculation:
      'Because min[1 + 1.4·cos(ω_m t)] = −0.40 < 0, carrier phase inverts 180° and diode detector follows |1 + μ·m(t)|',
    theoreticalValue: 'isOvermodulated = true | Nonlinear distortion > 1.0% even noiseless',
    simulatorValue: `isOvermodulated = ${overMetrics.isOvermodulated} | Noiseless envelope NMSE = ${overDistPct.toFixed(2)}%`,
    absoluteError: `Foldover trough depth = 0.40 Ac`,
    relativeError: `${overDistPct.toFixed(2)}% NMSE distortion`,
    acceptanceTolerance: 'Overmodulation flag active & NMSE > 1.0%',
    percentDifference: `${overDistPct.toFixed(2)}% NMSE`,
    status: passTest7 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Verifies that μ > 1.0 triggers physical phase-reversal foldover distortion in non-coherent RC envelope recovery.',
  });

  // TEST 8: FM Instantaneous Frequency Accuracy
  let maxFiErrHz = 0;
  let sumSqFiErr = 0;
  for (let i = 0; i < sig2.numSamples; i++) {
    const t = sig2.timeSec[i];
    const exactFi = fmParams2.carrierFreqHz + fmParams2.freqDeviationHz * Math.cos(2 * Math.PI * 4000 * t);
    const err = Math.abs(instFreqHz[i] - exactFi);
    if (err > maxFiErrHz) maxFiErrHz = err;
    sumSqFiErr += err * err;
  }
  const rmsFiErrHz = Math.sqrt(sumSqFiErr / sig2.numSamples);
  const passTest8 = maxFiErrHz <= 1.0;

  results.push({
    id: 'test-8-fm-inst-freq',
    title: 'TEST 8 — FM Instantaneous Frequency Trajectory f_i(t)',
    category: 'FM Analytical',
    givenParameters: 'fc = 100.0 kHz, Δf = 20.0 kHz, fm = 4.0 kHz cosine, fs = 1 MHz (8,000 samples)',
    handCalculation: 'f_i(t) = fc + Δf·cos(2π·4000·t) ∈ [80.00 kHz, 120.00 kHz]',
    theoreticalValue: 'Peak Error ≤ 1.00 Hz across [80, 120] kHz',
    simulatorValue: `Max |Δf_i| = ${maxFiErrHz.toExponential(2)} Hz | RMS = ${rmsFiErrHz.toExponential(2)} Hz`,
    absoluteError: `${maxFiErrHz.toExponential(2)} Hz`,
    relativeError: `${((maxFiErrHz / fmParams2.carrierFreqHz) * 100).toExponential(2)}%`,
    acceptanceTolerance: 'Max instantaneous frequency error ≤ 1.0 Hz',
    percentDifference: `${((maxFiErrHz / fmParams2.carrierFreqHz) * 100).toExponential(2)}%`,
    status: passTest8 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Verifies sample-by-sample agreement between modulateFM() instFreqHz and closed-form f_c + Δf·m_norm(t).',
  });

  // TEST 9: FM Trapezoidal Phase Integration vs Closed-Form Integral
  let sumSqWaveDiff = 0;
  let sumSqExact = 0;
  let maxWaveErr = 0;
  const betaExact = fmParams2.freqDeviationHz / 4000;
  for (let i = 0; i < sig2.numSamples; i++) {
    const t = sig2.timeSec[i];
    const phiExact = 2 * Math.PI * fmParams2.carrierFreqHz * t + betaExact * Math.sin(2 * Math.PI * 4000 * t);
    const sExact = fmParams2.carrierAmplitudeV * Math.cos(phiExact);
    const diff = Math.abs(fmTx2[i] - sExact);
    if (diff > maxWaveErr) maxWaveErr = diff;
    sumSqWaveDiff += diff * diff;
    sumSqExact += sExact * sExact;
  }
  const relRmsPhaseWavePct = Math.sqrt(sumSqWaveDiff / (sumSqExact || 1)) * 100;
  const passTest9 = relRmsPhaseWavePct <= 0.5 && maxWaveErr <= 0.02;

  results.push({
    id: 'test-9-fm-phase-integration',
    title: 'TEST 9 — FM Trapezoidal Phase Integration vs Closed-Form Integral',
    category: 'FM Analytical',
    givenParameters: 'φ_exact(t) = 2π·fc·t + β·sin(2π·fm·t), β = 5.0, fs = 1 MHz (8 ms)',
    handCalculation:
      '∫(fc + Δf·cos(2πfmt))dt = fc·t + (Δf / 2πfm)·sin(2πfmt) => s_exact(t) = Ac·cos(2πfct + β·sin(2πfmt))',
    theoreticalValue: 'Closed-form Ac·cos[φ_exact(t)] (Ac = 1.0 V)',
    simulatorValue: `RMS Waveform Error = ${relRmsPhaseWavePct.toFixed(4)}% | Peak |Δs| = ${maxWaveErr.toFixed(4)} V`,
    absoluteError: `Peak Δs = ${maxWaveErr.toFixed(4)} V`,
    relativeError: `${relRmsPhaseWavePct.toFixed(4)}% RMS`,
    acceptanceTolerance: 'RMS error ≤ 0.50% and peak |Δs| ≤ 0.020 V',
    percentDifference: `${relRmsPhaseWavePct.toFixed(4)}%`,
    status: passTest9 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Compares discrete trapezoidal phase accumulation against the exact analytical phase integral over 800 carrier cycles.',
  });

  // TEST 10: FM Quadrature I/Q Demodulator Recovery (Noiseless Clean Chain)
  const fmCleanSim = runFullSimulation(
    {
      mode: 'single',
      messageFreqHz: 4000,
      messageAmplitudeV: 1.0,
      samplingFreqHz: 1_000_000,
      durationMs: 6,
      seed: 42,
    },
    amParams1,
    fmParams2,
    {
      snrTargetDb: 40,
      noiseEnabled: false,
      referencePowerW: 0.5,
      presetId: 'clean',
    }
  );
  const passTest10 = fmCleanSim.fm.outputSnrDb >= 30.0 && fmCleanSim.fm.distortionPct <= 0.15;

  results.push({
    id: 'test-10-fm-demod-recovery',
    title: 'TEST 10 — FM Quadrature I/Q Demodulator Recovery (Noiseless)',
    category: 'FM Analytical',
    givenParameters: 'fm = 4.0 kHz, Δf = 20 kHz, RX BPF = 60 kHz, Audio LPF = 6 kHz, Noise Off',
    handCalculation:
      '6th-order IF BPF → I/Q mixer → 4th-order I/Q LPF → atan2 phase-difference discriminator → Audio LPF',
    theoreticalValue: 'Clean Output SNR ≥ 30.0 dB | NMSE Distortion ≤ 0.150%',
    simulatorValue: `Output SNR = ${fmCleanSim.fm.isOutputSnrPrecisionCapped ? '>' : ''}${fmCleanSim.fm.outputSnrDb.toFixed(2)} dB | NMSE = ${fmCleanSim.fm.distortionPct.toFixed(4)}%`,
    absoluteError: `NMSE = ${fmCleanSim.fm.nmse.toExponential(2)}`,
    relativeError: `${fmCleanSim.fm.distortionPct.toFixed(4)}% distortion`,
    acceptanceTolerance: 'Output SNR ≥ 30.0 dB and NMSE ≤ 0.150%',
    percentDifference: `${fmCleanSim.fm.distortionPct.toFixed(4)}%`,
    status: passTest10 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Validates end-to-end delay-aligned Quadrature I/Q + atan2 demodulator fidelity without AWGN noise.',
  });

  // TEST 11: FFT Peak Frequency Accuracy
  const fsFft = 1_000_000;
  const fTargetHz = 125_000; // Clean tone within passband
  const nFftTest = 8192;
  const pureTone = new Float64Array(nFftTest);
  for (let i = 0; i < nFftTest; i++) {
    pureTone[i] = 2.0 * Math.cos((2 * Math.PI * fTargetHz * i) / fsFft);
  }
  const fftPeakSpec = computeSpectrum(pureTone, fsFft, 16384);
  const measuredPeakHz = fftPeakSpec.peakFreqKHz * 1000;
  const absErrPeakHz = Math.abs(measuredPeakHz - fTargetHz);
  const relErrPeakPct = (absErrPeakHz / fTargetHz) * 100;
  const passTest11 = absErrPeakHz <= fftPeakSpec.binResolutionHz;

  results.push({
    id: 'test-11-fft-peak-accuracy',
    title: 'TEST 11 — FFT Peak Frequency Detection Accuracy',
    category: 'Power & Spectrum',
    givenParameters: `Pure cosine f0 = 125.000 kHz, fs = 1 MHz, 16,384-pt FFT (Δf_bin = ${fftPeakSpec.binResolutionHz.toFixed(2)} Hz)`,
    handCalculation: `Nearest FFT bin k = round(125,000 / ${fftPeakSpec.binResolutionHz.toFixed(2)}) = ${Math.round(fTargetHz / fftPeakSpec.binResolutionHz)} → f_bin = ${(Math.round(fTargetHz / fftPeakSpec.binResolutionHz) * fftPeakSpec.binResolutionHz / 1000).toFixed(3)} kHz`,
    theoreticalValue: '125.000 kHz (±0.5 bin)',
    simulatorValue: `${fftPeakSpec.peakFreqKHz.toFixed(3)} kHz (Peak = ${fftPeakSpec.peakPowerDb.toFixed(2)} dBW)`,
    absoluteError: `|Δf| = ${absErrPeakHz.toFixed(2)} Hz`,
    relativeError: `${relErrPeakPct.toFixed(4)}%`,
    acceptanceTolerance: `≤ 1 FFT bin (${fftPeakSpec.binResolutionHz.toFixed(2)} Hz)`,
    percentDifference: `${relErrPeakPct.toFixed(4)}%`,
    status: passTest11 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Verifies FFT frequency axis scaling and radix-2 peak localization within the discrete DFT bin resolution.',
  });

  // TEST 12: FFT Bandwidth Measurement Approximation (Single-Tone AM vs Exact 2*fm)
  const amCleanMonoSig = generateMessageSignal({
    mode: 'single',
    messageFreqHz: 4000,
    messageAmplitudeV: 1.0,
    samplingFreqHz: 1_000_000,
    durationMs: 8,
    seed: 42,
  });
  const amCleanMonoParams = {
    carrierAmplitudeV: 1.0,
    carrierFreqHz: 100_000,
    modulationIndex: 0.8,
    coupleAmplitudeToIndex: false,
    rxBandwidthHz: 14_000,
    envelopeTauUs: 35,
    rxLpfCutoffHz: 6000,
  };
  const { txSignal: amMonoTx } = modulateAM(amCleanMonoSig, amCleanMonoParams);
  const amMonoSpec = computeSpectrum(amMonoTx, amCleanMonoSig.fs);
  const exactAmSpanHz = 2 * 4000; // 8,000 Hz
  const absErrAmBw20 = Math.abs(amMonoSpec.bwMinus20DbHz - exactAmSpanHz);
  const relErrAmBw20Pct = (absErrAmBw20 / exactAmSpanHz) * 100;
  const amBwWithinExpected =
    amMonoSpec.bwMinus20DbHz >= 7800 &&
    amMonoSpec.bwMinus20DbHz <= 9000 &&
    amMonoSpec.occupiedBw98Hz >= 7800 &&
    amMonoSpec.occupiedBw98Hz <= 11500;

  results.push({
    id: 'test-12-fft-bandwidth',
    title: 'TEST 12 — FFT Occupied Bandwidth vs Exact Single-Tone AM Span',
    category: 'Power & Spectrum',
    givenParameters: 'Single-tone AM (fc = 100 kHz, fm = 4.0 kHz, μ = 0.80, Hann FFT 61.0 Hz/bin)',
    handCalculation:
      'Exact line spectrum span = (fc + fm) − (fc − fm) = 2·fm = 8.00 kHz; Hann window adds ~4 bins (~0.24 kHz) at −20 dB and wider sideband skirts at 98% integrated power',
    theoreticalValue: '8.00 kHz (Exact line span)',
    simulatorValue: `−20 dB BW = ${(amMonoSpec.bwMinus20DbHz / 1000).toFixed(2)} kHz | 98% FFT BW = ${(amMonoSpec.occupiedBw98Hz / 1000).toFixed(2)} kHz`,
    absoluteError: `|BW_−20dB − 8.00| = ${(absErrAmBw20 / 1000).toFixed(2)} kHz`,
    relativeError: `${relErrAmBw20Pct.toFixed(1)}% (−20 dB vs exact 2·fm)`,
    acceptanceTolerance: '−20 dB BW ∈ [7.80, 9.00] kHz & 98% BW ∈ [7.80, 11.50] kHz',
    percentDifference: `${relErrAmBw20Pct.toFixed(1)}%`,
    status: amBwWithinExpected ? 'APPROXIMATION EXPECTED' : 'FAIL',
    engineeringNote:
      'Finite-window Hann leakage spreads discrete sideband impulses across adjacent bins, placing −20 dB BW just above 8.00 kHz while 98% integrated power captures outer sideband skirts; marked APPROXIMATION EXPECTED rather than exact PASS.',
  });

  // TEST 13: Fixed Random Seed Reproducibility & Independent-Seed Variance
  const sigSeedParams = {
    mode: 'single' as const,
    messageFreqHz: 4000,
    messageAmplitudeV: 1.0,
    samplingFreqHz: 1_000_000,
    durationMs: 4,
    seed: 42,
  };
  const chSeedParams = {
    snrTargetDb: 15,
    noiseEnabled: true,
    referencePowerW: 0.5,
    presetId: 'custom' as const,
  };
  const runA = runFullSimulation(sigSeedParams, amCleanMonoParams, fmParams2, chSeedParams);
  const runB = runFullSimulation(sigSeedParams, amCleanMonoParams, fmParams2, chSeedParams);
  const runC = runFullSimulation(
    { ...sigSeedParams, seed: 43 },
    amCleanMonoParams,
    fmParams2,
    chSeedParams
  );

  let maxFixedDiff = 0;
  let maxOtherSeedDiff = 0;
  for (let i = 0; i < runA.fm.noiseAdded.length; i++) {
    const dSame = Math.abs(runA.fm.recoveredAligned[i] - runB.fm.recoveredAligned[i]);
    if (dSame > maxFixedDiff) maxFixedDiff = dSame;
    const dDiff = Math.abs(runA.fm.noiseAdded[i] - runC.fm.noiseAdded[i]);
    if (dDiff > maxOtherSeedDiff) maxOtherSeedDiff = dDiff;
  }
  const passTest13 =
    maxFixedDiff === 0 &&
    runA.am.outputSnrDb === runB.am.outputSnrDb &&
    runA.fm.outputSnrDb === runB.fm.outputSnrDb &&
    maxOtherSeedDiff > 0.01;

  results.push({
    id: 'test-13-seed-reproducibility',
    title: 'TEST 13 — Fixed Random Seed Reproducibility & Seed Sensitivity',
    category: 'Reproducibility',
    givenParameters: 'Repeated runs with Seed = 42 vs Seed = 43 (15 dB AWGN, fs = 1 MHz, 4 ms)',
    handCalculation:
      'Deterministic Mulberry32 + Box-Muller PRNG must yield bit-identical outputs for Seed 42 == Seed 42 and distinct noise for Seed 43',
    theoreticalValue: 'Max |Δ| (Seed 42 vs 42) = 0.000 | Max |Δnoise| (42 vs 43) > 0.01 V',
    simulatorValue: `Max |Δ| (same seed) = ${maxFixedDiff.toExponential(1)} V | Max |Δnoise| (42 vs 43) = ${maxOtherSeedDiff.toFixed(4)} V`,
    absoluteError: `${maxFixedDiff.toExponential(1)} V`,
    relativeError: `${(maxFixedDiff * 100).toFixed(4)}%`,
    acceptanceTolerance: 'Bit-exact 0.0 V difference on fixed seed; > 0.01 V variation on new seed',
    percentDifference: `${(maxFixedDiff * 100).toFixed(4)}%`,
    status: passTest13 ? 'PASS' : 'FAIL',
    engineeringNote:
      'Verifies full experiment reproducibility for identical seeds while ensuring distinct seeds produce independent AWGN realizations.',
  });

  return results;
}

/**
 * Multi-configuration FM Threshold Sensitivity Verification Suite:
 * Executes live SNR sweeps across different frequency deviations, message frequencies,
 * receiver IF bandwidths, and input SNR ranges to verify genuine physical responsiveness.
 */
export function runFMThresholdSensitivityChecks(): FMThresholdSensitivityCheck[] {
  const baseSig = {
    mode: 'single' as const,
    messageFreqHz: 4000,
    messageAmplitudeV: 1.0,
    samplingFreqHz: 1_000_000,
    durationMs: 4,
    seed: 42,
  };
  const baseAm = {
    carrierAmplitudeV: 1.0,
    carrierFreqHz: 100_000,
    modulationIndex: 0.8,
    coupleAmplitudeToIndex: false,
    rxBandwidthHz: 14_000,
    envelopeTauUs: 35,
    rxLpfCutoffHz: 6000,
  };
  const baseFm = {
    carrierAmplitudeV: 1.0,
    carrierFreqHz: 100_000,
    freqDeviationHz: 20_000,
    rxBandwidthHz: 60_000,
    rxLpfCutoffHz: 6000,
    demodSensitivity: 1.0,
  };

  const s1 = runFMThresholdSweep(baseSig, baseAm, baseFm, 0.5, 30, -14, 2);
  const s2 = runFMThresholdSweep(
    baseSig,
    baseAm,
    { ...baseFm, rxBandwidthHz: 120_000 },
    0.5,
    30,
    -14,
    2
  );
  const s3 = runFMThresholdSweep(
    { ...baseSig, messageFreqHz: 5000 },
    baseAm,
    { ...baseFm, freqDeviationHz: 30_000, rxBandwidthHz: 80_000 },
    0.5,
    30,
    -14,
    2
  );
  const s4 = runFMThresholdSweep(baseSig, baseAm, baseFm, 0.5, 30, 12, 2);

  return [
    {
      id: 'thresh-baseline',
      scenario: 'Baseline Wideband FM',
      paramsSummary: 'fm=4 kHz, Δf=20 kHz (β=5.0), RX BW=60 kHz, +30→−14 dB',
      thresholdDetected: s1.thresholdDetected,
      thresholdInputSnrDb: s1.estimatedThresholdInputSnrDb,
      thresholdCnrDb: s1.estimatedThresholdCnrDb,
      maxSlope: s1.thresholdDropSlope,
      observation: s1.thresholdStatusNote,
    },
    {
      id: 'thresh-wide-bw',
      scenario: 'Doubled Receiver IF Bandwidth',
      paramsSummary: 'fm=4 kHz, Δf=20 kHz (β=5.0), RX BW=120 kHz, +30→−14 dB',
      thresholdDetected: s2.thresholdDetected,
      thresholdInputSnrDb: s2.estimatedThresholdInputSnrDb,
      thresholdCnrDb: s2.estimatedThresholdCnrDb,
      maxSlope: s2.thresholdDropSlope,
      observation: s2.thresholdStatusNote,
    },
    {
      id: 'thresh-high-dev-fm',
      scenario: 'Higher Δf & Higher fm (5 kHz)',
      paramsSummary: 'fm=5 kHz, Δf=30 kHz (β=6.0), RX BW=80 kHz, +30→−14 dB',
      thresholdDetected: s3.thresholdDetected,
      thresholdInputSnrDb: s3.estimatedThresholdInputSnrDb,
      thresholdCnrDb: s3.estimatedThresholdCnrDb,
      maxSlope: s3.thresholdDropSlope,
      observation: s3.thresholdStatusNote,
    },
    {
      id: 'thresh-high-snr-range',
      scenario: 'High-SNR Only Range (No Knee Expected)',
      paramsSummary: 'fm=4 kHz, Δf=20 kHz (β=5.0), RX BW=60 kHz, +30→+12 dB',
      thresholdDetected: s4.thresholdDetected,
      thresholdInputSnrDb: s4.estimatedThresholdInputSnrDb,
      thresholdCnrDb: s4.estimatedThresholdCnrDb,
      maxSlope: s4.thresholdDropSlope,
      observation: s4.thresholdStatusNote,
    },
  ];
}
