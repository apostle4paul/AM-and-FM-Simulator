import React, { useEffect, useMemo, useState } from 'react';
import {
  AMParams,
  ChannelParams,
  FMParams,
  SavedExperimentRecord,
  SignalParams,
  ThresholdSweepResult,
} from './types/simulation';
import { runFMThresholdSweep, runFullSimulation } from './dsp/performance';
import { runIndependentValidationSuite } from './dsp/validation';
import { exportSummaryMarkdown } from './utils/export';
import { NavSectionId, OverviewSection } from './components/sections/OverviewSection';
import { SignalGeneratorSection } from './components/sections/SignalGeneratorSection';
import { AMLabSection } from './components/sections/AMLabSection';
import { FMLabSection } from './components/sections/FMLabSection';
import { ComparisonSection } from './components/sections/ComparisonSection';
import { ExperimentsSection } from './components/sections/ExperimentsSection';
import { EthiopianScenariosSection } from './components/sections/EthiopianScenariosSection';
import { CostTCOSection } from './components/sections/CostTCOSection';
import { DecisionMatrixSection } from './components/sections/DecisionMatrixSection';
import { TheoryValidationSection } from './components/sections/TheoryValidationSection';
import {
  Activity,
  BarChart3,
  BookOpen,
  Calculator,
  ClipboardList,
  Compass,
  FileDown,
  FlaskConical,
  Globe2,
  Menu,
  Radio,
  Scale,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'am_fm_lab_experiments_v1';

const DEFAULT_SIGNAL: SignalParams = {
  mode: 'single',
  messageFreqHz: 4000,
  messageAmplitudeV: 1.0,
  samplingFreqHz: 1_000_000,
  durationMs: 6,
  seed: 42,
};

const DEFAULT_AM: AMParams = {
  carrierAmplitudeV: 1.0,
  carrierFreqHz: 100_000,
  modulationIndex: 0.8,
  coupleAmplitudeToIndex: false,
  rxBandwidthHz: 14_000,
  envelopeTauUs: 35,
  rxLpfCutoffHz: 6000,
};

const DEFAULT_FM: FMParams = {
  carrierAmplitudeV: 1.0,
  carrierFreqHz: 100_000,
  freqDeviationHz: 20_000,
  rxBandwidthHz: 60_000,
  rxLpfCutoffHz: 6000,
  demodSensitivity: 1.0,
  deEmphasisUs: 0,
};

const DEFAULT_CHANNEL: ChannelParams = {
  snrTargetDb: 20,
  noiseEnabled: true,
  referencePowerW: 0.5,
  presetId: 'moderate',
  impairmentMode: 'awgn',
};

const NAV_ITEMS: { id: NavSectionId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: '1. Overview', icon: Compass },
  { id: 'signal-generator', label: '2. Signal Generator', icon: Activity },
  { id: 'am-lab', label: '3. AM Laboratory', icon: Radio },
  { id: 'fm-lab', label: '4. FM Laboratory', icon: Radio },
  { id: 'comparison', label: '5. AM vs FM Comparison', icon: BarChart3 },
  { id: 'experiments', label: '6. Experiment Results', icon: FlaskConical },
  { id: 'ethiopia', label: '7. Ethiopian Broadcasting Analysis', icon: Globe2 },
  { id: 'cost-tco', label: '8. Cost and TCO Analysis', icon: Calculator },
  { id: 'decision-matrix', label: '9. Weighted Decision Matrix', icon: Scale },
  { id: 'theory-validation', label: '10. Engineering Theory & Validation', icon: BookOpen },
];

