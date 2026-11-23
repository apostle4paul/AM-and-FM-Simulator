import React, { useMemo, useState } from 'react';
import {
  AMParams,
  ChannelParams,
  FMParams,
  FullSimulationResult,
  SavedExperimentRecord,
  SignalParams,
  ThresholdSweepResult,
} from '../../types/simulation';
import { SectionHeader, SliderControl } from '../common/ControlPrimitives';
import { MetricCard } from '../common/MetricCard';
import { WaveformCanvas } from '../charts/WaveformCanvas';
import { SpectrumCanvas, SpectrumMarker } from '../charts/SpectrumCanvas';
import { exportExperimentsToCSV, exportThresholdSweepToCSV } from '../../utils/export';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Play, RotateCcw, Save, Sliders, Trash2 } from 'lucide-react';

interface ExperimentsSectionProps {
  signalParams: SignalParams;
  amParams: AMParams;
  fmParams: FMParams;
  channelParams: ChannelParams;
  sim: FullSimulationResult;
  thresholdSweep: ThresholdSweepResult | null;
  experiments: SavedExperimentRecord[];
  onChangeSignal: (next: SignalParams) => void;
  onChangeChannel: (next: ChannelParams) => void;
  onResetAllParameters: () => void;
  onRunPresetExperiment: (preset: 'clean' | 'moderate' | 'weak', weakSnrDb?: number) => void;
  onRunAllExperiments: (weakSnrDb: number) => void;
  onSaveCurrentSnapshot: (label: string) => void;
  onLoadExperiment: (rec: SavedExperimentRecord) => void;
  onDeleteExperiment: (id: string) => void;
  onResetExperiments: () => void;
}

