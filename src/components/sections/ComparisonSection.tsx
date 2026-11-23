import React from 'react';
import {
  AMParams,
  ChannelParams,
  FMParams,
  FullSimulationResult,
  ThresholdSweepResult,
} from '../../types/simulation';
import { SectionHeader, SliderControl } from '../common/ControlPrimitives';
import { WaveformCanvas } from '../charts/WaveformCanvas';
import { SpectrumCanvas } from '../charts/SpectrumCanvas';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ComparisonSectionProps {
  amParams: AMParams;
  fmParams: FMParams;
  channelParams: ChannelParams;
  sim: FullSimulationResult;
  thresholdSweep: ThresholdSweepResult | null;
  onChangeChannel: (next: ChannelParams) => void;
  onApplyPreset: (preset: 'clean' | 'moderate' | 'weak') => void;
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  amParams,
  fmParams,
  channelParams,
  sim,
  thresholdSweep,
  onChangeChannel,
  onApplyPreset,
}) => {
  const fcCenter = Math.max(amParams.carrierFreqHz, fmParams.carrierFreqHz) / 1000;
  const maxSpan = Math.max(60, (sim.fmMetrics.carsonBwHz / 1000) * 1.2);
  const fmtSnr = (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)} dB` : 'Noise Off');

  const rows = [
    {
      metric: 'Original Message Power',
      am: `${sim.am.originalMessagePowerW.toFixed(4)} W`,
      fm: `${sim.fm.originalMessagePowerW.toFixed(4)} W`,
      note: 'Identical baseband m(t) samples fed to both chains',
    },
    {
      metric: 'Unnormalized TX Power (into 1 Ω)',
      am: `${sim.am.rawSignalPowerW.toFixed(3)} W`,
      fm: `${sim.fm.rawSignalPowerW.toFixed(3)} W`,
      note: 'Raw modulator output prior to channel equalization',
    },
    {
      metric: 'Channel Reference & Noise Power',
      am: `${sim.am.channelSignalPowerW.toFixed(3)} W / ${sim.am.noisePowerW.toExponential(2)} W`,
      fm: `${sim.fm.channelSignalPowerW.toFixed(3)} W / ${sim.fm.noisePowerW.toExponential(2)} W`,
      note: `Equalized P_ref = ${channelParams.referencePowerW.toFixed(2)} W for fair comparison`,
    },
    {
      metric: 'Target vs Measured Input SNR',
      am: channelParams.noiseEnabled
        ? `${sim.am.targetSnrDb.toFixed(1)} vs ${sim.am.inputSnrDb.toFixed(2)} dB (|err| ${sim.am.snrCalibrationErrorDb.toFixed(3)} dB)`
        : 'Noise Off',
      fm: channelParams.noiseEnabled
        ? `${sim.fm.targetSnrDb.toFixed(1)} vs ${sim.fm.inputSnrDb.toFixed(2)} dB (|err| ${sim.fm.snrCalibrationErrorDb.toFixed(3)} dB)`
        : 'Noise Off',
      note: '10·log10(P_signal / P_noise) at channel output',
    },
    {
      metric: 'Post-BPF Carrier-to-Noise Ratio (CNR_IF)',
      am: fmtSnr(sim.am.postBpfCnrDb),
      fm: fmtSnr(sim.fm.postBpfCnrDb),
      note: 'After respective receiver IF bandpass filters',
    },
    {
      metric: 'Output SNR (Recovered Audio)',
      am: `${sim.am.isOutputSnrPrecisionCapped ? '>' : ''}${sim.am.outputSnrDb.toFixed(2)} dB`,
      fm: `${sim.fm.isOutputSnrPrecisionCapped ? '>' : ''}${sim.fm.outputSnrDb.toFixed(2)} dB`,
      note: '10·log10(P_ref / P_error), delay-aligned, clean-gain calibrated',
    },
    {
      metric: 'SNR Improvement (Output − Input)',
      am: Number.isFinite(sim.am.inputSnrDb)
        ? `${sim.am.snrImprovementDb >= 0 ? '+' : ''}${sim.am.snrImprovementDb.toFixed(2)} dB`
        : 'N/A',
      fm: Number.isFinite(sim.fm.inputSnrDb)
        ? `${sim.fm.snrImprovementDb >= 0 ? '+' : ''}${sim.fm.snrImprovementDb.toFixed(2)} dB`
        : 'N/A',
      note: 'Reflects IF BPF noise rejection + modulation processing gain',
    },
    {
      metric: 'NMSE & Percentage Distortion',
      am: `NMSE ${sim.am.nmse.toFixed(5)} (${sim.am.distortionPct.toFixed(3)}%)`,
      fm: `NMSE ${sim.fm.nmse.toFixed(5)} (${sim.fm.distortionPct.toFixed(3)}%)`,
      note: 'D(%) = 100 × Σ(x[n] − y[n])² / Σx[n]² (includes noise + nonlinear error)',
    },
    {
      metric: 'Modulation Index & Peak Deviation',
      am: `μ = ${sim.amMetrics.effectiveMu.toFixed(3)}`,
      fm: `β_nom = ${sim.fmMetrics.beta.toFixed(3)} (Δf_nom ${(fmParams.freqDeviationHz / 1000).toFixed(1)} / Δf_peak ${(sim.fmMetrics.measuredPeakDeviationHz / 1000).toFixed(1)} kHz)`,
      note: 'AM μ = ΔA/Ac | FM β_nom = Δf_nom/f_max; Δf_peak reflects pre-emphasis boost when enabled',
    },
    {
      metric: (fmParams.deEmphasisUs ?? 0) > 0 ? 'Theoretical / Nominal Carson BW' : 'Theoretical Bandwidth',
      am: `${(sim.amMetrics.theoreticalBwHz / 1000).toFixed(2)} kHz`,
      fm: `${(sim.fmMetrics.carsonBwHz / 1000).toFixed(2)} kHz (nominal)`,
      note: 'AM: 2·f_max | FM Nominal Carson: 2(Δf_nom + f_max); check FFT BW & Δf_peak when pre-emphasis is active',
    },
    {
      metric: 'Measured 98% / −20 dB FFT BW',
      am: `${(sim.amMetrics.measuredBw98Hz / 1000).toFixed(2)} / ${(sim.amMetrics.measuredBw20DbHz / 1000).toFixed(2)} kHz`,
      fm: `${(sim.fmMetrics.measuredBw98Hz / 1000).toFixed(2)} / ${(sim.fmMetrics.measuredBw20DbHz / 1000).toFixed(2)} kHz`,
      note: 'Numerical FFT spectral measures (reflects widened spectrum under pre-emphasis)',
    },
    {
      metric: 'Receiver IF Bandpass Width',
      am: `${(amParams.rxBandwidthHz / 1000).toFixed(1)} kHz`,
      fm: `${(fmParams.rxBandwidthHz / 1000).toFixed(1)} kHz`,
      note: 'Explicit 6th-order IF BPF width in demodulator',
    },
    {
      metric: 'FM Pre/De-Emphasis Filter',
      am: 'N/A (Flat Audio)',
      fm: (fmParams.deEmphasisUs ?? 0) === 0 ? 'Disabled (Flat)' : `${fmParams.deEmphasisUs} μs ${(fmParams.deEmphasisUs === 50 ? '(ITU R1)' : '(US)')}`,
      note: 'Applied identically in FM TX & RX when enabled',
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Side-by-Side AM vs FM Performance Comparison"
        subtitle="Evaluates AM and FM under identical baseband message samples, equal average transmitted channel power, and calibrated AWGN noise."
        actions={
          <div className="flex items-center gap-1.5 bg-[#0D131F] border border-slate-800 rounded-md p-1">
            {(['clean', 'moderate', 'weak'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onApplyPreset(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded capitalize whitespace-nowrap ${
                  channelParams.presetId === p
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {p === 'clean' ? 'Clean (40 dB)' : p === 'moderate' ? 'Moderate (20 dB)' : 'Weak (5 dB)'}
              </button>
            ))}
          </div>
        }
      />

      {/* Quick Channel SNR & Propagation Impairment Control Bar */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <SliderControl
              label="Common Channel Target Input SNR"
              value={channelParams.snrTargetDb}
              min={-14}
              max={50}
              step={1}
              unit="dB"
              disabled={!channelParams.noiseEnabled}
              onChange={(v) =>
                onChangeChannel({ ...channelParams, snrTargetDb: v, presetId: 'custom' })
              }
            />
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 text-xs">
            <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={channelParams.noiseEnabled}
                onChange={(e) =>
                  onChangeChannel({ ...channelParams, noiseEnabled: e.target.checked, presetId: 'custom' })
                }
                className="accent-cyan-500 w-4 h-4"
              />
              <span>Channel Noise</span>
            </label>
            <span className="font-mono tabular-nums text-slate-400">
              P_ref = {channelParams.referencePowerW.toFixed(2)} W
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-medium">
            Channel Propagation / Interference Model (Shared by AM &amp; FM):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'awgn', label: 'Stationary AWGN (Baseline)' },
                { id: 'kiremt-impulsive', label: 'Kiremt Lightning / Urban EMI' },
                { id: 'multipath-fading', label: '2-Ray Multipath Reflection' },
              ] as const
            ).map((mode) => {
              const active = (channelParams.impairmentMode ?? 'awgn') === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    onChangeChannel({ ...channelParams, impairmentMode: mode.id, presetId: 'custom' })
                  }
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                      : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Direct Waveform Overlay */}
      <WaveformCanvas
        title="Direct Time-Domain Recovery Comparison (Original vs AM vs FM)"
        timeSec={sim.signal.timeSec}
        series={[
          { label: 'Original Message', data: sim.signal.messageV, color: '#94A3B8', dashed: true },
          { label: 'AM Recovered', data: sim.am.recoveredAligned, color: '#3B82F6' },
          { label: 'FM Recovered', data: sim.fm.recoveredAligned, color: '#06B6D4' },
        ]}
        yLabel="Voltage"
        yUnit="V"
        height={270}
        defaultWindowMs={1.5}
      />

      {/* Side-by-side Spectra */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SpectrumCanvas
          title="AM Transmitted vs Received Spectrum"
          spectrum={sim.am.txSpectrum}
          secondarySpectrum={sim.am.rxSpectrum}
          primaryLabel="AM TX"
          secondaryLabel="AM RX (Noisy)"
          primaryColor="#3B82F6"
          secondaryColor="#F59E0B"
          minFreqKHz={Math.max(0, amParams.carrierFreqHz / 1000 - 30)}
          maxFreqKHz={amParams.carrierFreqHz / 1000 + 30}
          bracketCenterKHz={amParams.carrierFreqHz / 1000}
          bracketWidthKHz={sim.amMetrics.theoreticalBwHz / 1000}
          bracketLabel={`2·f_max = ${(sim.amMetrics.theoreticalBwHz / 1000).toFixed(1)} kHz`}
          markers={[
            { freqKHz: sim.amMetrics.lsbFreqHz / 1000, label: 'LSB', color: '#93C5FD' },
            { freqKHz: amParams.carrierFreqHz / 1000, label: 'fc', color: '#E2E8F0' },
            { freqKHz: sim.amMetrics.usbFreqHz / 1000, label: 'USB', color: '#93C5FD' },
          ]}
          height={225}
        />
        <SpectrumCanvas
          title="FM Transmitted vs Received Spectrum"
          spectrum={sim.fm.txSpectrum}
          secondarySpectrum={sim.fm.rxSpectrum}
          primaryLabel="FM TX"
          secondaryLabel="FM RX (Noisy)"
          primaryColor="#06B6D4"
          secondaryColor="#F59E0B"
          minFreqKHz={Math.max(0, fcCenter - maxSpan)}
          maxFreqKHz={fcCenter + maxSpan}
          bracketCenterKHz={fmParams.carrierFreqHz / 1000}
          bracketWidthKHz={sim.fmMetrics.carsonBwHz / 1000}
          bracketLabel={`Carson = ${(sim.fmMetrics.carsonBwHz / 1000).toFixed(1)} kHz`}
          markers={[
            { freqKHz: fmParams.carrierFreqHz / 1000 - fmParams.freqDeviationHz / 1000, label: 'fc−Δf', color: '#67E8F9' },
            { freqKHz: fmParams.carrierFreqHz / 1000, label: 'fc', color: '#E2E8F0' },
            { freqKHz: fmParams.carrierFreqHz / 1000 + fmParams.freqDeviationHz / 1000, label: 'fc+Δf', color: '#67E8F9' },
          ]}
          height={225}
        />
      </div>

      {/* Comparative Measurements Table */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 mb-3">
            Live AM vs FM Numerical Comparison Table
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Measurement</th>
                  <th className="py-2.5 pr-4 font-medium text-blue-400">AM (DSB-FC)</th>
                  <th className="py-2.5 pr-4 font-medium text-cyan-400">FM</th>
                  <th className="py-2.5 font-medium">Engineering Basis</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.metric} className="border-b border-slate-800/70">
                    <td className="py-2 pr-4 font-medium text-slate-200">{r.metric}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-blue-300">{r.am}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-cyan-300">{r.fm}</td>
                    <td className="py-2 text-slate-400">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#080D16] border border-slate-800 rounded p-3">
          <div>
            <div className="font-semibold text-slate-200">Controlled Lab DSP vs. Transmitter vs. Geographical Coverage</div>
            <ol className="mt-1 text-slate-400 leading-relaxed list-decimal pl-4 space-y-1">
              <li>
                <strong className="text-slate-300">Controlled DSP Comparison:</strong> Equalizing AM and FM to P_ref = {channelParams.referencePowerW.toFixed(2)} W with identical m(t), fs, duration, seed, and measurement window isolates modulation efficiency and baseband noise immunity fairly.
              </li>
              <li>
                <strong className="text-slate-300">Actual Broadcast Transmitter Performance:</strong> Real sites differ in PA wall-plug efficiency (Class-C FM vs linear/PWM AM), antenna Q, and ATU losses.
              </li>
              <li>
                <strong className="text-slate-300">Real-World Geographical Coverage:</strong> Matched-power baseband testing does <em>not</em> prove equal RF coverage—MW ground/sky waves vs VHF line-of-sight terrain diffraction follow different propagation physics.
              </li>
            </ol>
          </div>
          <div>
            <div className="font-semibold text-slate-200">SNR vs NMSE vs Percentage Distortion vs Quality</div>
            <p className="mt-1 text-slate-400 leading-relaxed">
              NMSE measures total normalized waveform error relative to reference signal power (both random noise and nonlinear foldover/truncation); Percentage Distortion is 100 × NMSE; Output SNR is 10·log10(1/NMSE) in dB. Gain calibration maps clean steady-state filter gain only—it never suppresses noise or distortion.
            </p>
          </div>
        </div>
      </div>

      {/* AM vs FM SNR Sweep Comparison Curve */}
      {thresholdSweep && (
        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            NMSE Distortion (%) vs Channel Input SNR
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Shows how FM maintains ultra-low distortion above threshold while experiencing steep click-noise degradation below the threshold knee.
          </p>
          <div className="h-60 w-full bg-[#080D16] border border-slate-800 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={thresholdSweep.points} margin={{ top: 10, right: 20, bottom: 16, left: 4 }}>
                <CartesianGrid stroke="#182234" strokeDasharray="3 3" />
                <XAxis dataKey="inputSnrDb" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${v} dB`} />
                <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D131F',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                  formatter={(val, name) => [`${Number(val ?? 0).toFixed(2)}%`, String(name ?? '')]}
                />
                <Line
                  type="monotone"
                  dataKey="amDistortionPct"
                  name="AM NMSE Distortion (%)"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fmDistortionPct"
                  name="FM NMSE Distortion (%)"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