function buildExperimentRecord(
  presetName: string,
  sig: SignalParams,
  am: AMParams,
  fm: FMParams,
  ch: ChannelParams
): SavedExperimentRecord {
  const res = runFullSimulation(sig, am, fm, ch);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    presetName,
    timestampIso: new Date().toISOString(),
    signalParams: { ...sig },
    amParams: { ...am },
    fmParams: { ...fm },
    channelParams: { ...ch },
    amInputSnrDb: res.am.inputSnrDb,
    amOutputSnrDb: res.am.outputSnrDb,
    amSnrGainDb: res.am.snrImprovementDb,
    amDistortionPct: res.am.distortionPct,
    amEffectiveMu: res.amMetrics.effectiveMu,
    amTheoreticalBwHz: res.amMetrics.theoreticalBwHz,
    fmInputSnrDb: res.fm.inputSnrDb,
    fmOutputSnrDb: res.fm.outputSnrDb,
    fmSnrGainDb: res.fm.snrImprovementDb,
    fmDistortionPct: res.fm.distortionPct,
    fmBeta: res.fmMetrics.beta,
    fmCarsonBwHz: res.fmMetrics.carsonBwHz,
    fmPostBpfCnrDb: res.fm.postBpfCnrDb,
  };
}

export function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [signalParams, setSignalParams] = useState<SignalParams>(DEFAULT_SIGNAL);
  const [amParams, setAmParams] = useState<AMParams>(DEFAULT_AM);
  const [fmParams, setFmParams] = useState<FMParams>(DEFAULT_FM);
  const [channelParams, setChannelParams] = useState<ChannelParams>(DEFAULT_CHANNEL);

  const [experiments, setExperiments] = useState<SavedExperimentRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (r): r is SavedExperimentRecord =>
              Boolean(
                r &&
                  typeof r.id === 'string' &&
                  typeof r.presetName === 'string' &&
                  typeof r.amOutputSnrDb === 'number' &&
                  typeof r.fmOutputSnrDb === 'number' &&
                  r.signalParams &&
                  typeof r.signalParams.samplingFreqHz === 'number' &&
                  r.amParams &&
                  r.fmParams &&
                  r.channelParams
              )
          );
          if (valid.length > 0) return valid;
        }
      }
    } catch {
      // Fallback to fresh computed baseline presets
    }
    return [
      buildExperimentRecord('Experiment A: Clean Channel', DEFAULT_SIGNAL, DEFAULT_AM, DEFAULT_FM, {
        ...DEFAULT_CHANNEL,
        snrTargetDb: 40,
        noiseEnabled: true,
        presetId: 'clean',
      }),
      buildExperimentRecord('Experiment B: Moderate Noise', DEFAULT_SIGNAL, DEFAULT_AM, DEFAULT_FM, {
        ...DEFAULT_CHANNEL,
        snrTargetDb: 20,
        noiseEnabled: true,
        presetId: 'moderate',
      }),
      buildExperimentRecord('Experiment C: Weak Signal', DEFAULT_SIGNAL, DEFAULT_AM, DEFAULT_FM, {
        ...DEFAULT_CHANNEL,
        snrTargetDb: 5,
        noiseEnabled: true,
        presetId: 'weak',
      }),
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
    } catch {
      // Ignore storage quota errors
    }
  }, [experiments]);

  // Run full live DSP simulation whenever parameters change
  const sim = useMemo(
    () => runFullSimulation(signalParams, amParams, fmParams, channelParams),
    [signalParams, amParams, fmParams, channelParams]
  );

  // Live FM threshold sweep (updates when message, AM, FM modulation/RX BW, impairment, or sweep config changes)
  const [sweepTrigger, setSweepTrigger] = useState(0);
  const [sweepRange, setSweepRange] = useState<{
    startDb: number;
    endDb: number;
    stepDb?: number;
    seedCount?: number;
  }>({
    startDb: 30,
    endDb: -14,
    stepDb: 2,
    seedCount: 1,
  });
  const thresholdSweep: ThresholdSweepResult = useMemo(
    () =>
      runFMThresholdSweep(
        signalParams,
        amParams,
        fmParams,
        channelParams.referencePowerW,
        sweepRange.startDb,
        sweepRange.endDb,
        sweepRange.stepDb ?? 2,
        sweepRange.seedCount ?? 1,
        channelParams.impairmentMode ?? 'awgn'
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      signalParams,
      amParams,
      fmParams,
      channelParams.referencePowerW,
      channelParams.impairmentMode,
      sweepRange.startDb,
      sweepRange.endDb,
      sweepRange.stepDb,
      sweepRange.seedCount,
      sweepTrigger,
    ]
  );

  const applyPreset = (preset: 'clean' | 'moderate' | 'weak', weakSnrDb = 5) => {
    const snrMap = { clean: 40, moderate: 20, weak: weakSnrDb };
    setChannelParams((prev) => ({
      ...prev,
      snrTargetDb: snrMap[preset],
      noiseEnabled: true,
      presetId: preset,
    }));
  };

  const handleRunPresetExperiment = (
    preset: 'clean' | 'moderate' | 'weak',
    weakSnrDb = 5
  ) => {
    const snr = preset === 'clean' ? 40 : preset === 'moderate' ? 20 : weakSnrDb;
    const label =
      preset === 'clean'
        ? 'Experiment A: Clean Channel'
        : preset === 'moderate'
        ? 'Experiment B: Moderate Noise'
        : `Experiment C: Weak Signal (${weakSnrDb} dB)`;
    const nextCh: ChannelParams = {
      ...channelParams,
      snrTargetDb: snr,
      noiseEnabled: true,
      presetId: preset,
    };
    setChannelParams(nextCh);
    const rec = buildExperimentRecord(label, signalParams, amParams, fmParams, nextCh);
    setExperiments((prev) => [rec, ...prev]);
  };

  const handleRunAllExperiments = (weakSnrDb: number) => {
    const a = buildExperimentRecord('Experiment A: Clean Channel', signalParams, amParams, fmParams, {
      ...channelParams,
      snrTargetDb: 40,
      noiseEnabled: true,
      presetId: 'clean',
    });
    const b = buildExperimentRecord('Experiment B: Moderate Noise', signalParams, amParams, fmParams, {
      ...channelParams,
      snrTargetDb: 20,
      noiseEnabled: true,
      presetId: 'moderate',
    });
    const c = buildExperimentRecord(
      `Experiment C: Weak Signal (${weakSnrDb} dB)`,
      signalParams,
      amParams,
      fmParams,
      {
        ...channelParams,
        snrTargetDb: weakSnrDb,
        noiseEnabled: true,
        presetId: 'weak',
      }
    );
    setExperiments([a, b, c]);
  };

  const handleSaveSnapshot = (label: string) => {
    const rec = buildExperimentRecord(label, signalParams, amParams, fmParams, channelParams);
    setExperiments((prev) => [rec, ...prev]);
  };

  const handleResetAllParameters = () => {
    setSignalParams({ ...DEFAULT_SIGNAL });
    setAmParams({ ...DEFAULT_AM });
    setFmParams({ ...DEFAULT_FM });
    setChannelParams({ ...DEFAULT_CHANNEL });
  };

  const handleLoadExperiment = (rec: SavedExperimentRecord) => {
    setSignalParams({ ...rec.signalParams });
    setAmParams({ ...rec.amParams });
    setFmParams({ ...rec.fmParams });
    setChannelParams({ ...rec.channelParams });
    setActiveSection('comparison');
  };

  const handleNavigate = (id: NavSectionId) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex flex-col">
      {/* Clean 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[#0A101B]/95 backdrop-blur border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-8 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
            AM vs FM Communication Laboratory
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleNavigate('signal-generator')}
            className="hover:text-cyan-300 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
          >
            Modem Labs
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('comparison')}
            className="hover:text-cyan-300 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
          >
            Comparison
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('ethiopia')}
            className="hover:text-cyan-300 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
          >
            Ethiopian Scenarios
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('decision-matrix')}
            className="hover:text-cyan-300 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
          >
            Decision Matrix
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() =>
              exportSummaryMarkdown(
                sim,
                experiments,
                runIndependentValidationSuite(),
                { signalParams, amParams, fmParams, channelParams },
                thresholdSweep
              )
            }
            className="px-3.5 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/45 text-cyan-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Navigation Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-14 left-0 z-20 block w-72 shadow-2xl' : 'hidden'
          } lg:block lg:w-64 shrink-0 bg-[#0A101B] border-r border-slate-800 p-3 overflow-y-auto no-print`}
        >
          <div className="px-2.5 py-2 text-[11px] font-medium text-slate-500">
            Laboratory Sections
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium text-left transition-colors ${
                    active
                      ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/35'
                      : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Compact Readout Summary in Sidebar */}
          <div className="mt-6 bg-[#0D131F] border border-slate-800 rounded-md p-3 space-y-2 text-[11px] font-mono tabular-nums">
            <div className="font-sans font-semibold text-xs text-slate-200 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active Channel Readout</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>SNR Target:</span>
              <span className="text-slate-100">
                {channelParams.noiseEnabled ? `${channelParams.snrTargetDb} dB` : 'Noise Off'}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>AM Out SNR:</span>
              <span className="text-blue-300">
                {sim.am.isOutputSnrPrecisionCapped ? '>' : ''}
                {sim.am.outputSnrDb.toFixed(2)} dB
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>FM Out SNR:</span>
              <span className="text-cyan-300">
                {sim.fm.isOutputSnrPrecisionCapped ? '>' : ''}
                {sim.fm.outputSnrDb.toFixed(2)} dB
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>FM β / μ_AM:</span>
              <span className="text-slate-100">
                {sim.fmMetrics.beta.toFixed(1)} / {sim.amMetrics.effectiveMu.toFixed(2)}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Workspace Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1440px]">
          {activeSection === 'overview' && (
            <OverviewSection
              sim={sim}
              signalParams={signalParams}
              amParams={amParams}
              fmParams={fmParams}
              channelParams={channelParams}
              onApplyPreset={(p) => applyPreset(p)}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'signal-generator' && (
            <SignalGeneratorSection
              signalParams={signalParams}
              sim={sim}
              onChange={setSignalParams}
            />
          )}

          {activeSection === 'am-lab' && (
            <AMLabSection
              amParams={amParams}
              channelParams={channelParams}
              sim={sim}
              onChangeAM={setAmParams}
              onChangeChannel={setChannelParams}
            />
          )}

          {activeSection === 'fm-lab' && (
            <FMLabSection
              signalParams={signalParams}
              amParams={amParams}
              fmParams={fmParams}
              channelParams={channelParams}
              sim={sim}
              thresholdSweep={thresholdSweep}
              sweepRange={sweepRange}
              onChangeFM={setFmParams}
              onChangeChannel={setChannelParams}
              onChangeSweepRange={setSweepRange}
              onRunSweep={() => setSweepTrigger((n) => n + 1)}
            />
          )}

          {activeSection === 'comparison' && (
            <ComparisonSection
              amParams={amParams}
              fmParams={fmParams}
              channelParams={channelParams}
              sim={sim}
              thresholdSweep={thresholdSweep}
              onChangeChannel={setChannelParams}
              onApplyPreset={(p) => applyPreset(p)}
            />
          )}

          {activeSection === 'experiments' && (
            <ExperimentsSection
              signalParams={signalParams}
              amParams={amParams}
              fmParams={fmParams}
              channelParams={channelParams}
              sim={sim}
              thresholdSweep={thresholdSweep}
              experiments={experiments}
              onChangeSignal={setSignalParams}
              onChangeChannel={setChannelParams}
              onResetAllParameters={handleResetAllParameters}
              onRunPresetExperiment={handleRunPresetExperiment}
              onRunAllExperiments={handleRunAllExperiments}
              onSaveCurrentSnapshot={handleSaveSnapshot}
              onLoadExperiment={handleLoadExperiment}
              onDeleteExperiment={(id) =>
                setExperiments((prev) => prev.filter((item) => item.id !== id))
              }
              onResetExperiments={() => {
                localStorage.removeItem(STORAGE_KEY);
                setExperiments([]);
              }}
            />
          )}

          {activeSection === 'ethiopia' && <EthiopianScenariosSection />}

          {activeSection === 'cost-tco' && <CostTCOSection />}

          {activeSection === 'decision-matrix' && <DecisionMatrixSection />}

          {activeSection === 'theory-validation' && (
            <TheoryValidationSection
              signalParams={signalParams}
              amParams={amParams}
              fmParams={fmParams}
              channelParams={channelParams}
              sim={sim}
              thresholdSweep={thresholdSweep}
              experiments={experiments}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
