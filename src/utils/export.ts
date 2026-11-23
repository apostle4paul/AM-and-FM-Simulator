import {
  AMParams,
  ChannelParams,
  FMParams,
  FullSimulationResult,
  SavedExperimentRecord,
  SignalParams,
  ThresholdSweepResult,
  ValidationCheckResult,
} from '../types/simulation';

export interface ActiveExperimentConfig {
  signalParams: SignalParams;
  amParams: AMParams;
  fmParams: FMParams;
  channelParams: ChannelParams;
}

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportExperimentsToCSV(records: SavedExperimentRecord[]): void {
  const headers = [
    'Experiment ID',
    'Preset Name',
    'Timestamp (ISO)',
    'Message Mode',
    'Message Freq (Hz)',
    'Message Amp (V)',
    'Sampling Freq (Hz)',
    'Duration (ms)',
    'Seed',
    'Channel Noise Enabled',
    'Target SNR (dB)',
    'Reference Power (W)',
    'AM Carrier Freq (Hz)',
    'AM Carrier Amp (V)',
    'AM Mod Index (mu)',
    'AM RX BW (Hz)',
    'AM Envelope Tau (us)',
    'AM LPF Cutoff (Hz)',
    'AM Input SNR (dB)',
    'AM Output SNR (dB)',
    'AM SNR Gain (dB)',
    'AM Distortion NMSE (%)',
    'AM Theoretical BW (Hz)',
    'FM Carrier Freq (Hz)',
    'FM Carrier Amp (V)',
    'FM Freq Dev (Hz)',
    'FM Mod Index (beta)',
    'FM RX BW (Hz)',
    'FM LPF Cutoff (Hz)',
    'FM Input SNR (dB)',
    'FM Post-BPF CNR (dB)',
    'FM Output SNR (dB)',
    'FM SNR Gain (dB)',
    'FM Distortion NMSE (%)',
    'FM Carson BW (Hz)',
    'Channel Model',
    'FM Pre/De-Emphasis (us)',
  ];

  const rows = records.map((r) => [
    r.id,
    `"${r.presetName}"`,
    r.timestampIso,
    r.signalParams.mode,
    r.signalParams.messageFreqHz,
    r.signalParams.messageAmplitudeV,
    r.signalParams.samplingFreqHz,
    r.signalParams.durationMs,
    r.signalParams.seed,
    r.channelParams.noiseEnabled,
    r.channelParams.snrTargetDb,
    r.channelParams.referencePowerW,
    r.amParams.carrierFreqHz,
    r.amParams.carrierAmplitudeV,
    r.amEffectiveMu.toFixed(4),
    r.amParams.rxBandwidthHz,
    r.amParams.envelopeTauUs,
    r.amParams.rxLpfCutoffHz,
    Number.isFinite(r.amInputSnrDb) ? r.amInputSnrDb.toFixed(3) : 'Inf',
    r.amOutputSnrDb.toFixed(3),
    r.amSnrGainDb.toFixed(3),
    r.amDistortionPct.toFixed(4),
    r.amTheoreticalBwHz.toFixed(1),
    r.fmParams.carrierFreqHz,
    r.fmParams.carrierAmplitudeV,
    r.fmParams.freqDeviationHz,
    r.fmBeta.toFixed(4),
    r.fmParams.rxBandwidthHz,
    r.fmParams.rxLpfCutoffHz,
    Number.isFinite(r.fmInputSnrDb) ? r.fmInputSnrDb.toFixed(3) : 'Inf',
    Number.isFinite(r.fmPostBpfCnrDb) ? r.fmPostBpfCnrDb.toFixed(3) : 'Inf',
    r.fmOutputSnrDb.toFixed(3),
    r.fmSnrGainDb.toFixed(3),
    r.fmDistortionPct.toFixed(4),
    r.fmCarsonBwHz.toFixed(1),
    r.channelParams.impairmentMode ?? 'awgn',
    r.fmParams.deEmphasisUs ?? 0,
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  triggerDownload('am_fm_experiment_results.csv', csv, 'text/csv;charset=utf-8;');
}

export function exportThresholdSweepToCSV(sweep: ThresholdSweepResult): void {
  const metaLines = [
    `# FM Threshold Sweep Metadata: beta=${sweep.beta.toFixed(3)}, fmRxBandwidthHz=${sweep.fmRxBandwidthHz}, stepDb=${sweep.stepDb ?? 2}, seedCount=${sweep.seedCount ?? 1}, impairmentMode=${sweep.impairmentMode ?? 'awgn'}, deEmphasisUs=${sweep.deEmphasisUs ?? 0}, thresholdDetected=${sweep.thresholdDetected}, estimatedThresholdInputSnrDb=${sweep.estimatedThresholdInputSnrDb ?? 'N/A'}, estimatedThresholdCnrDb=${sweep.estimatedThresholdCnrDb ?? 'N/A'}, maxSlope=${sweep.thresholdDropSlope}`,
  ];
  const headers = [
    'Channel Input SNR (dB)',
    'FM Post-BPF CNR_IF (dB)',
    'FM Output SNR (dB)',
    'FM NMSE Distortion (%)',
    'AM Output SNR (dB)',
    'AM NMSE Distortion (%)',
  ];
  const rows = sweep.points.map((p) => [
    p.inputSnrDb.toFixed(2),
    p.fmPostBpfCnrDb.toFixed(2),
    p.fmOutputSnrDb.toFixed(2),
    p.fmDistortionPct.toFixed(3),
    p.amOutputSnrDb.toFixed(2),
    p.amDistortionPct.toFixed(3),
  ]);
  const csv = [...metaLines, headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  triggerDownload('fm_threshold_sweep.csv', csv, 'text/csv;charset=utf-8;');
}

export function exportCurrentComparisonJSON(
  sim: FullSimulationResult,
  config: ActiveExperimentConfig,
  validation: ValidationCheckResult[],
  thresholdSweep?: ThresholdSweepResult | null
): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    application: 'AM vs FM Communication Laboratory',
    configuration: config,
    warnings: sim.warnings,
    numericalComparison: {
      signal: {
        mode: config.signalParams.mode,
        fMaxHz: sim.signal.fMaxHz,
        fsHz: sim.signal.fs,
        numSamples: sim.signal.numSamples,
        durationMs: sim.signal.durationSec * 1000,
        rmsV: sim.signal.rmsV,
        peakV: sim.signal.peakV,
        originalMessagePowerW: sim.am.originalMessagePowerW,
      },
      am: {
        targetSnrDb: sim.am.targetSnrDb,
        inputSnrDb: sim.am.inputSnrDb,
        snrCalibrationErrorDb: sim.am.snrCalibrationErrorDb,
        postBpfCnrDb: sim.am.postBpfCnrDb,
        outputSnrDb: sim.am.outputSnrDb,
        isOutputSnrPrecisionCapped: sim.am.isOutputSnrPrecisionCapped,
        snrImprovementDb: sim.am.snrImprovementDb,
        nmse: sim.am.nmse,
        nmseDistortionPct: sim.am.distortionPct,
        delayMs: sim.am.delayMs,
        calibrationGain: sim.am.calibrationGain,
        rawSignalPowerW: sim.am.rawSignalPowerW,
        channelSignalPowerW: sim.am.channelSignalPowerW,
        noisePowerW: sim.am.noisePowerW,
        effectiveMu: sim.amMetrics.effectiveMu,
        isOvermodulated: sim.amMetrics.isOvermodulated,
        theoreticalBwHz: sim.amMetrics.theoreticalBwHz,
        measuredBw98Hz: sim.amMetrics.measuredBw98Hz,
        measuredBw20DbHz: sim.amMetrics.measuredBw20DbHz,
        modulationEfficiencyPct: sim.amMetrics.modulationEfficiencyPct,
        theoreticalEfficiencyPct: sim.amMetrics.theoreticalEfficiencyPct,
        carrierPowerW: sim.amMetrics.carrierPowerW,
        totalPowerW: sim.amMetrics.totalPowerW,
        sidebandPowerW: sim.amMetrics.sidebandPowerW,
        theoreticalTotalPowerW: sim.amMetrics.theoreticalTotalPowerW,
        singleTonePowerW: sim.amMetrics.singleTonePowerW,
      },
      fm: {
        targetSnrDb: sim.fm.targetSnrDb,
        inputSnrDb: sim.fm.inputSnrDb,
        snrCalibrationErrorDb: sim.fm.snrCalibrationErrorDb,
        postBpfCnrDb: sim.fm.postBpfCnrDb,
        outputSnrDb: sim.fm.outputSnrDb,
        isOutputSnrPrecisionCapped: sim.fm.isOutputSnrPrecisionCapped,
        snrImprovementDb: sim.fm.snrImprovementDb,
        nmse: sim.fm.nmse,
        nmseDistortionPct: sim.fm.distortionPct,
        delayMs: sim.fm.delayMs,
        calibrationGain: sim.fm.calibrationGain,
        rawSignalPowerW: sim.fm.rawSignalPowerW,
        channelSignalPowerW: sim.fm.channelSignalPowerW,
        noisePowerW: sim.fm.noisePowerW,
        beta: sim.fmMetrics.beta,
        freqDeviationHz: sim.fmMetrics.freqDeviationHz,
        measuredPeakDeviationHz: sim.fmMetrics.measuredPeakDeviationHz,
        carsonBwHz: sim.fmMetrics.carsonBwHz,
        measuredBw98Hz: sim.fmMetrics.measuredBw98Hz,
        measuredBw20DbHz: sim.fmMetrics.measuredBw20DbHz,
      },
    },
    thresholdSweep: thresholdSweep ?? null,
    validationSuite: validation,
  };
  triggerDownload(
    'am_fm_simulation_snapshot.json',
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8;'
  );
}

export function exportSummaryMarkdown(
  sim: FullSimulationResult,
  records: SavedExperimentRecord[],
  validation: ValidationCheckResult[],
  config?: ActiveExperimentConfig,
  thresholdSweep?: ThresholdSweepResult | null
): void {
  const lines: string[] = [
    '# AM vs FM Communication Laboratory — Engineering Summary Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## 1. Active Simulation Configuration & Snapshot',
    `- Sampling Frequency: ${(sim.signal.fs / 1000).toFixed(0)} kHz (${sim.signal.numSamples} samples, ${(sim.signal.durationSec * 1000).toFixed(1)} ms)`,
    `- Message Max Frequency: ${(sim.signal.fMaxHz / 1000).toFixed(2)} kHz | Peak Amplitude: ${sim.signal.peakV.toFixed(2)} V | Message Power: ${sim.am.originalMessagePowerW.toFixed(4)} W`,
  ];

  if (config) {
    lines.push(
      `- Signal Generator: Mode = ${config.signalParams.mode}, Primary Tone = ${(config.signalParams.messageFreqHz / 1000).toFixed(2)} kHz, Am = ${config.signalParams.messageAmplitudeV.toFixed(2)} V, Seed = #${config.signalParams.seed}`,
      `- Channel Setup: Noise = ${config.channelParams.noiseEnabled ? 'Enabled' : 'Disabled'}, Model = ${config.channelParams.impairmentMode ?? 'awgn'}, Target SNR = ${config.channelParams.snrTargetDb} dB, Equalized P_ref = ${config.channelParams.referencePowerW.toFixed(2)} W`,
      `- AM Config: Ac = ${config.amParams.carrierAmplitudeV.toFixed(1)} V, fc = ${(config.amParams.carrierFreqHz / 1000).toFixed(0)} kHz, μ_target = ${config.amParams.modulationIndex.toFixed(2)} (coupled=${config.amParams.coupleAmplitudeToIndex}), RX BPF = ${(config.amParams.rxBandwidthHz / 1000).toFixed(1)} kHz, RC τ = ${config.amParams.envelopeTauUs} μs, Audio LPF = ${(config.amParams.rxLpfCutoffHz / 1000).toFixed(1)} kHz`,
      `- FM Config: Ac = ${config.fmParams.carrierAmplitudeV.toFixed(1)} V, fc = ${(config.fmParams.carrierFreqHz / 1000).toFixed(0)} kHz, Δf_nom = ${(config.fmParams.freqDeviationHz / 1000).toFixed(1)} kHz (Measured peak = ${(sim.fmMetrics.measuredPeakDeviationHz / 1000).toFixed(2)} kHz), RX BPF = ${(config.fmParams.rxBandwidthHz / 1000).toFixed(1)} kHz, Audio LPF = ${(config.fmParams.rxLpfCutoffHz / 1000).toFixed(1)} kHz, Sensitivity = ${config.fmParams.demodSensitivity.toFixed(2)}×, Pre/De-Emphasis = ${(config.fmParams.deEmphasisUs ?? 0) === 0 ? 'Off' : `${config.fmParams.deEmphasisUs} μs`}`
    );
  }

  lines.push(
    '',
    '| Metric | AM (DSB-FC) | FM |',
    '|---|---:|---:|',
    `| Unnormalized TX Power (W) | ${sim.am.rawSignalPowerW.toFixed(4)} | ${sim.fm.rawSignalPowerW.toFixed(4)} |`,
    `| Equalized Channel Signal Power (W) | ${sim.am.channelSignalPowerW.toFixed(4)} | ${sim.fm.channelSignalPowerW.toFixed(4)} |`,
    `| Measured Input SNR (dB) | ${Number.isFinite(sim.am.inputSnrDb) ? `${sim.am.inputSnrDb.toFixed(2)} (err ${sim.am.snrCalibrationErrorDb.toFixed(3)} dB)` : 'Noise Off'} | ${Number.isFinite(sim.fm.inputSnrDb) ? `${sim.fm.inputSnrDb.toFixed(2)} (err ${sim.fm.snrCalibrationErrorDb.toFixed(3)} dB)` : 'Noise Off'} |`,
    `| Post-BPF CNR (dB) | ${Number.isFinite(sim.am.postBpfCnrDb) ? sim.am.postBpfCnrDb.toFixed(2) : 'Noise Off'} | ${Number.isFinite(sim.fm.postBpfCnrDb) ? sim.fm.postBpfCnrDb.toFixed(2) : 'Noise Off'} |`,
    `| Output SNR (dB) | ${sim.am.isOutputSnrPrecisionCapped ? '>' : ''}${sim.am.outputSnrDb.toFixed(2)} | ${sim.fm.isOutputSnrPrecisionCapped ? '>' : ''}${sim.fm.outputSnrDb.toFixed(2)} |`,
    `| Distortion NMSE (%) | ${sim.am.distortionPct.toFixed(3)}% | ${sim.fm.distortionPct.toFixed(3)}% |`,
    `| Modulation Index | μ = ${sim.amMetrics.effectiveMu.toFixed(2)} | β = ${sim.fmMetrics.beta.toFixed(2)} |`,
    `| Theoretical Bandwidth | ${(sim.amMetrics.theoreticalBwHz / 1000).toFixed(2)} kHz | ${(sim.fmMetrics.carsonBwHz / 1000).toFixed(2)} kHz |`,
    `| 98% / −20 dB FFT BW | ${(sim.amMetrics.measuredBw98Hz / 1000).toFixed(2)} / ${(sim.amMetrics.measuredBw20DbHz / 1000).toFixed(2)} kHz | ${(sim.fmMetrics.measuredBw98Hz / 1000).toFixed(2)} / ${(sim.fmMetrics.measuredBw20DbHz / 1000).toFixed(2)} kHz |`
  );

  if (thresholdSweep) {
    lines.push(
      '',
      '## 2. FM Threshold Sweep Summary',
      `- β = ${thresholdSweep.beta.toFixed(2)}, FM RX IF BW = ${(thresholdSweep.fmRxBandwidthHz / 1000).toFixed(0)} kHz, Step = ${thresholdSweep.stepDb ?? 2} dB, Ensemble Seeds = ${thresholdSweep.seedCount ?? 1}`,
      `- Threshold Detected: ${thresholdSweep.thresholdDetected ? `Yes (~${thresholdSweep.estimatedThresholdInputSnrDb?.toFixed(1)} dB input SNR / ${thresholdSweep.estimatedThresholdCnrDb?.toFixed(1)} dB CNR, out SNR ${thresholdSweep.estimatedThresholdOutputSnrDb?.toFixed(2)} dB, max slope ${thresholdSweep.thresholdDropSlope.toFixed(2)} dB/dB)` : `No (${thresholdSweep.thresholdStatusNote})`}`
    );
  }

  lines.push('', '## 3. Recorded Experiments');

  if (records.length === 0) {
    lines.push('No saved experiment runs yet.');
  } else {
    lines.push('| Experiment | Target SNR | Measured In SNR | AM Out SNR | AM Dist (%) | FM Out SNR | FM Dist (%) |');
    lines.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const r of records) {
      lines.push(
        `| ${r.presetName} | ${r.channelParams.noiseEnabled ? `${r.channelParams.snrTargetDb} dB` : 'Off'} | ${Number.isFinite(r.amInputSnrDb) ? `${r.amInputSnrDb.toFixed(2)} dB` : 'Off'} | ${r.amOutputSnrDb.toFixed(2)} dB | ${r.amDistortionPct.toFixed(2)}% | ${r.fmOutputSnrDb.toFixed(2)} dB | ${r.fmDistortionPct.toFixed(2)}% |`
      );
    }
  }

  lines.push('', `## 4. Independent Mathematical Validation (${validation.length} Checks)`);
  for (const v of validation) {
    lines.push(
      `- **${v.title}** [${v.status}]: Theoretical = ${v.theoreticalValue} | Simulator = ${v.simulatorValue} | Abs Err = ${v.absoluteError} | Rel Err = ${v.relativeError} | Tolerance = ${v.acceptanceTolerance}`
    );
  }

  triggerDownload('am_fm_engineering_summary.md', lines.join('\n'), 'text/markdown;charset=utf-8;');
}
