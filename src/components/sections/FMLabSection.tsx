import React, { useMemo, useState } from 'react';
import {
  AMParams,
  ChannelParams,
  FMParams,
  FMThresholdSensitivityCheck,
  FullSimulationResult,
  SignalParams,
  ThresholdSweepResult,
} from '../../types/simulation';
import { runFMThresholdSensitivityChecks } from '../../dsp/validation';
import { MetricCard } from '../common/MetricCard';
import { SectionHeader, SliderControl, WarningNotice } from '../common/ControlPrimitives';
import { WaveformCanvas } from '../charts/WaveformCanvas';
import { SpectrumCanvas } from '../charts/SpectrumCanvas';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface FMLabSectionProps {
  signalParams: SignalParams;
  amParams: AMParams;
  fmParams: FMParams;
  channelParams: ChannelParams;
  sim: FullSimulationResult;
  thresholdSweep: ThresholdSweepResult | null;
  sweepRange: { startDb: number; endDb: number; stepDb?: number; seedCount?: number };
  onChangeFM: (next: FMParams) => void;
  onChangeChannel: (next: ChannelParams) => void;
  onChangeSweepRange: (next: {
    startDb: number;
    endDb: number;
    stepDb?: number;
    seedCount?: number;
  }) => void;
  onRunSweep: () => void;
}

