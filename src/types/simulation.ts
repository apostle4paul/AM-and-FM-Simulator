export type MessageMode = 'single' | 'composite';

export interface SignalParams {
  mode: MessageMode;
  messageFreqHz: number;       // 3000 - 5000 Hz (primary or base tone)
  messageAmplitudeV: number;   // Am in Volts (default 1.0 V)
  samplingFreqHz: number;      // fs in Hz (default 1,000,000 Hz = 1 MHz)
  durationMs: number;          // simulation duration in ms (default 6 ms)
  seed: number;                // PRNG seed for reproducibility
}

export interface AMParams {
  carrierAmplitudeV: number;   // Ac in Volts
  carrierFreqHz: number;       // fc in Hz (default 100,000 Hz)
  modulationIndex: number;     // mu (0.0 to 1.5)
  coupleAmplitudeToIndex: boolean; // if true, mu = Am / Ac
  rxBandwidthHz: number;       // Receiver BPF bandwidth in Hz (default 14,000 Hz)
  envelopeTauUs: number;       // RC diode envelope detector time constant in microseconds
  rxLpfCutoffHz: number;       // Receiver audio LPF cutoff in Hz (default 6,000 Hz)
}

export interface FMParams {
  carrierAmplitudeV: number;   // Ac in Volts
  carrierFreqHz: number;       // fc in Hz (default 100,000 Hz)
  freqDeviationHz: number;     // Delta f in Hz (5,000 - 25,000+ Hz)
  rxBandwidthHz: number;       // Receiver BPF bandwidth in Hz (default 60,000 Hz)
  rxLpfCutoffHz: number;       // Receiver audio LPF cutoff in Hz (default 6,000 Hz)
  demodSensitivity: number;    // Multiplier around nominal 1/Delta_f (default 1.0)
  deEmphasisUs?: 0 | 50 | 75;  // Optional broadcast pre-emphasis / de-emphasis (50 us = ITU Region 1 / Ethiopia)
}

export type ChannelImpairmentMode = 'awgn' | 'kiremt-impulsive' | 'multipath-fading';

export interface ChannelParams {
  snrTargetDb: number;         // Nominal target input SNR in dB
  noiseEnabled: boolean;
  referencePowerW: number;     // Normalized channel reference power (e.g., 0.5 W for Ac=1V)
  presetId: 'clean' | 'moderate' | 'weak' | 'custom';
  impairmentMode?: ChannelImpairmentMode;
}

export interface CompositeComponent {
  freqHz: number;
  amplitude: number;
  phaseRad: number;
}

export interface GeneratedMessage {
  timeSec: Float64Array;
  messageV: Float64Array;      // Scaled by Am
  normalized: Float64Array;    // Peak normalized to [-1, 1]
  fs: number;
  numSamples: number;
  durationSec: number;
  fMaxHz: number;
  rmsV: number;
  peakV: number;
  components: CompositeComponent[];
}

export interface SpectrumData {
  frequenciesKHz: Float64Array;
  magnitudeV: Float64Array;
  powerDb: Float64Array;
  peakFreqKHz: number;
  peakPowerDb: number;
  occupiedBw98Hz: number;
  bwMinus20DbHz: number;
  fftSize: number;
  binResolutionHz: number;
}

export interface ModulationChainResult {
  transmittedRaw: Float64Array;
  transmittedNorm: Float64Array;
  receivedNoisy: Float64Array;
  bandpassFiltered: Float64Array;
  demodulatedRaw: Float64Array;
  recoveredAligned: Float64Array;
  noiseAdded: Float64Array;
  referenceAligned: Float64Array;
  originalMessagePowerW: number;
  targetSnrDb: number;
  inputSnrDb: number;
  snrCalibrationErrorDb: number;
  postBpfCnrDb: number;
  outputSnrDb: number;
  isOutputSnrPrecisionCapped: boolean;
  snrImprovementDb: number;
  nmse: number;
  distortionPct: number;
  delaySamples: number;
  delayMs: number;
  calibrationGain: number;
  rawSignalPowerW: number;
  channelSignalPowerW: number;
  noisePowerW: number;
  txSpectrum: SpectrumData;
  rxSpectrum: SpectrumData;
}

