import React from 'react';
import { FullSimulationResult, SignalParams } from '../../types/simulation';
import { MetricCard } from '../common/MetricCard';
import { SectionHeader, SliderControl, WarningNotice } from '../common/ControlPrimitives';
import { WaveformCanvas } from '../charts/WaveformCanvas';
import { SpectrumCanvas } from '../charts/SpectrumCanvas';

interface SignalGeneratorSectionProps {
  signalParams: SignalParams;
  sim: FullSimulationResult;
  onChange: (next: SignalParams) => void;
}

export const SignalGeneratorSection: React.FC<SignalGeneratorSectionProps> = ({
  signalParams,
  sim,
  onChange,
}) => {
  const update = (patch: Partial<SignalParams>) => onChange({ ...signalParams, ...patch });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Common Baseband Message Signal Generator"
        subtitle="Generates the shared 3–5 kHz audio/message samples supplied identically to both the AM and FM modulation pipelines for fair comparative analysis."
      />

      {sim.warnings.length > 0 && (
        <div className="space-y-2">
          {sim.warnings.map((w, idx) => (
            <WarningNotice key={idx} tone="amber" title="Sampling / Carrier Constraint Notice">
              {w}
            </WarningNotice>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-5">
          <div>
            <div className="text-xs font-medium text-slate-300 mb-2">Signal Generation Mode</div>
            <div className="grid grid-cols-2 gap-1.5 bg-[#080D16] border border-slate-800 rounded p-1">
              <button
                type="button"
                onClick={() => update({ mode: 'single' })}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  signalParams.mode === 'single'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mode A: Single Tone
              </button>
              <button
                type="button"
                onClick={() => update({ mode: 'composite' })}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  signalParams.mode === 'composite'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mode B: Composite
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">
              Mode A generates a pure 3–5 kHz cosine test tone; Mode B synthesizes a deterministic multi-tone test waveform (synthetic 3–5 kHz components, not recorded speech). Both modulators receive identical samples.
            </p>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-300 mb-2">Quick Tone Presets (3–5 kHz)</div>
            <div className="grid grid-cols-3 gap-2">
              {[3000, 4000, 5000].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => update({ messageFreqHz: f })}
                  className={`py-1.5 rounded text-xs font-mono tabular-nums border transition-colors ${
                    signalParams.messageFreqHz === f
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {(f / 1000).toFixed(0)} kHz
                </button>
              ))}
            </div>
          </div>

          <SliderControl
            label={signalParams.mode === 'single' ? 'Message Frequency (fm)' : 'Primary Component (f_base)'}
            value={signalParams.messageFreqHz}
            min={3000}
            max={5000}
            step={100}
            unit="Hz"
            onChange={(v) => update({ messageFreqHz: v })}
          />

          <SliderControl
            label="Message Amplitude (Am)"
            value={signalParams.messageAmplitudeV}
            min={0.5}
            max={10.0}
            step={0.5}
            unit="V"
            formatValue={(v) => v.toFixed(1)}
            onChange={(v) => update({ messageAmplitudeV: v })}
          />

          <SliderControl
            label="Sampling Frequency (fs)"
            value={signalParams.samplingFreqHz}
            min={500_000}
            max={2_000_000}
            step={100_000}
            unit="kHz"
            formatValue={(v) => (v / 1000).toFixed(0)}
            onChange={(v) => update({ samplingFreqHz: v })}
            hint={`Nyquist limit = ${(signalParams.samplingFreqHz / 2000).toFixed(0)} kHz`}
          />

          <SliderControl
            label="Simulation Duration"
            value={signalParams.durationMs}
            min={2}
            max={10}
            step={1}
            unit="ms"
            onChange={(v) => update({ durationMs: v })}
          />

          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Deterministic Random Seed
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={signalParams.seed}
                min={1}
                max={999999}
                onChange={(e) => update({ seed: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className="w-full bg-[#080D16] border border-slate-700 rounded px-3 py-1.5 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => update({ seed: (signalParams.seed % 9000) + 17 })}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 whitespace-nowrap"
              >
                New Seed
              </button>
            </div>
          </div>
        </div>

        {/* Plots & Metrics Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              label="Peak Message Freq"
              value={(sim.signal.fMaxHz / 1000).toFixed(2)}
              unit="kHz"
              tone="cyan"
            />
            <MetricCard
              label="Peak Amplitude"
              value={sim.signal.peakV.toFixed(2)}
              unit="V"
            />
            <MetricCard
              label="RMS Voltage"
              value={sim.signal.rmsV.toFixed(3)}
              unit="V"
            />
            <MetricCard
              label="Sampling Rate"
              value={(sim.signal.fs / 1000).toFixed(0)}
              unit="kHz"
            />
            <MetricCard
              label="Total Samples"
              value={sim.signal.numSamples.toLocaleString()}
              sublabel={`${(sim.signal.durationSec * 1000).toFixed(1)} ms window`}
            />
          </div>

          <WaveformCanvas
            title="Original Baseband Message Waveform m(t)"
            timeSec={sim.signal.timeSec}
            series={[{ label: 'Message m(t)', data: sim.signal.messageV, color: '#06B6D4' }]}
            yLabel="Amplitude"
            yUnit="V"
            height={250}
            defaultWindowMs={2.0}
          />

          <SpectrumCanvas
            title="Original Message Frequency Spectrum M(f)"
            spectrum={sim.messageSpectrum}
            primaryLabel="Message Spectrum"
            primaryColor="#06B6D4"
            minFreqKHz={0}
            maxFreqKHz={12}
            markers={sim.signal.components.map((c, idx) => ({
              freqKHz: c.freqHz / 1000,
              label: `f${idx + 1} (${(c.freqHz / 1000).toFixed(1)}k)`,
              color: '#67E8F9',
            }))}
            height={230}
          />

          <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">
              Active Spectral Components (Shared Identically by AM & FM)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono tabular-nums text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-4">Component</th>
                    <th className="py-2 pr-4">Frequency (kHz)</th>
                    <th className="py-2 pr-4">Relative Weight</th>
                    <th className="py-2 pr-4">Scaled Amp (Vp)</th>
                    <th className="py-2">Initial Phase (rad)</th>
                  </tr>
                </thead>
                <tbody>
                  {sim.signal.components.map((c, idx) => (
                    <tr key={idx} className="border-b border-slate-800/60 text-slate-200">
                      <td className="py-1.5 pr-4">Tone {idx + 1}</td>
                      <td className="py-1.5 pr-4">{(c.freqHz / 1000).toFixed(2)} kHz</td>
                      <td className="py-1.5 pr-4">{c.amplitude.toFixed(3)}</td>
                      <td className="py-1.5 pr-4">{(c.amplitude * signalParams.messageAmplitudeV).toFixed(3)} V</td>
                      <td className="py-1.5">{c.phaseRad.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