export const FMLabSection: React.FC<FMLabSectionProps> = ({
  fmParams,
  channelParams,
  sim,
  thresholdSweep,
  sweepRange,
  onChangeFM,
  onChangeChannel,
  onChangeSweepRange,
  onRunSweep,
}) => {
  const [sensitivityChecks, setSensitivityChecks] = useState<FMThresholdSensitivityCheck[] | null>(
    null
  );
  const updateFM = (patch: Partial<FMParams>) => onChangeFM({ ...fmParams, ...patch });
  const updateCh = (patch: Partial<ChannelParams>) =>
    onChangeChannel({ ...channelParams, ...patch, presetId: 'custom' });

  const fcKHz = fmParams.carrierFreqHz / 1000;
  const specSpanKHz = Math.max(45, (sim.fmMetrics.carsonBwHz / 1000) * 1.15);

  const instFreqKHz = useMemo(() => {
    const out = new Float64Array(sim.fmMetrics.instFreqHz.length);
    for (let i = 0; i < out.length; i++) out[i] = sim.fmMetrics.instFreqHz[i] / 1000;
    return out;
  }, [sim.fmMetrics.instFreqHz]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="FM Modulation, Quadrature I/Q Discrimination, and Threshold Laboratory"
        subtitle="Constant-envelope Frequency Modulation via trapezoidal phase integration, 6th-order IF BPF, quadrature I/Q mixing and atan2 phase-difference discrimination, Carson bandwidth analysis, and empirical FM threshold sweep."
      />

      {fmParams.rxBandwidthHz < sim.fmMetrics.carsonBwHz * 0.9 && (
        <WarningNotice
          tone="amber"
          title={`FM Receiver Bandwidth Narrower Than Carson's Rule (${(fmParams.rxBandwidthHz / 1000).toFixed(0)} kHz < ${(sim.fmMetrics.carsonBwHz / 1000).toFixed(1)} kHz)`}
        >
          Your IF bandpass filter may truncate outer FM Bessel sidebands, introducing baseband distortion even at high SNR. Increase Receiver BPF Bandwidth to at least Carson&apos;s bandwidth for clean recovery.
        </WarningNotice>
      )}

      {(fmParams.deEmphasisUs ?? 0) > 0 &&
        sim.fmMetrics.measuredPeakDeviationHz > fmParams.freqDeviationHz * 1.05 && (
          <WarningNotice
            tone="cyan"
            title={`Pre-Emphasis Increases Actual Peak Deviation (Δf_nom = ${(fmParams.freqDeviationHz / 1000).toFixed(1)} kHz → Measured Δf_peak = ${(sim.fmMetrics.measuredPeakDeviationHz / 1000).toFixed(2)} kHz)`}
          >
            Applying {fmParams.deEmphasisUs} μs TX pre-emphasis boosts high-frequency baseband components before modulation, widening instantaneous frequency swing beyond the nominal sensitivity setting Δf_nom (effective Carson span ≈ {((2 * (sim.fmMetrics.measuredPeakDeviationHz + sim.signal.fMaxHz)) / 1000).toFixed(1)} kHz). Matched RX de-emphasis restores original signal amplitude while attenuating high-frequency demodulator noise.
          </WarningNotice>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* FM Controls */}
        <div className="lg:col-span-4 bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <h2 className="text-sm font-semibold text-slate-100">
              FM Modulator & Discriminator Controls
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
              {fmParams.freqDeviationHz >= 70_000 ? 'VHF Broadcast Ref' : 'Lab Scale'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-slate-300">
              Configuration Reference Preset
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onChangeFM({
                    ...fmParams,
                    carrierFreqHz: 100_000,
                    freqDeviationHz: 20_000,
                    rxBandwidthHz: 60_000,
                    rxLpfCutoffHz: 6000,
                    deEmphasisUs: 0,
                  })
                }
                className={`py-1.5 px-2 rounded text-[11px] font-medium border text-left transition-colors ${
                  fmParams.freqDeviationHz < 70_000
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                    : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold">Lab Default</div>
                <div className="text-[10px] text-slate-400">Δf=20 kHz, β=5, Flat</div>
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeFM({
                    ...fmParams,
                    carrierFreqHz: 180_000,
                    freqDeviationHz: 75_000,
                    rxBandwidthHz: 200_000,
                    rxLpfCutoffHz: 6000,
                    deEmphasisUs: 50,
                  })
                }
                className={`py-1.5 px-2 rounded text-[11px] font-medium border text-left transition-colors ${
                  fmParams.freqDeviationHz >= 70_000
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                    : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold">VHF Broadcast Ref</div>
                <div className="text-[10px] text-slate-400">Δf_nom=±75 kHz, 50 μs</div>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              Educational lab default uses Δf_nom = 20 kHz (β = 5.0 at 4 kHz, nominal Carson BW ≈ 48 kHz). Broadcast Reference applies ITU-R BS.450 Region 1 nominal ±75 kHz deviation and 50 μs emphasis on a <strong className="text-slate-400">180 kHz scaled simulation carrier</strong> (not a real 87.5–108 MHz VHF carrier) with a <strong className="text-slate-400">200 kHz selected receiver IF filter bandwidth</strong> (standard Region 1 VHF FM channel spacing is 100 kHz, with integral multiples permitted where applicable).
            </p>
          </div>

          <SliderControl
            label="Carrier Amplitude (Ac)"
            value={fmParams.carrierAmplitudeV}
            min={0.5}
            max={15.0}
            step={0.5}
            unit="V"
            formatValue={(v) => v.toFixed(1)}
            onChange={(v) => updateFM({ carrierAmplitudeV: v })}
          />

          <SliderControl
            label="Carrier Frequency (fc)"
            value={fmParams.carrierFreqHz}
            min={50_000}
            max={250_000}
            step={5000}
            unit="kHz"
            formatValue={(v) => (v / 1000).toFixed(0)}
            onChange={(v) => updateFM({ carrierFreqHz: v })}
          />

          <SliderControl
            label="Nominal Peak Deviation (Δf_nom)"
            value={fmParams.freqDeviationHz}
            min={5000}
            max={85_000}
            step={1000}
            unit="kHz"
            formatValue={(v) => (v / 1000).toFixed(0)}
            onChange={(v) => updateFM({ freqDeviationHz: v })}
            hint={`Nominal β = ${sim.fmMetrics.beta.toFixed(2)} | Measured peak Δf = ${(sim.fmMetrics.measuredPeakDeviationHz / 1000).toFixed(2)} kHz`}
          />

          <SliderControl
            label="Nominal FM Modulation Index (β)"
            value={sim.fmMetrics.beta}
            min={1.0}
            max={25.0}
            step={0.25}
            formatValue={(v) => v.toFixed(2)}
            onChange={(v) =>
              updateFM({ freqDeviationHz: Math.round(v * sim.signal.fMaxHz) })
            }
            hint="Adjusting β updates nominal deviation Δf_nom = β · f_max."
          />

          <div className="border-t border-slate-800 pt-3 space-y-4">
            <SliderControl
              label="Receiver BPF Bandwidth"
              value={fmParams.rxBandwidthHz}
              min={20_000}
              max={220_000}
              step={2000}
              unit="kHz"
              formatValue={(v) => (v / 1000).toFixed(0)}
              onChange={(v) => updateFM({ rxBandwidthHz: v })}
              hint={`${(fmParams.deEmphasisUs ?? 0) > 0 ? 'Nominal Carson BW' : 'Carson BW'} = ${(sim.fmMetrics.carsonBwHz / 1000).toFixed(1)} kHz (from Δf_nom). Wider IF filter BW admits more noise.`}
            />

            <SliderControl
              label="Receiver Audio LPF Cutoff"
              value={fmParams.rxLpfCutoffHz}
              min={3500}
              max={12000}
              step={500}
              unit="kHz"
              formatValue={(v) => (v / 1000).toFixed(1)}
              onChange={(v) => updateFM({ rxLpfCutoffHz: v })}
            />

            <SliderControl
              label="Discriminator Sensitivity"
              value={fmParams.demodSensitivity}
              min={0.5}
              max={1.5}
              step={0.05}
              unit="×"
              formatValue={(v) => v.toFixed(2)}
              onChange={(v) => updateFM({ demodSensitivity: v })}
            />

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Broadcast Pre/De-Emphasis (τ)</span>
                <span className="font-mono text-cyan-300">
                  {(fmParams.deEmphasisUs ?? 0) === 0 ? 'Off (Flat)' : `${fmParams.deEmphasisUs} μs`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { val: 0, label: 'Off (Flat)' },
                    { val: 50, label: '50 μs (ITU R1)' },
                    { val: 75, label: '75 μs (US)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => updateFM({ deEmphasisUs: opt.val })}
                    className={`py-1.5 px-2 rounded text-[11px] font-medium border transition-colors ${
                      (fmParams.deEmphasisUs ?? 0) === opt.val
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                        : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {(fmParams.deEmphasisUs ?? 0) === 0
                  ? 'Disabled (Flat): no TX pre-emphasis or RX de-emphasis filter applied. Select 50 μs for ITU Region 1 broadcast-reference noise suppression.'
                  : `Active (${fmParams.deEmphasisUs} μs${fmParams.deEmphasisUs === 50 ? ' — ITU Region 1 broadcast standard' : ' — North American broadcast standard'}): TX pre-emphasis and matched RX de-emphasis active across both live comparison and threshold sweeps.`}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-3">
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>AWGN Channel Noise</span>
              <input
                type="checkbox"
                checked={channelParams.noiseEnabled}
                onChange={(e) => updateCh({ noiseEnabled: e.target.checked })}
                className="accent-cyan-500 w-4 h-4"
              />
            </label>

            <SliderControl
              label="Received Channel SNR"
              value={channelParams.snrTargetDb}
              min={-12}
              max={50}
              step={1}
              unit="dB"
              disabled={!channelParams.noiseEnabled}
              onChange={(v) => updateCh({ snrTargetDb: v })}
            />
          </div>
        </div>

        {/* FM Waveforms & Spectra */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Input SNR (Channel)"
              value={Number.isFinite(sim.fm.inputSnrDb) ? sim.fm.inputSnrDb.toFixed(2) : 'Noise Off'}
              unit={Number.isFinite(sim.fm.inputSnrDb) ? 'dB' : ''}
              sublabel={`Post-BPF CNR: ${Number.isFinite(sim.fm.postBpfCnrDb) ? sim.fm.postBpfCnrDb.toFixed(1) + ' dB' : 'Noise Off'}`}
            />
            <MetricCard
              label="Output SNR"
              value={
                sim.fm.isOutputSnrPrecisionCapped
                  ? `>${sim.fm.outputSnrDb.toFixed(1)}`
                  : sim.fm.outputSnrDb.toFixed(2)
              }
              unit="dB"
              sublabel={`Gain: ${sim.fm.snrImprovementDb >= 0 ? '+' : ''}${sim.fm.snrImprovementDb.toFixed(1)} dB`}
              tone="cyan"
            />
            <MetricCard
              label="NMSE Distortion"
              value={sim.fm.distortionPct.toFixed(3)}
              unit="%"
              sublabel={`NMSE = ${sim.fm.nmse.toFixed(5)}`}
              tone={sim.fm.distortionPct > 5 ? 'rose' : 'emerald'}
            />
            <MetricCard
              label="Nominal Carson BW"
              value={(sim.fmMetrics.carsonBwHz / 1000).toFixed(1)}
              unit="kHz"
              sublabel={`Δf_peak ${(sim.fmMetrics.measuredPeakDeviationHz / 1000).toFixed(1)}k | 98%: ${(sim.fmMetrics.measuredBw98Hz / 1000).toFixed(1)}k`}
              tone="cyan"
            />
          </div>

          <WaveformCanvas
            title="FM Transmitted Constant-Envelope Waveform s_FM(t)"
            timeSec={sim.signal.timeSec}
            series={[{ label: 'FM Transmitted', data: sim.fm.transmittedNorm, color: '#06B6D4' }]}
            yLabel="Voltage"
            yUnit="V"
            height={195}
            defaultWindowMs={0.5}
          />

          <WaveformCanvas
            title={`Instantaneous Frequency f_i(t) [${(sim.fmMetrics.minInstFreqHz / 1000).toFixed(1)}–${(sim.fmMetrics.maxInstFreqHz / 1000).toFixed(1)} kHz | Δf_peak = ${(sim.fmMetrics.measuredPeakDeviationHz / 1000).toFixed(2)} kHz]`}
            timeSec={sim.signal.timeSec}
            series={[{ label: 'f_i(t)', data: instFreqKHz, color: '#22D3EE' }]}
            yLabel="Freq"
            yUnit="kHz"
            height={185}
            defaultWindowMs={1.5}
          />

          <WaveformCanvas
            title="FM Received Noisy Waveform r_FM(t)"
            timeSec={sim.signal.timeSec}
            series={[{ label: 'FM Received', data: sim.fm.receivedNoisy, color: '#F59E0B' }]}
            yLabel="Voltage"
            yUnit="V"
            height={195}
            defaultWindowMs={0.5}
          />

          <WaveformCanvas
            title="FM Recovered Audio vs Original Message (Aligned)"
            timeSec={sim.signal.timeSec}
            series={[
              { label: 'Original Message', data: sim.signal.messageV, color: '#94A3B8', dashed: true },
              { label: 'FM Recovered', data: sim.fm.recoveredAligned, color: '#06B6D4' },
            ]}
            yLabel="Voltage"
            yUnit="V"
            height={215}
            defaultWindowMs={1.5}
          />

          <SpectrumCanvas
            title="FM Transmitted & Received RF Spectrum (FFT)"
            spectrum={sim.fm.txSpectrum}
            secondarySpectrum={sim.fm.rxSpectrum}
            primaryLabel="FM Transmitted"
            secondaryLabel="FM Received (with AWGN)"
            primaryColor="#06B6D4"
            secondaryColor="#F59E0B"
            minFreqKHz={Math.max(0, fcKHz - specSpanKHz)}
            maxFreqKHz={fcKHz + specSpanKHz}
            bracketCenterKHz={fcKHz}
            bracketWidthKHz={sim.fmMetrics.carsonBwHz / 1000}
            bracketLabel={`${(fmParams.deEmphasisUs ?? 0) > 0 ? 'Nominal Carson BW' : 'Carson BW'} = ${(sim.fmMetrics.carsonBwHz / 1000).toFixed(1)} kHz`}
            markers={[
              { freqKHz: fcKHz - fmParams.freqDeviationHz / 1000, label: 'fc−Δf', color: '#67E8F9' },
              { freqKHz: fcKHz, label: `Carrier (${fcKHz.toFixed(0)}k)`, color: '#E2E8F0' },
              { freqKHz: fcKHz + fmParams.freqDeviationHz / 1000, label: 'fc+Δf', color: '#67E8F9' },
            ]}
            height={235}
          />

          {/* FM Bandwidth Definitions & I/Q Discriminator Educational Panel */}
          <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-3">
            <h3 className="text-sm font-semibold text-cyan-300">
              FM Bandwidth Metrics &amp; Quadrature I/Q Phase-Difference Discriminator
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono tabular-nums">
              <div className="bg-[#080D16] border border-slate-800 rounded p-2.5">
                <div className="text-slate-400">Carson&apos;s Rule (Analytical)</div>
                <div className="text-cyan-300 text-sm font-semibold mt-0.5">
                  {(sim.fmMetrics.carsonBwHz / 1000).toFixed(2)} kHz
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">2·(Δf + f_max) heuristic</div>
              </div>
              <div className="bg-[#080D16] border border-slate-800 rounded p-2.5">
                <div className="text-slate-400">98% Occupied Power BW</div>
                <div className="text-slate-100 text-sm font-semibold mt-0.5">
                  {(sim.fmMetrics.measuredBw98Hz / 1000).toFixed(2)} kHz
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Integrated from TX FFT</div>
              </div>
              <div className="bg-[#080D16] border border-slate-800 rounded p-2.5">
                <div className="text-slate-400">−20 dB Spectral BW</div>
                <div className="text-slate-100 text-sm font-semibold mt-0.5">
                  {(sim.fmMetrics.measuredBw20DbHz / 1000).toFixed(2)} kHz
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Outer bins ≥ −20 dB peak</div>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">How the Receiver Recovers Frequency Changes:</strong> After the 6th-order IF bandpass filter, the FM waveform is mixed with orthogonal carrier references cos(2πf_c t) and −sin(2πf_c t) and low-pass filtered to obtain complex baseband I[n] + jQ[n]. The discriminator computes instantaneous phase increment Δφ[n] = atan2(Q[n]I[n−1] − I[n]Q[n−1], I[n]I[n−1] + Q[n]Q[n−1]) directly in (−π, π], eliminating 2π wrap discontinuities. Instantaneous frequency deviation is Δf_i[n] = Δφ[n]/(2π·Ts), scaled by sensitivity/Δf, DC-removed, and filtered by the audio LPF.
            </p>
          </div>
        </div>
      </div>

      {/* Dedicated FM Threshold Effect Investigation Panel */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              FM Threshold Effect Investigation (Live Input SNR Sweep)
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-3xl">
              The FM threshold effect is the rapid deterioration in demodulated signal quality when the
              received carrier-to-noise ratio falls below a practical threshold. The observed threshold
              depends on the selected signal, frequency deviation (β = {sim.fmMetrics.beta.toFixed(2)}),
              receiver discriminator, and IF bandpass bandwidth ({(fmParams.rxBandwidthHz / 1000).toFixed(0)} kHz).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onChangeSweepRange({ startDb: 30, endDb: -14 })}
              className={`px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                sweepRange.startDb === 30 && sweepRange.endDb === -14
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-[#080D16] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              Full (+30 to −14 dB)
            </button>
            <button
              type="button"
              onClick={() => onChangeSweepRange({ startDb: 24, endDb: -8 })}
              className={`px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                sweepRange.startDb === 24 && sweepRange.endDb === -8
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-[#080D16] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              Mid (+24 to −8 dB)
            </button>
            <button
              type="button"
              onClick={() => onChangeSweepRange({ startDb: 30, endDb: 12 })}
              className={`px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors ${
                sweepRange.startDb === 30 && sweepRange.endDb === 12
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                  : 'bg-[#080D16] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              High-SNR Only (+30 to +12 dB)
            </button>
            <button
              type="button"
              onClick={onRunSweep}
              className="px-3.5 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-200 text-xs font-medium whitespace-nowrap transition-colors"
            >
              Re-Run Sweep ({sweepRange.startDb >= 0 ? `+${sweepRange.startDb}` : sweepRange.startDb} to{' '}
              {sweepRange.endDb >= 0 ? `+${sweepRange.endDb}` : sweepRange.endDb} dB)
            </button>
          </div>
        </div>

        {/* Custom Sweep Range, Step Resolution & Ensemble Seed Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#080D16] border border-slate-800 rounded p-3 text-xs">
          <label className="flex items-center justify-between gap-2 text-slate-300">
            <span>Upper SNR (dB)</span>
            <input
              type="number"
              min={-10}
              max={50}
              step={2}
              value={sweepRange.startDb}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) {
                  onChangeSweepRange({ ...sweepRange, startDb: Math.max(-10, Math.min(50, v)) });
                }
              }}
              className="w-20 px-2 py-1 rounded bg-[#0D131F] border border-slate-700 text-slate-100 font-mono text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-slate-300">
            <span>Lower SNR (dB)</span>
            <input
              type="number"
              min={-20}
              max={40}
              step={2}
              value={sweepRange.endDb}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) {
                  onChangeSweepRange({ ...sweepRange, endDb: Math.max(-20, Math.min(40, v)) });
                }
              }}
              className="w-20 px-2 py-1 rounded bg-[#0D131F] border border-slate-700 text-slate-100 font-mono text-right"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-slate-300">
            <span>Step Size</span>
            <select
              value={sweepRange.stepDb ?? 2}
              onChange={(e) =>
                onChangeSweepRange({ ...sweepRange, stepDb: Number(e.target.value) })
              }
              className="px-2 py-1 rounded bg-[#0D131F] border border-slate-700 text-cyan-200 font-mono"
            >
              <option value={2}>2 dB (Fast)</option>
              <option value={1}>1 dB (Fine)</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 text-slate-300">
            <span>Ensemble Seeds</span>
            <select
              value={sweepRange.seedCount ?? 1}
              onChange={(e) =>
                onChangeSweepRange({ ...sweepRange, seedCount: Number(e.target.value) })
              }
              className="px-2 py-1 rounded bg-[#0D131F] border border-slate-700 text-cyan-200 font-mono"
            >
              <option value={1}>1 Seed</option>
              <option value={3}>3 Seeds (Avg)</option>
              <option value={5}>5 Seeds (Smooth)</option>
            </select>
          </label>
        </div>

        {thresholdSweep && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="Threshold Input SNR"
                value={
                  thresholdSweep.thresholdDetected && thresholdSweep.estimatedThresholdInputSnrDb !== null
                    ? `${thresholdSweep.estimatedThresholdInputSnrDb.toFixed(1)}`
                    : 'Not Detected'
                }
                unit={thresholdSweep.thresholdDetected ? 'dB' : ''}
                sublabel={
                  thresholdSweep.thresholdDetected && thresholdSweep.estimatedThresholdCnrDb !== null
                    ? `Post-BPF CNR: ${thresholdSweep.estimatedThresholdCnrDb.toFixed(1)} dB`
                    : 'No collapse knee in swept range'
                }
                tone="amber"
              />
              <MetricCard
                label="Threshold Output SNR"
                value={
                  thresholdSweep.thresholdDetected && thresholdSweep.estimatedThresholdOutputSnrDb !== null
                    ? `${thresholdSweep.estimatedThresholdOutputSnrDb.toFixed(2)}`
                    : 'N/A'
                }
                unit={thresholdSweep.thresholdDetected ? 'dB' : ''}
                sublabel="Measured FM out SNR at knee"
                tone="cyan"
              />
              <MetricCard
                label="Max Collapse Slope"
                value={thresholdSweep.thresholdDropSlope.toFixed(2)}
                unit="dB/dB"
                sublabel="Peak ΔSNR_out / ΔSNR_in"
                tone={thresholdSweep.thresholdDropSlope >= 2.0 ? 'rose' : 'default'}
              />
              <MetricCard
                label="Sweep Config (β / RX BW)"
                value={`${thresholdSweep.beta.toFixed(2)} / ${(thresholdSweep.fmRxBandwidthHz / 1000).toFixed(0)} kHz`}
                sublabel="Threshold shifts with β & RX BW"
                tone="cyan"
              />
            </div>

            <div className="bg-[#080D16] border border-slate-800 rounded px-3 py-2 text-xs text-slate-300">
              {thresholdSweep.thresholdStatusNote}
            </div>

            <div className="h-72 w-full bg-[#080D16] border border-slate-800 rounded p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={thresholdSweep.points} margin={{ top: 12, right: 20, bottom: 20, left: 4 }}>
                  <CartesianGrid stroke="#182234" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="inputSnrDb"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickFormatter={(v) => `${v} dB`}
                    label={{
                      value: 'Received Channel Input SNR (dB)',
                      position: 'insideBottom',
                      offset: -12,
                      fill: '#94A3B8',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickFormatter={(v) => `${v} dB`}
                    label={{
                      value: 'Output SNR (dB)',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#94A3B8',
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131F',
                      borderColor: '#334155',
                      fontSize: '12px',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    formatter={(val, name) => [`${Number(val ?? 0).toFixed(2)} dB`, String(name ?? '')]}
                    labelFormatter={(lbl) => `Input SNR: ${lbl} dB`}
                  />
                  {thresholdSweep.thresholdDetected &&
                    thresholdSweep.thresholdRegionStartSnrDb !== null &&
                    thresholdSweep.thresholdRegionEndSnrDb !== null && (
                      <ReferenceArea
                        x1={thresholdSweep.thresholdRegionEndSnrDb}
                        x2={thresholdSweep.thresholdRegionStartSnrDb}
                        fill="#F59E0B"
                        fillOpacity={0.14}
                        strokeOpacity={0.35}
                      />
                    )}
                  {thresholdSweep.thresholdDetected &&
                    thresholdSweep.estimatedThresholdInputSnrDb !== null && (
                      <ReferenceLine
                        x={thresholdSweep.estimatedThresholdInputSnrDb}
                        stroke="#F59E0B"
                        strokeDasharray="4 4"
                        label={{
                          value: `Threshold ~${thresholdSweep.estimatedThresholdInputSnrDb.toFixed(1)} dB`,
                          position: 'top',
                          fill: '#F59E0B',
                          fontSize: 11,
                        }}
                      />
                    )}
                  <Line
                    type="monotone"
                    dataKey="fmOutputSnrDb"
                    name="FM Output SNR"
                    stroke="#06B6D4"
                    strokeWidth={2.2}
                    dot={{ r: 2.5, fill: '#06B6D4' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amOutputSnrDb"
                    name="AM Output SNR"
                    stroke="#3B82F6"
                    strokeWidth={1.8}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#080D16] border border-slate-800 rounded p-3">
                <div className="font-semibold text-emerald-300">1. Above Threshold</div>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Carrier vector dominates IF noise; phase perturbations remain small and linear, yielding wideband FM processing gain proportional to β².
                </p>
              </div>
              <div className="bg-[#080D16] border border-slate-800 rounded p-3">
                <div className="font-semibold text-amber-300">2. Transition Region (Knee)</div>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Noise peaks occasionally cancel the carrier and induce isolated 2π phase rotations, initiating rapid output SNR decline above 1 dB/dB.
                </p>
              </div>
              <div className="bg-[#080D16] border border-slate-800 rounded p-3">
                <div className="font-semibold text-rose-300">3. Below Threshold</div>
                <p className="mt-1 text-slate-400 leading-relaxed">
                  Frequent noise encirclements around the I/Q origin trigger discriminator cycle slips (2π phase jumps / impulse clicks), causing severe SNR collapse.
                </p>
              </div>
            </div>

            {/* Threshold Estimation Criteria & Limitations */}
            <div className="bg-[#080D16] border border-slate-800 rounded p-4 space-y-2 text-xs">
              <h3 className="font-semibold text-slate-100">
                Threshold Estimation Criteria &amp; Methodology Limitations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-400 leading-relaxed">
                <div>
                  <div className="text-cyan-300 font-medium mb-1">Empirical Detection Criteria (performance.ts)</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong className="text-slate-200">Above-Threshold Baseline:</strong> At least one high-SNR sweep point must achieve clean recovery with FM NMSE distortion &lt; 3.0%.
                    </li>
                    <li>
                      <strong className="text-slate-200">Nonlinear Slope Collapse:</strong> Peak local curve slope ΔSNR_out / ΔSNR_in must reach ≥ 2.0 dB/dB (exceeding the linear 1:1 drop).
                    </li>
                    <li>
                      <strong className="text-slate-200">Low-SNR Degradation:</strong> The lowest swept input SNR must exhibit ≥ 3.0% FM distortion so transient ripples are not mistaken for threshold collapse.
                    </li>
                    <li>
                      <strong className="text-slate-200">Knee Localization:</strong> Walks upward in SNR from the steepest collapse until local slope flattens below &lt; 1.6 dB/dB.
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="text-amber-300 font-medium mb-1">Methodology Scope &amp; Configurable Precision</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong className="text-slate-200">Grid Resolution ({thresholdSweep.stepDb ?? 2} dB step):</strong> Switch to <span className="font-mono">1 dB (Fine)</span> above for tighter knee localization.
                    </li>
                    <li>
                      <strong className="text-slate-200">Seed Variance ({thresholdSweep.seedCount ?? 1} seed{(thresholdSweep.seedCount ?? 1) > 1 ? 's' : ''} averaged):</strong> Select <span className="font-mono">3 Seeds</span> or <span className="font-mono">5 Seeds</span> above to average Monte Carlo noise realizations across the 4 ms sweep window.
                    </li>
                    <li>
                      <strong className="text-slate-200">Sweep Range Dependence:</strong> Narrow or high-SNR-only ranges (e.g., +30 to +12 dB) genuinely return &ldquo;Not Detected&rdquo; rather than extrapolating an artificial threshold.
                    </li>
                    <li>
                      <strong className="text-slate-200">Pre/De-Emphasis ({(fmParams.deEmphasisUs ?? 0) === 0 ? 'Off' : `${fmParams.deEmphasisUs} μs`}):</strong> Enable <span className="font-mono">50 μs (ITU R1)</span> in the FM controls to simulate Ethiopian/European broadcast high-frequency noise suppression.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Multi-Configuration Threshold Sensitivity Verification */}
            <div className="bg-[#080D16] border border-slate-800 rounded p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-100">
                    Multi-Configuration Threshold Sensitivity Verification
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Executes four live SNR sweeps across different Δf, message frequencies, RX IF bandwidths, and input SNR intervals to confirm physical threshold responsiveness and non-detection behavior.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSensitivityChecks(runFMThresholdSensitivityChecks())}
                  className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
                >
                  {sensitivityChecks ? 'Re-Run Sensitivity Matrix' : 'Run Sensitivity Matrix'}
                </button>
              </div>

              {sensitivityChecks && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono tabular-nums">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-sans">
                        <th className="py-2 pr-3">Scenario</th>
                        <th className="py-2 pr-3">Configuration</th>
                        <th className="py-2 pr-3">Detected</th>
                        <th className="py-2 pr-3">Threshold In SNR</th>
                        <th className="py-2 pr-3">Post-BPF CNR</th>
                        <th className="py-2 pr-3">Max Slope</th>
                        <th className="py-2">Measured Observation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {sensitivityChecks.map((row) => (
                        <tr key={row.id} className="align-top">
                          <td className="py-2 pr-3 font-sans font-medium text-slate-200 whitespace-nowrap">
                            {row.scenario}
                          </td>
                          <td className="py-2 pr-3 text-slate-400">{row.paramsSummary}</td>
                          <td className="py-2 pr-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                row.thresholdDetected
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {row.thresholdDetected ? 'YES' : 'NO (N/A)'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-amber-300">
                            {row.thresholdInputSnrDb !== null ? `${row.thresholdInputSnrDb.toFixed(1)} dB` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-cyan-300">
                            {row.thresholdCnrDb !== null ? `${row.thresholdCnrDb.toFixed(1)} dB` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-slate-200">{row.maxSlope.toFixed(2)} dB/dB</td>
                          <td className="py-2 font-sans text-slate-400 max-w-sm">{row.observation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