export interface AMAnalysisMetrics {
  effectiveMu: number;
  isOvermodulated: boolean;
  meanModTerm: number;
  meanSqModTerm: number;
  varianceModTerm: number;
  carrierPowerW: number;
  theoreticalCarrierPowerW: number;
  totalPowerW: number;
  sidebandPowerW: number;
  theoreticalTotalPowerW: number;
  theoreticalSidebandPowerW: number;
  singleTonePowerW: number;
  usbFreqHz: number;
  lsbFreqHz: number;
  theoreticalBwHz: number;
  measuredBw98Hz: number;
  measuredBw20DbHz: number;
  modulationEfficiencyPct: number;
  theoreticalEfficiencyPct: number;
}

export interface FMAnalysisMetrics {
  beta: number;
  freqDeviationHz: number;
  measuredPeakDeviationHz: number;
  carsonBwHz: number;
  measuredBw98Hz: number;
  measuredBw20DbHz: number;
  instFreqHz: Float64Array;
  minInstFreqHz: number;
  maxInstFreqHz: number;
  isInstantaneousFreqValid: boolean;
}

export interface FullSimulationResult {
  signal: GeneratedMessage;
  messageSpectrum: SpectrumData;
  am: ModulationChainResult;
  amMetrics: AMAnalysisMetrics;
  fm: ModulationChainResult;
  fmMetrics: FMAnalysisMetrics;
  warnings: string[];
}

export interface ThresholdSweepPoint {
  inputSnrDb: number;
  fmPostBpfCnrDb: number;
  fmOutputSnrDb: number;
  fmDistortionPct: number;
  amOutputSnrDb: number;
  amDistortionPct: number;
}

export interface ThresholdSweepResult {
  points: ThresholdSweepPoint[];
  thresholdDetected: boolean;
  estimatedThresholdInputSnrDb: number | null;
  estimatedThresholdOutputSnrDb: number | null;
  estimatedThresholdCnrDb: number | null;
  thresholdRegionStartSnrDb: number | null;
  thresholdRegionEndSnrDb: number | null;
  thresholdDropSlope: number;
  thresholdStatusNote: string;
  beta: number;
  fmRxBandwidthHz: number;
  stepDb?: number;
  seedCount?: number;
  impairmentMode?: ChannelImpairmentMode;
  deEmphasisUs?: 0 | 50 | 75;
}

export interface SavedExperimentRecord {
  id: string;
  presetName: string;
  timestampIso: string;
  signalParams: SignalParams;
  amParams: AMParams;
  fmParams: FMParams;
  channelParams: ChannelParams;
  amInputSnrDb: number;
  amOutputSnrDb: number;
  amSnrGainDb: number;
  amDistortionPct: number;
  amEffectiveMu: number;
  amTheoreticalBwHz: number;
  fmInputSnrDb: number;
  fmOutputSnrDb: number;
  fmSnrGainDb: number;
  fmDistortionPct: number;
  fmBeta: number;
  fmCarsonBwHz: number;
  fmPostBpfCnrDb: number;
}

export interface ValidationCheckResult {
  id: string;
  title: string;
  category:
    | 'AM Analytical'
    | 'FM Analytical'
    | 'Power & Spectrum'
    | 'Channel Calibration'
    | 'AM Composite & Nonlinear'
    | 'Reproducibility';
  givenParameters: string;
  handCalculation: string;
  theoreticalValue: string;
  simulatorValue: string;
  absoluteError: string;
  relativeError: string;
  acceptanceTolerance: string;
  percentDifference: string;
  status: 'PASS' | 'FAIL' | 'APPROXIMATION EXPECTED';
  engineeringNote: string;
}

export interface FMThresholdSensitivityCheck {
  id: string;
  scenario: string;
  paramsSummary: string;
  thresholdDetected: boolean;
  thresholdInputSnrDb: number | null;
  thresholdCnrDb: number | null;
  maxSlope: number;
  observation: string;
}