export const ExperimentsSection: React.FC<ExperimentsSectionProps> = ({
  signalParams,
  amParams,
  fmParams,
  channelParams,
  sim,
  experiments,
  thresholdSweep,
  onChangeSignal,
  onChangeChannel,
  onResetAllParameters,
  onRunPresetExperiment,
  onRunAllExperiments,
  onSaveCurrentSnapshot,
  onLoadExperiment,
  onDeleteExperiment,
  onResetExperiments,
}) => {
  const [weakSnrDb, setWeakSnrDb] = useState<number>(5);
  const [customLabel, setCustomLabel] = useState<string>('Custom Lab Run');
  const [showInspector, setShowInspector] = useState<boolean>(true);

  const chartData = experiments.map((e) => ({
    name: e.presetName.replace(/^Experiment [A-C]:\s*/, ''),
    'AM Output SNR (dB)': Number(e.amOutputSnrDb.toFixed(2)),
    'FM Output SNR (dB)': Number(e.fmOutputSnrDb.toFixed(2)),
  }));

  const amMarkers: SpectrumMarker[] = useMemo(() => {
    const fcKHz = amParams.carrierFreqHz / 1000;
    const fMaxKHz = sim.signal.fMaxHz / 1000;
    return [
      { freqKHz: fcKHz, label: 'fc', color: '#60A5FA' },
      { freqKHz: Math.max(0, fcKHz - fMaxKHz), label: 'LSB', color: '#94A3B8' },
      { freqKHz: fcKHz + fMaxKHz, label: 'USB', color: '#94A3B8' },
    ];
  }, [amParams.carrierFreqHz, sim.signal.fMaxHz]);

  const fmMarkers: SpectrumMarker[] = useMemo(() => {
    const fcKHz = fmParams.carrierFreqHz / 1000;
    const dfKHz = fmParams.freqDeviationHz / 1000;
    return [
      { freqKHz: fcKHz, label: 'fc', color: '#22D3EE' },
      { freqKHz: Math.max(0, fcKHz - dfKHz), label: 'fc-Δf', color: '#94A3B8' },
      { freqKHz: fcKHz + dfKHz, label: 'fc+Δf', color: '#94A3B8' },
    ];
  }, [fmParams.carrierFreqHz, fmParams.freqDeviationHz]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Experiment Management and Reproducible Results"
        subtitle="Execute standardized Clean, Moderate-Noise, and Weak-Signal experiments using identical message samples and reproducible random seeds, inspect all waveforms/spectra, save snapshots, and export CSV datasets."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onRunAllExperiments(weakSnrDb)}
              className="px-3.5 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run All 3 Experiments</span>
            </button>
            <button
              type="button"
              onClick={onResetAllParameters}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Restore Signal, AM, FM, and Channel controls to laboratory defaults"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Reset All Parameters to Default</span>
            </button>
            <button
              type="button"
              onClick={() => exportExperimentsToCSV(experiments)}
              disabled={experiments.length === 0}
              className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            {thresholdSweep && (
              <button
                type="button"
                onClick={() => exportThresholdSweepToCSV(thresholdSweep)}
                className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sweep CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={onResetExperiments}
              className="px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Clear recorded experiment rows from local storage"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          </div>
        }
      />

      {/* Manual Input SNR & Deterministic Seed Tuning */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Manual Experiment Channel & Reproducibility Controls
            </h2>
            <p className="text-[11px] text-slate-400">
              Tune exact input SNR and deterministic PRNG seed directly, then save snapshots or inspect waveforms below.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer bg-[#080D16] border border-slate-700 rounded px-3 py-1.5">
            <input
              type="checkbox"
              checked={channelParams.noiseEnabled}
              onChange={(e) =>
                onChangeChannel({ ...channelParams, noiseEnabled: e.target.checked, presetId: 'custom' })
              }
              className="accent-cyan-400"
            />
            <span>AWGN Channel Noise</span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SliderControl
            label="Manual Channel Input SNR"
            value={channelParams.snrTargetDb}
            min={-10}
            max={45}
            step={0.5}
            unit="dB"
            disabled={!channelParams.noiseEnabled}
            onChange={(snrTargetDb) =>
              onChangeChannel({ ...channelParams, snrTargetDb, presetId: 'custom' })
            }
            hint="Equalized across AM and FM at identical P_ref."
          />
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <SliderControl
                label="Deterministic PRNG Seed"
                value={signalParams.seed}
                min={1}
                max={999}
                step={1}
                unit=""
                onChange={(seed) => onChangeSignal({ ...signalParams, seed: Math.round(seed) })}
                hint="Ensures identical repeatable noise sequences."
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onChangeSignal({
                  ...signalParams,
                  seed: ((signalParams.seed * 37 + 13) % 997) + 1,
                })
              }
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs whitespace-nowrap mb-4"
            >
              Next Seed
            </button>
          </div>
        </div>
      </div>

      {/* Three Experiment Preset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs font-mono text-emerald-400">Experiment A · Target SNR = 40 dB</div>
            <h3 className="mt-1 text-base font-semibold text-slate-100">Clean Channel</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              High carrier-to-noise ratio baseline. Both AM envelope detection and FM phase discrimination should recover the 3–5 kHz message cleanly with minimal distortion.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRunPresetExperiment('clean')}
            className="w-full py-2 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-medium inline-flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Clean Experiment (40 dB)</span>
          </button>
        </div>

        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs font-mono text-blue-400">Experiment B · Target SNR = 20 dB</div>
            <h3 className="mt-1 text-base font-semibold text-slate-100">Moderate Noise</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Intermediate noisy channel. Reveals AM noise vulnerability versus wideband FM noise-suppression processing gain above threshold.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRunPresetExperiment('moderate')}
            className="w-full py-2 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 text-xs font-medium inline-flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Moderate Experiment (20 dB)</span>
          </button>
        </div>

        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-xs font-mono text-amber-400">Experiment C · Adjustable Weak SNR</div>
            <h3 className="mt-1 text-base font-semibold text-slate-100">Weak Signal & Threshold</h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Starts at 5 dB channel SNR and allows tuning down to -6 dB to inspect severe degradation and the FM threshold knee.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">Weak SNR:</span>
              <input
                type="range"
                min={-6}
                max={10}
                step={1}
                value={weakSnrDb}
                onChange={(e) => setWeakSnrDb(parseInt(e.target.value, 10))}
                className="flex-1"
              />
              <span className="font-mono tabular-nums text-amber-300 w-12 text-right">
                {weakSnrDb} dB
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRunPresetExperiment('weak', weakSnrDb)}
            className="w-full py-2 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium inline-flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Weak Experiment ({weakSnrDb} dB)</span>
          </button>
        </div>
      </div>

      {/* Save Current Custom Configuration */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-300">
          Save active configuration (
          <span className="font-mono text-cyan-300">
            {channelParams.noiseEnabled ? `${channelParams.snrTargetDb} dB` : 'Noise Off'}
          </span>
          , seed <span className="font-mono text-slate-200">#{signalParams.seed}</span>) to the consolidated experiment log:
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            placeholder="Experiment name..."
            className="bg-[#080D16] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => onSaveCurrentSnapshot(customLabel || 'Custom Run')}
            className="px-3.5 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Snapshot</span>
          </button>
        </div>
      </div>

      {/* Active Experiment Full Visual & Metric Inspector */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Active Experiment Inspection: All 5 Waveforms, Both Spectra & Telemetry
            </h2>
            <p className="text-xs text-slate-400">
              Complete live inspection of the currently active simulation state ({channelParams.noiseEnabled ? `${channelParams.snrTargetDb} dB` : 'Noise Off'}, Seed #{signalParams.seed}). Click "Load" on any recorded row below to inspect its parameters here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInspector((v) => !v)}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 whitespace-nowrap"
          >
            {showInspector ? 'Collapse Inspector' : 'Expand Inspector'}
          </button>
        </div>

        {/* Full Key Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard
            label="Input SNR (Measured)"
            value={Number.isFinite(sim.am.inputSnrDb) ? sim.am.inputSnrDb.toFixed(2) : 'Noise Off'}
            unit={Number.isFinite(sim.am.inputSnrDb) ? 'dB' : ''}
            sublabel={`Target ${channelParams.noiseEnabled ? `${channelParams.snrTargetDb} dB` : 'Off'}`}
            tone="neutral"
          />
          <MetricCard
            label="AM Output SNR"
            value={`${sim.am.isOutputSnrPrecisionCapped ? '>' : ''}${sim.am.outputSnrDb.toFixed(2)}`}
            unit="dB"
            sublabel={`Dist: ${sim.am.distortionPct.toFixed(2)}%`}
            tone="blue"
          />
          <MetricCard
            label="FM Output SNR"
            value={`${sim.fm.isOutputSnrPrecisionCapped ? '>' : ''}${sim.fm.outputSnrDb.toFixed(2)}`}
            unit="dB"
            sublabel={`Dist: ${sim.fm.distortionPct.toFixed(2)}%`}
            tone="cyan"
          />
          <MetricCard
            label="AM μ / BW"
            value={sim.amMetrics.effectiveMu.toFixed(2)}
            sublabel={`2·fmax = ${(sim.amMetrics.theoreticalBwHz / 1000).toFixed(1)} kHz`}
            tone={sim.amMetrics.isOvermodulated ? 'rose' : 'blue'}
          />
          <MetricCard
            label="FM β / Δf"
            value={sim.fmMetrics.beta.toFixed(2)}
            sublabel={`Δf = ${(fmParams.freqDeviationHz / 1000).toFixed(1)} kHz`}
            tone="cyan"
          />
          <MetricCard
            label="FM Carson / 98% BW"
            value={(sim.fmMetrics.carsonBwHz / 1000).toFixed(1)}
            unit="kHz"
            sublabel={`FFT 98%: ${(sim.fm.txSpectrum.occupiedBw98Hz / 1000).toFixed(1)} kHz`}
            tone="emerald"
          />
        </div>

        {showInspector && (
          <div className="space-y-4">
            {/* Baseband Waveforms: Original, AM Recovered, FM Recovered */}
            <WaveformCanvas
              title="Waveforms 1, 4 & 5: Original Message vs AM Recovered vs FM Recovered"
              timeSec={sim.signal.timeSec}
              series={[
                { label: 'Original Message m(t)', data: sim.signal.messageV, color: '#94A3B8', dashed: true },
                { label: 'AM Recovered', data: sim.am.recoveredAligned, color: '#3B82F6' },
                { label: 'FM Recovered', data: sim.fm.recoveredAligned, color: '#06B6D4' },
              ]}
              yLabel="Amplitude"
              yUnit="V"
              height={240}
              defaultWindowMs={1.5}
            />

            {/* Passband Transmitted Waveforms: AM TX and FM TX */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WaveformCanvas
                title="Waveform 2: Normalized AM Transmitted Signal (s_AM)"
                timeSec={sim.signal.timeSec}
                series={[
                  { label: 'AM TX (P_ref norm)', data: sim.am.transmittedNorm, color: '#3B82F6' },
                ]}
                yLabel="Voltage"
                yUnit="V"
                height={210}
                defaultWindowMs={0.35}
              />
              <WaveformCanvas
                title="Waveform 3: Normalized FM Transmitted Signal (s_FM)"
                timeSec={sim.signal.timeSec}
                series={[
                  { label: 'FM TX (P_ref norm)', data: sim.fm.transmittedNorm, color: '#06B6D4' },
                ]}
                yLabel="Voltage"
                yUnit="V"
                height={210}
                defaultWindowMs={0.35}
              />
            </div>

            {/* Both Spectra: AM TX and FM TX */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SpectrumCanvas
                title="AM Passband Spectrum (Carrier + Sidebands)"
                spectrum={sim.am.txSpectrum}
                primaryLabel="AM TX"
                primaryColor="#3B82F6"
                minFreqKHz={Math.max(0, (amParams.carrierFreqHz - Math.max(40_000, sim.amMetrics.theoreticalBwHz * 2)) / 1000)}
                maxFreqKHz={Math.min(sim.signal.fs / 2, amParams.carrierFreqHz + Math.max(40_000, sim.amMetrics.theoreticalBwHz * 2)) / 1000}
                markers={amMarkers}
                height={230}
              />
              <SpectrumCanvas
                title="FM Passband Spectrum (Constant-Envelope Sidebands)"
                spectrum={sim.fm.txSpectrum}
                primaryLabel="FM TX"
                primaryColor="#06B6D4"
                minFreqKHz={Math.max(0, (fmParams.carrierFreqHz - Math.max(80_000, sim.fmMetrics.carsonBwHz * 1.4)) / 1000)}
                maxFreqKHz={Math.min(sim.signal.fs / 2, fmParams.carrierFreqHz + Math.max(80_000, sim.fmMetrics.carsonBwHz * 1.4)) / 1000}
                markers={fmMarkers}
                height={230}
              />
            </div>
          </div>
        )}
      </div>

      {/* Consolidated Results Table */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
        <h2 className="text-base font-semibold text-slate-100 mb-3">
          Consolidated Numerical Experiment Results ({experiments.length} Runs Recorded)
        </h2>

        {experiments.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded">
            No experiments recorded yet. Click "Run All 3 Experiments" above to populate reproducible Clean, Moderate, and Weak measurements.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-3 font-sans">Experiment</th>
                  <th className="py-2 pr-3">In SNR</th>
                  <th className="py-2 pr-3 text-blue-400">AM Out SNR</th>
                  <th className="py-2 pr-3 text-blue-400">AM Dist</th>
                  <th className="py-2 pr-3 text-cyan-400">FM Out SNR</th>
                  <th className="py-2 pr-3 text-cyan-400">FM Dist</th>
                  <th className="py-2 pr-3">FM CNR_IF</th>
                  <th className="py-2 pr-3">Settings (fs / fc / μ / β / Seed)</th>
                  <th className="py-2 text-right font-sans">Actions</th>
                </tr>
              </thead>
              <tbody>
                {experiments.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="py-2.5 pr-3 font-sans font-medium">{r.presetName}</td>
                    <td className="py-2.5 pr-3">
                      {Number.isFinite(r.amInputSnrDb) ? `${r.amInputSnrDb.toFixed(1)} dB` : 'Off'}
                    </td>
                    <td className="py-2.5 pr-3 text-blue-300">{r.amOutputSnrDb.toFixed(2)} dB</td>
                    <td className="py-2.5 pr-3 text-blue-300">{r.amDistortionPct.toFixed(2)}%</td>
                    <td className="py-2.5 pr-3 text-cyan-300">{r.fmOutputSnrDb.toFixed(2)} dB</td>
                    <td className="py-2.5 pr-3 text-cyan-300">{r.fmDistortionPct.toFixed(2)}%</td>
                    <td className="py-2.5 pr-3">
                      {Number.isFinite(r.fmPostBpfCnrDb) ? `${r.fmPostBpfCnrDb.toFixed(1)} dB` : 'Off'}
                    </td>
                    <td className="py-2.5 pr-3 text-[11px] text-slate-400">
                      {(r.signalParams.samplingFreqHz / 1000).toFixed(0)}k / {(r.amParams.carrierFreqHz / 1000).toFixed(0)}k / μ={r.amEffectiveMu.toFixed(2)} / β={r.fmBeta.toFixed(1)} / #{r.signalParams.seed}
                    </td>
                    <td className="py-2.5 text-right font-sans">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onLoadExperiment(r)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExperiment(r.id)}
                          className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-300"
                          title="Delete record"
                          aria-label="Delete experiment record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Output SNR Bar Chart across Experiments */}
      {chartData.length > 0 && (
        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
          <h3 className="text-sm font-semibold text-slate-100 mb-3">
            Recorded Output SNR Comparison Across Experiments
          </h3>
          <div className="h-64 w-full bg-[#080D16] border border-slate-800 rounded p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#182234" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${v} dB`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D131F',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="AM Output SNR (dB)" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="FM Output SNR (dB)" fill="#06B6D4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
