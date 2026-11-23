import {
  AMParams,
  ChannelImpairmentMode,
  ChannelParams,
  FMParams,
  FullSimulationResult,
  GeneratedMessage,
  ModulationChainResult,
  SignalParams,
  ThresholdSweepPoint,
  ThresholdSweepResult,
} from '../types/simulation';
import { generateMessageSignal } from './signalGenerator';
import { computeAveragePower, passThroughAWGNChannel } from './channel';
import { analyzeAMMetrics, demodulateAM, modulateAM } from './amModem';
import { analyzeFMMetrics, demodulateFM, modulateFM } from './fmModem';
import { computeSpectrum } from './fft';
import { bandpassFilter6 } from './filters';

function alignAndMeasurePerformance(
  originalMsg: Float64Array,
  recoveredNoisy: Float64Array,
  recoveredCalClean: Float64Array,
  fs: number,
  calScaleFactor = 1.0
): {
  recoveredAligned: Float64Array;
  referenceAligned: Float64Array;
  outputSnrDb: number;
  isOutputSnrPrecisionCapped: boolean;
  nmse: number;
  distortionPct: number;
  delaySamples: number;
  delayMs: number;
  calibrationGain: number;
} {
  const n = originalMsg.length;
  const evalStart = Math.floor(0.18 * n);
  const evalEnd = Math.floor(0.86 * n);
  const evalLen = Math.max(64, evalEnd - evalStart);
  const maxLag = Math.min(Math.floor(0.12 * n), Math.round(0.001 * fs));

  let bestLag = 0;
  let bestCorr = -Infinity;

  let refMean = 0;
  for (let i = evalStart; i < evalEnd; i++) refMean += originalMsg[i];
  refMean /= evalLen;

  for (let lag = 0; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < evalLen; i++) {
      const rVal = originalMsg[evalStart + i] - refMean;
      const yVal = recoveredCalClean[evalStart + i + lag];
      corr += rVal * yVal;
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  let calMean = 0;
  for (let i = 0; i < evalLen; i++) {
    calMean += recoveredCalClean[evalStart + i + bestLag];
  }
  calMean /= evalLen;

  let num = 0;
  let den = 0;
  for (let i = 0; i < evalLen; i++) {
    const rVal = originalMsg[evalStart + i] - refMean;
    const cVal = recoveredCalClean[evalStart + i + bestLag] - calMean;
    num += rVal * cVal;
    den += cVal * cVal;
  }
  const calibrationGain = (den > 1e-18 ? num / den : 1.0) * calScaleFactor;

  const alignedFull = new Float64Array(n);
  let noisyMean = 0;
  for (let i = 0; i < evalLen; i++) {
    noisyMean += recoveredNoisy[evalStart + i + bestLag];
  }
  noisyMean /= evalLen;

  for (let i = 0; i < n; i++) {
    const srcIdx = Math.min(n - 1, i + bestLag);
    alignedFull[i] = (recoveredNoisy[srcIdx] - noisyMean) * calibrationGain;
  }

  let refPowerSum = 0;
  let errPowerSum = 0;
  for (let i = evalStart; i < evalEnd; i++) {
    const r = originalMsg[i] - refMean;
    const y = alignedFull[i];
    const e = r - y;
    refPowerSum += r * r;
    errPowerSum += e * e;
  }

  const nmse = refPowerSum > 1e-18 ? errPowerSum / refPowerSum : 0;
  const distortionPct = Number.isFinite(nmse) ? nmse * 100 : 0;
  const isOutputSnrPrecisionCapped =
    errPowerSum <= 1e-18 || refPowerSum / Math.max(errPowerSum, 1e-30) >= 1e8;
  const rawSnrDb =
    errPowerSum > 1e-18 && refPowerSum > 1e-18
      ? 10 * Math.log10(refPowerSum / errPowerSum)
      : 80;
  const outputSnrDb = Number.isFinite(rawSnrDb)
    ? Math.max(-40, Math.min(80, rawSnrDb))
    : 80;

  return {
    recoveredAligned: alignedFull,
    referenceAligned: originalMsg,
    outputSnrDb,
    isOutputSnrPrecisionCapped,
    nmse,
    distortionPct,
    delaySamples: bestLag,
    delayMs: (bestLag / fs) * 1000,
    calibrationGain,
  };
}

function runAMChain(
  message: GeneratedMessage,
  amParams: AMParams,
  channelParams: ChannelParams,
  seed: number
): { chain: ModulationChainResult; effectiveMu: number; txRaw: Float64Array } {
  const { txSignal: txRaw, effectiveMu } = modulateAM(message, amParams);

  const impairment = channelParams.impairmentMode ?? 'awgn';
  const ch = passThroughAWGNChannel(
    txRaw,
    channelParams.referencePowerW,
    channelParams.snrTargetDb,
    channelParams.noiseEnabled,
    seed,
    impairment,
    message.fs
  );

  const rx = demodulateAM(ch.receivedNoisy, message.fs, amParams);

  const cleanBpf = bandpassFilter6(
    ch.normalizedTx,
    amParams.carrierFreqHz,
    amParams.rxBandwidthHz,
    message.fs
  );
  const noiseBpf = bandpassFilter6(
    ch.noiseAdded,
    amParams.carrierFreqHz,
    amParams.rxBandwidthHz,
    message.fs
  );
  const cleanBpfPow = computeAveragePower(cleanBpf.subarray(Math.floor(0.15 * message.numSamples)));
  const noiseBpfPow = computeAveragePower(noiseBpf.subarray(Math.floor(0.15 * message.numSamples)));
  const postBpfCnrDb =
    channelParams.noiseEnabled && noiseBpfPow > 1e-18
      ? 10 * Math.log10(cleanBpfPow / noiseBpfPow)
      : Infinity;

  const calMu = effectiveMu > 0.9 ? 0.5 : Math.max(effectiveMu, 0.2);
  const { txSignal: calTxRaw } = modulateAM(message, {
    ...amParams,
    coupleAmplitudeToIndex: false,
    modulationIndex: calMu,
  });
  const calCh = passThroughAWGNChannel(
    calTxRaw,
    channelParams.referencePowerW,
    40,
    false,
    seed
  );
  const calRx = demodulateAM(calCh.receivedNoisy, message.fs, amParams);

  const rawPowCal = computeAveragePower(calTxRaw);
  const normRatio =
    rawPowCal > 1e-18 && ch.rawSignalPowerW > 1e-18
      ? Math.sqrt(ch.rawSignalPowerW / rawPowCal)
      : 1.0;
  const calScale = (calMu / Math.max(effectiveMu, 1e-4)) * normRatio;

  const perf = alignAndMeasurePerformance(
    message.messageV,
    rx.demodulatedAudio,
    calRx.demodulatedAudio,
    message.fs,
    calScale
  );

  const txSpectrum = computeSpectrum(ch.normalizedTx, message.fs);
  const rxSpectrum = computeSpectrum(ch.receivedNoisy, message.fs);

  const snrImprovementDb = Number.isFinite(ch.measuredInputSnrDb)
    ? perf.outputSnrDb - ch.measuredInputSnrDb
    : 0;

  const originalMessagePowerW = computeAveragePower(message.messageV);
  const snrCalibrationErrorDb =
    channelParams.noiseEnabled && Number.isFinite(ch.measuredInputSnrDb)
      ? Math.abs(ch.measuredInputSnrDb - channelParams.snrTargetDb)
      : 0;

  return {
    txRaw,
    effectiveMu,
    chain: {
      transmittedRaw: txRaw,
      transmittedNorm: ch.normalizedTx,
      receivedNoisy: ch.receivedNoisy,
      bandpassFiltered: rx.bandpassFiltered,
      demodulatedRaw: rx.demodulatedAudio,
      recoveredAligned: perf.recoveredAligned,
      noiseAdded: ch.noiseAdded,
      referenceAligned: perf.referenceAligned,
      originalMessagePowerW,
      targetSnrDb: channelParams.snrTargetDb,
      inputSnrDb: ch.measuredInputSnrDb,
      snrCalibrationErrorDb,
      postBpfCnrDb,
      outputSnrDb: perf.outputSnrDb,
      isOutputSnrPrecisionCapped: perf.isOutputSnrPrecisionCapped,
      snrImprovementDb,
      nmse: perf.nmse,
      distortionPct: perf.distortionPct,
      delaySamples: perf.delaySamples,
      delayMs: perf.delayMs,
      calibrationGain: perf.calibrationGain,
      rawSignalPowerW: ch.rawSignalPowerW,
      channelSignalPowerW: ch.channelSignalPowerW,
      noisePowerW: ch.noisePowerW,
      txSpectrum,
      rxSpectrum,
    },
  };
}

function runFMChain(
  message: GeneratedMessage,
  fmParams: FMParams,
  channelParams: ChannelParams,
  seed: number,
  computeSpectra = true
): { chain: ModulationChainResult; instFreqHz: Float64Array } {
  const { txSignal: txRaw, instFreqHz } = modulateFM(message, fmParams);

  const impairment = channelParams.impairmentMode ?? 'awgn';
  const ch = passThroughAWGNChannel(
    txRaw,
    channelParams.referencePowerW,
    channelParams.snrTargetDb,
    channelParams.noiseEnabled,
    seed,
    impairment,
    message.fs
  );

  const rx = demodulateFM(ch.receivedNoisy, message.fs, fmParams);

  const cleanBpf = bandpassFilter6(
    ch.normalizedTx,
    fmParams.carrierFreqHz,
    fmParams.rxBandwidthHz,
    message.fs
  );
  const noiseBpf = bandpassFilter6(
    ch.noiseAdded,
    fmParams.carrierFreqHz,
    fmParams.rxBandwidthHz,
    message.fs
  );
  const cleanBpfPow = computeAveragePower(cleanBpf.subarray(Math.floor(0.15 * message.numSamples)));
  const noiseBpfPow = computeAveragePower(noiseBpf.subarray(Math.floor(0.15 * message.numSamples)));
  const postBpfCnrDb =
    channelParams.noiseEnabled && noiseBpfPow > 1e-18
      ? 10 * Math.log10(cleanBpfPow / noiseBpfPow)
      : Infinity;

  const fmCalClean = passThroughAWGNChannel(
    txRaw,
    channelParams.referencePowerW,
    40,
    false,
    seed,
    'awgn',
    message.fs
  );
  const calRx = demodulateFM(fmCalClean.normalizedTx, message.fs, {
    ...fmParams,
    demodSensitivity: 1.0,
  });

  const perf = alignAndMeasurePerformance(
    message.messageV,
    rx.demodulatedAudio,
    calRx.demodulatedAudio,
    message.fs,
    1.0
  );

  const emptySpec = {
    frequenciesKHz: new Float64Array(0),
    magnitudeV: new Float64Array(0),
    powerDb: new Float64Array(0),
    peakFreqKHz: 0,
    peakPowerDb: 0,
    occupiedBw98Hz: 0,
    bwMinus20DbHz: 0,
    fftSize: 0,
    binResolutionHz: 0,
  };

  const txSpectrum = computeSpectra ? computeSpectrum(ch.normalizedTx, message.fs) : emptySpec;
  const rxSpectrum = computeSpectra ? computeSpectrum(ch.receivedNoisy, message.fs) : emptySpec;

  const snrImprovementDb = Number.isFinite(ch.measuredInputSnrDb)
    ? perf.outputSnrDb - ch.measuredInputSnrDb
    : 0;

  const originalMessagePowerW = computeAveragePower(message.messageV);
  const snrCalibrationErrorDb =
    channelParams.noiseEnabled && Number.isFinite(ch.measuredInputSnrDb)
      ? Math.abs(ch.measuredInputSnrDb - channelParams.snrTargetDb)
      : 0;

  return {
    instFreqHz,
    chain: {
      transmittedRaw: txRaw,
      transmittedNorm: ch.normalizedTx,
      receivedNoisy: ch.receivedNoisy,
      bandpassFiltered: rx.bandpassFiltered,
      demodulatedRaw: rx.demodulatedAudio,
      recoveredAligned: perf.recoveredAligned,
      noiseAdded: ch.noiseAdded,
      referenceAligned: perf.referenceAligned,
      originalMessagePowerW,
      targetSnrDb: channelParams.snrTargetDb,
      inputSnrDb: ch.measuredInputSnrDb,
      snrCalibrationErrorDb,
      postBpfCnrDb,
      outputSnrDb: perf.outputSnrDb,
      isOutputSnrPrecisionCapped: perf.isOutputSnrPrecisionCapped,
      snrImprovementDb,
      nmse: perf.nmse,
      distortionPct: perf.distortionPct,
      delaySamples: perf.delaySamples,
      delayMs: perf.delayMs,
      calibrationGain: perf.calibrationGain,
      rawSignalPowerW: ch.rawSignalPowerW,
      channelSignalPowerW: ch.channelSignalPowerW,
      noisePowerW: ch.noisePowerW,
      txSpectrum,
      rxSpectrum,
    },
  };
}

export function runFullSimulation(
  signalParams: SignalParams,
  amParams: AMParams,
  fmParams: FMParams,
  channelParams: ChannelParams
): FullSimulationResult {
  const signal = generateMessageSignal(signalParams);
  const messageSpectrum = computeSpectrum(signal.messageV, signal.fs);

  const warnings: string[] = [];

  if (amParams.carrierFreqHz + signal.fMaxHz >= 0.45 * signal.fs) {
    warnings.push(
      `AM upper sideband (${((amParams.carrierFreqHz + signal.fMaxHz) / 1000).toFixed(1)} kHz) approaches Nyquist limit (${(signal.fs / 2000).toFixed(1)} kHz).`
    );
  }
  if (fmParams.carrierFreqHz + fmParams.freqDeviationHz + signal.fMaxHz >= 0.45 * signal.fs) {
    warnings.push(
      `FM upper spectrum edge approaches Nyquist limit (${(signal.fs / 2000).toFixed(1)} kHz).`
    );
  }
  if (fmParams.carrierFreqHz - fmParams.freqDeviationHz - signal.fMaxHz <= 5000) {
    warnings.push(
      `FM lower sideband approaches baseband DC (< 5 kHz). Increase FM carrier frequency.`
    );
  }

  const amRun = runAMChain(signal, amParams, channelParams, signalParams.seed + 1000);
  const fmRun = runFMChain(signal, fmParams, channelParams, signalParams.seed + 1000, true);

  const amMetrics = analyzeAMMetrics(
    signal,
    amRun.txRaw,
    amParams,
    amRun.effectiveMu,
    amRun.chain.txSpectrum.occupiedBw98Hz,
    amRun.chain.txSpectrum.bwMinus20DbHz
  );
  const fmMetrics = analyzeFMMetrics(
    signal,
    fmRun.instFreqHz,
    fmParams,
    fmRun.chain.txSpectrum.occupiedBw98Hz,
    fmRun.chain.txSpectrum.bwMinus20DbHz
  );

  if (amMetrics.isOvermodulated) {
    warnings.push(
      `AM Overmodulation Active (μ = ${amMetrics.effectiveMu.toFixed(2)} > 1.00): Conventional RC envelope detection experiences phase-reversal foldover distortion.`
    );
  }
  if (!fmMetrics.isInstantaneousFreqValid) {
    warnings.push(
      `FM Instantaneous Frequency (${(fmMetrics.minInstFreqHz / 1000).toFixed(1)}–${(fmMetrics.maxInstFreqHz / 1000).toFixed(1)} kHz) violates safe discrete-time bounds.`
    );
  }
  if (fmParams.rxBandwidthHz < fmMetrics.carsonBwHz * 0.9) {
    warnings.push(
      `FM Receiver IF Bandwidth (${(fmParams.rxBandwidthHz / 1000).toFixed(0)} kHz) is narrower than Carson's Bandwidth (${(fmMetrics.carsonBwHz / 1000).toFixed(1)} kHz), risking FM sideband truncation.`
    );
  }

  return {
    signal,
    messageSpectrum,
    am: amRun.chain,
    amMetrics,
    fm: fmRun.chain,
    fmMetrics,
    warnings,
  };
}

export function runFMThresholdSweep(
  signalParams: SignalParams,
  amParams: AMParams,
  fmParams: FMParams,
  channelRefPowerW: number,
  snrStartDb = 30,
  snrEndDb = -14,
  stepDb = 2,
  seedCount = 1,
  impairmentMode: ChannelImpairmentMode = 'awgn'
): ThresholdSweepResult {
  const sweepSignalParams: SignalParams = {
    ...signalParams,
    durationMs: Math.min(signalParams.durationMs, 4),
  };
  const message = generateMessageSignal(sweepSignalParams);

  const { txSignal: fmTxRaw } = modulateFM(message, fmParams);
  const { txSignal: amTxRaw, effectiveMu } = modulateAM(message, amParams);

  const fmCleanCh = passThroughAWGNChannel(fmTxRaw, channelRefPowerW, 40, false, signalParams.seed);
  const fmCalRx = demodulateFM(fmCleanCh.receivedNoisy, message.fs, {
    ...fmParams,
    demodSensitivity: 1.0,
  });
  const fmCleanBpf = bandpassFilter6(
    fmCleanCh.normalizedTx,
    fmParams.carrierFreqHz,
    fmParams.rxBandwidthHz,
    message.fs
  );
  const fmCleanBpfPow = computeAveragePower(
    fmCleanBpf.subarray(Math.floor(0.18 * message.numSamples))
  );

  const calMu = effectiveMu > 0.9 ? 0.5 : Math.max(effectiveMu, 0.2);
  const { txSignal: amCalTx } = modulateAM(message, {
    ...amParams,
    coupleAmplitudeToIndex: false,
    modulationIndex: calMu,
  });
  const amCalCh = passThroughAWGNChannel(amCalTx, channelRefPowerW, 40, false, signalParams.seed);
  const amCalRx = demodulateAM(amCalCh.receivedNoisy, message.fs, amParams);
  const rawPowCal = computeAveragePower(amCalTx);
  const rawPowAm = computeAveragePower(amTxRaw);
  const amScale =
    (calMu / Math.max(effectiveMu, 1e-4)) *
    (rawPowCal > 1e-18 && rawPowAm > 1e-18 ? Math.sqrt(rawPowAm / rawPowCal) : 1.0);

  const points: ThresholdSweepPoint[] = [];
  const high = Math.max(snrStartDb, snrEndDb);
  const low = Math.min(snrStartDb, snrEndDb);
  const step = Math.max(1, Math.abs(stepDb));
  const numSeeds = Math.max(1, Math.min(5, Math.round(seedCount)));

  for (let snr = high; snr >= low; snr -= step) {
    let sumInSnr = 0;
    let sumCnr = 0;
    let sumFmOut = 0;
    let sumFmDist = 0;
    let sumAmOut = 0;
    let sumAmDist = 0;

    for (let s = 0; s < numSeeds; s++) {
      const iterSeed = signalParams.seed + 2000 + Math.round((high - snr) * 10) + s * 7919;
      const fmCh = passThroughAWGNChannel(
        fmTxRaw,
        channelRefPowerW,
        snr,
        true,
        iterSeed,
        impairmentMode,
        message.fs
      );
      const fmRx = demodulateFM(fmCh.receivedNoisy, message.fs, fmParams);
      const fmNoiseBpf = bandpassFilter6(
        fmCh.noiseAdded,
        fmParams.carrierFreqHz,
        fmParams.rxBandwidthHz,
        message.fs
      );
      const fmNoiseBpfPow = computeAveragePower(
        fmNoiseBpf.subarray(Math.floor(0.18 * message.numSamples))
      );
      const fmPostBpfCnrDb =
        fmNoiseBpfPow > 1e-18 ? 10 * Math.log10(fmCleanBpfPow / fmNoiseBpfPow) : Infinity;

      const fmPerf = alignAndMeasurePerformance(
        message.messageV,
        fmRx.demodulatedAudio,
        fmCalRx.demodulatedAudio,
        message.fs,
        1.0
      );

      const amCh = passThroughAWGNChannel(
        amTxRaw,
        channelRefPowerW,
        snr,
        true,
        iterSeed,
        impairmentMode,
        message.fs
      );
      const amRx = demodulateAM(amCh.receivedNoisy, message.fs, amParams);
      const amPerf = alignAndMeasurePerformance(
        message.messageV,
        amRx.demodulatedAudio,
        amCalRx.demodulatedAudio,
        message.fs,
        amScale
      );

      sumInSnr += fmCh.measuredInputSnrDb;
      sumCnr += Number.isFinite(fmPostBpfCnrDb) ? fmPostBpfCnrDb : 80;
      sumFmOut += fmPerf.outputSnrDb;
      sumFmDist += Math.min(999, fmPerf.distortionPct);
      sumAmOut += amPerf.outputSnrDb;
      sumAmDist += Math.min(999, amPerf.distortionPct);
    }

    points.push({
      inputSnrDb: Number((sumInSnr / numSeeds).toFixed(2)),
      fmPostBpfCnrDb: Number((sumCnr / numSeeds).toFixed(2)),
      fmOutputSnrDb: Number((sumFmOut / numSeeds).toFixed(2)),
      fmDistortionPct: Number((sumFmDist / numSeeds).toFixed(2)),
      amOutputSnrDb: Number((sumAmOut / numSeeds).toFixed(2)),
      amDistortionPct: Number((sumAmDist / numSeeds).toFixed(2)),
    });
  }

  // Empirical FM threshold detection strictly from measured output SNR & distortion curve.
  // Never fabricates a threshold value or relies on a fixed universal dB drop rule.
  let maxDropSlope = 0;
  let steepestIdx = -1;

  for (let i = 1; i < points.length; i++) {
    const dInput = points[i - 1].inputSnrDb - points[i].inputSnrDb;
    const dOutput = points[i - 1].fmOutputSnrDb - points[i].fmOutputSnrDb;
    const slope = dInput > 0 ? dOutput / dInput : 0;
    if (slope > maxDropSlope && points[i].inputSnrDb < high - 2) {
      maxDropSlope = slope;
      steepestIdx = i;
    }
  }

  // Verify genuine threshold collapse:
  // 1) An above-threshold regime exists (at least one high-SNR point with FM distortion < 3%)
  // 2) Rapid nonlinear slope >= 2.0 dB/dB occurs with rising distortion (>= 3.0% at low end)
  const hasAboveThresholdRegime = points.some((p) => p.fmDistortionPct < 3.0);
  const lowEndDistortion = points[points.length - 1]?.fmDistortionPct ?? 0;

  let thresholdDetected = false;
  let thresholdPoint: ThresholdSweepPoint | null = null;
  let regionStart: ThresholdSweepPoint | null = null;
  let regionEnd: ThresholdSweepPoint | null = null;

  if (
    hasAboveThresholdRegime &&
    steepestIdx >= 1 &&
    maxDropSlope >= 2.0 &&
    lowEndDistortion >= 3.0
  ) {
    thresholdDetected = true;
    // Knee onset: walk upward from steepest collapse until slope flattens below 1.6 dB/dB
    let kneeIdx = steepestIdx - 1;
    while (kneeIdx > 0) {
      const dIn = points[kneeIdx - 1].inputSnrDb - points[kneeIdx].inputSnrDb;
      const dOut = points[kneeIdx - 1].fmOutputSnrDb - points[kneeIdx].fmOutputSnrDb;
      const localSlope = dIn > 0 ? dOut / dIn : 0;
      if (localSlope < 1.6) break;
      kneeIdx--;
    }
    thresholdPoint = points[kneeIdx];
    regionStart = points[Math.max(0, kneeIdx)];
    regionEnd = points[Math.min(points.length - 1, steepestIdx + 1)];
  }

  const thresholdStatusNote = thresholdDetected && thresholdPoint
    ? `Threshold knee detected around ${thresholdPoint.inputSnrDb.toFixed(1)} dB channel SNR (${thresholdPoint.fmPostBpfCnrDb.toFixed(1)} dB post-BPF CNR), where FM output SNR is ${thresholdPoint.fmOutputSnrDb.toFixed(2)} dB before collapsing at ${maxDropSlope.toFixed(2)} dB/dB (${step} dB step, ${numSeeds}-seed average).`
    : `No clear rapid threshold collapse was detected across ${low} to ${high} dB input SNR for this configuration (max local slope ${maxDropSlope.toFixed(2)} dB/dB, ${step} dB step, ${numSeeds}-seed average). Try widening the SNR sweep or adjusting FM RX bandwidth / β.`;

  return {
    points: [...points].reverse(),
    thresholdDetected,
    estimatedThresholdInputSnrDb: thresholdPoint ? thresholdPoint.inputSnrDb : null,
    estimatedThresholdOutputSnrDb: thresholdPoint ? thresholdPoint.fmOutputSnrDb : null,
    estimatedThresholdCnrDb: thresholdPoint ? thresholdPoint.fmPostBpfCnrDb : null,
    thresholdRegionStartSnrDb: regionStart ? regionStart.inputSnrDb : null,
    thresholdRegionEndSnrDb: regionEnd ? regionEnd.inputSnrDb : null,
    thresholdDropSlope: Number(maxDropSlope.toFixed(2)),
    thresholdStatusNote,
    beta: fmParams.freqDeviationHz / message.fMaxHz,
    fmRxBandwidthHz: fmParams.rxBandwidthHz,
    stepDb: step,
    seedCount: numSeeds,
    impairmentMode,
    deEmphasisUs: fmParams.deEmphasisUs ?? 0,
  };
}
