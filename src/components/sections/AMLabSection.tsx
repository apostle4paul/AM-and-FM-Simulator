import React from 'react';
import { AMParams, ChannelParams, FullSimulationResult } from '../../types/simulation';
import { MetricCard } from '../common/MetricCard';
import { SectionHeader, SliderControl, WarningNotice } from '../common/ControlPrimitives';
import { WaveformCanvas } from '../charts/WaveformCanvas';
import { SpectrumCanvas } from '../charts/SpectrumCanvas';

interface AMLabSectionProps {
  amParams: AMParams;
  channelParams: ChannelParams;
  sim: FullSimulationResult;
  onChangeAM: (next: AMParams) => void;
  onChangeChannel: (next: ChannelParams) => void;
}

export const AMLabSection: React.FC<AMLabSectionProps> = ({
  amParams,
  channelParams,
  sim,
  onChangeAM,
  onChangeChannel,
}) => {
  const updateAM = (patch: Partial<AMParams>) => onChangeAM({ ...amParams, ...patch });
  const updateCh = (patch: Partial<ChannelParams>) =>
    onChangeChannel({ ...channelParams, ...patch, presetId: 'custom' });

  const fcKHz = amParams.carrierFreqHz / 1000;
  const specSpanKHz = Math.max(25, (sim.amMetrics.theoreticalBwHz / 1000) * 2.5);
  const isComposite = sim.signal.components.length > 1;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AM Modulation and Envelope Detection Laboratory"
        subtitle="Conventional Double-Sideband Full-Carrier (DSB-FC) Amplitude Modulation with causal bandpass filtering, RC diode envelope detection, DC removal, and low-pass audio recovery."
      />

      {sim.amMetrics.isOvermodulated && (
        <WarningNotice
          tone="rose"
          title={`Overmodulation Warning (μ = ${sim.amMetrics.effectiveMu.toFixed(2)} > 1.00)`}
        >
          Conventional RC diode envelope detection cannot follow negative phase reversals of [1 + μ m(t)].
          Instead, it tracks |1 + μ m(t)|, producing severe trough foldover and harmonic distortion
          (measured NMSE distortion: {sim.am.distortionPct.toFixed(2)}%).
        </WarningNotice>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* AM Controls Panel */}
        <div className="lg:col-span-4 bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100 border-b border-slate-800 pb-2">
            AM Modulator & Receiver Controls
          </h2>

          <SliderControl
            label="Carrier Amplitude (Ac)"
            value={amParams.carrierAmplitudeV}
            min={0.5}
            max={15.0}
            step={0.5}
            unit="V"
            formatValue={(v) => v.toFixed(1)}
            onChange={(v) => updateAM({ carrierAmplitudeV: v })}
          />

          <SliderControl
            label="Carrier Frequency (fc)"
            value={amParams.carrierFreqHz}
            min={40_000}
            max={250_000}
            step={5000}
            unit="kHz"
            formatValue={(v) => (v / 1000).toFixed(0)}
            onChange={(v) => updateAM({ carrierFreqHz: v })}
          />

          <div className="space-y-2 pt-1">
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
              <span>Couple μ = Am / Ac</span>
              <input
                type="checkbox"
                checked={amParams.coupleAmplitudeToIndex}
                onChange={(e) => updateAM({ coupleAmplitudeToIndex: e.target.checked })}
                className="accent-cyan-500 w-4 h-4"
              />
            </label>

            <SliderControl
              label="Modulation Index (μ)"
              value={sim.amMetrics.effectiveMu}
              min={0.0}
              max={1.5}
              step={0.05}
              formatValue={(v) => `${v.toFixed(2)} (${(v * 100).toFixed(0)}%)`}
              disabled={amParams.coupleAmplitudeToIndex}
              onChange={(v) => updateAM({ modulationIndex: v })}
              hint="Values > 1.00 trigger physical overmodulation."
            />
          </div>

          <div className="border-t border-slate-800 pt-3 space-y-4">
            <SliderControl
              label="Receiver Bandpass Bandwidth"
              value={amParams.rxBandwidthHz}
              min={6000}
              max={40_000}
              step={1000}
              unit="kHz"
              formatValue={(v) => (v / 1000).toFixed(0)}
              onChange={(v) => updateAM({ rxBandwidthHz: v })}
            />

            <SliderControl
              label="Envelope Detector RC Time (τ)"
              value={amParams.envelopeTauUs}
              min={5}
              max={120}
              step={5}
              unit="μs"
              onChange={(v) => updateAM({ envelopeTauUs: v })}
              hint="Optimal τ balances carrier ripple rejection vs diagonal clipping."
            />

            <SliderControl
              label="Receiver Audio LPF Cutoff"
              value={amParams.rxLpfCutoffHz}
              min={3500}
              max={12000}
              step={500}
              unit="kHz"
              formatValue={(v) => (v / 1000).toFixed(1)}
              onChange={(v) => updateAM({ rxLpfCutoffHz: v })}
            />
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
              min={-10}
              max={50}
              step={1}
              unit="dB"
              disabled={!channelParams.noiseEnabled}
              onChange={(v) => updateCh({ snrTargetDb: v })}
            />
          </div>
        </div>

        {/* AM Visualizations & Metrics */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Input SNR (Channel)"
              value={Number.isFinite(sim.am.inputSnrDb) ? sim.am.inputSnrDb.toFixed(2) : 'Noise Off'}
              unit={Number.isFinite(sim.am.inputSnrDb) ? 'dB' : ''}
              sublabel={`Post-BPF CNR: ${Number.isFinite(sim.am.postBpfCnrDb) ? sim.am.postBpfCnrDb.toFixed(1) + ' dB' : 'Noise Off'}`}
            />
            <MetricCard
              label="Output SNR"
              value={
                sim.am.isOutputSnrPrecisionCapped
                  ? `>${sim.am.outputSnrDb.toFixed(1)}`
                  : sim.am.outputSnrDb.toFixed(2)
              }
              unit="dB"
              sublabel={`Delay aligned: ${sim.am.delayMs.toFixed(3)} ms`}
              tone="blue"
            />
            <MetricCard
              label="NMSE Distortion"
              value={sim.am.distortionPct.toFixed(3)}
              unit="%"
              sublabel={`NMSE = ${sim.am.nmse.toFixed(5)}`}
              tone={sim.am.distortionPct > 5 ? 'rose' : 'emerald'}
            />
            <MetricCard
              label="Modulation Efficiency"
              value={sim.amMetrics.modulationEfficiencyPct.toFixed(2)}
              unit="%"
              sublabel={`Theo η = ${sim.amMetrics.theoreticalEfficiencyPct.toFixed(2)}%`}
              tone="cyan"
            />
          </div>

          <WaveformCanvas
            title="AM Transmitted Waveform s_AM(t) [Normalized Channel Power]"
            timeSec={sim.signal.timeSec}
            series={[{ label: 'AM Transmitted', data: sim.am.transmittedNorm, color: '#3B82F6' }]}
            yLabel="Voltage"
            yUnit="V"
            height={210}
            defaultWindowMs={0.8}
          />

          <WaveformCanvas
            title="AM Received Noisy RF Waveform r_AM(t)"
            timeSec={sim.signal.timeSec}
            series={[{ label: 'AM Received', data: sim.am.receivedNoisy, color: '#F59E0B' }]}
            yLabel="Voltage"
            yUnit="V"
            height={210}
            defaultWindowMs={0.8}
          />

          <WaveformCanvas
            title="AM Recovered Audio vs Original Message (Aligned)"
            timeSec={sim.signal.timeSec}
            series={[
              { label: 'Original Message', data: sim.signal.messageV, color: '#94A3B8', dashed: true },
              { label: 'AM Recovered', data: sim.am.recoveredAligned, color: '#3B82F6' },
            ]}
            yLabel="Voltage"
            yUnit="V"
            height={220}
            defaultWindowMs={1.5}
          />

          <SpectrumCanvas
            title="AM Transmitted & Received RF Spectrum (FFT)"
            spectrum={sim.am.txSpectrum}
            secondarySpectrum={sim.am.rxSpectrum}
            primaryLabel="AM Transmitted"
            secondaryLabel="AM Received (with AWGN)"
            primaryColor="#3B82F6"
            secondaryColor="#F59E0B"
            minFreqKHz={Math.max(0, fcKHz - specSpanKHz)}
            maxFreqKHz={fcKHz + specSpanKHz}
            bracketCenterKHz={fcKHz}
            bracketWidthKHz={sim.amMetrics.theoreticalBwHz / 1000}
            bracketLabel={`2·f_max = ${(sim.amMetrics.theoreticalBwHz / 1000).toFixed(1)} kHz`}
            markers={[
              { freqKHz: sim.amMetrics.lsbFreqHz / 1000, label: 'LSB', color: '#93C5FD' },
              { freqKHz: fcKHz, label: `Carrier (${fcKHz.toFixed(0)}k)`, color: '#E2E8F0' },
              { freqKHz: sim.amMetrics.usbFreqHz / 1000, label: 'USB', color: '#93C5FD' },
            ]}
            height={235}
          />

          {/* Detailed AM Numerical Breakdown */}
          <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">
              AM Power, Sideband & Bandwidth Analysis ({isComposite ? 'Composite Message' : 'Single-Tone Sinusoidal'})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Carrier Power (Pc = Ac²/2)</span>
                <span className="text-slate-100">
                  {sim.amMetrics.carrierPowerW.toFixed(3)} W
                  {Math.abs(sim.amMetrics.meanModTerm) > 1e-3
                    ? ` (Eff DC-shifted: ${sim.amMetrics.theoreticalCarrierPowerW.toFixed(3)} W)`
                    : ''}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Total TX Power (Meas / Theo)</span>
                <span className="text-slate-100">
                  {sim.amMetrics.totalPowerW.toFixed(3)} W / {sim.amMetrics.theoreticalTotalPowerW.toFixed(3)} W
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Sideband Power (Meas / Theo)</span>
                <span className="text-slate-100">
                  {sim.amMetrics.sidebandPowerW.toFixed(3)} W / {sim.amMetrics.theoreticalSidebandPowerW.toFixed(3)} W
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Mean[x²] & Single-Tone Ref</span>
                <span className="text-slate-100">
                  x̄²={sim.amMetrics.meanSqModTerm.toFixed(4)}
                  {isComposite ? ` (Naive 1-tone: ${sim.amMetrics.singleTonePowerW.toFixed(3)} W)` : ''}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Upper / Lower Sidebands</span>
                <span className="text-slate-100">
                  {(sim.amMetrics.lsbFreqHz / 1000).toFixed(2)} / {(sim.amMetrics.usbFreqHz / 1000).toFixed(2)} kHz
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Theoretical AM BW (2·f_max)</span>
                <span className="text-slate-100">{(sim.amMetrics.theoreticalBwHz / 1000).toFixed(2)} kHz</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Measured 98% FFT Power BW</span>
                <span className="text-slate-100">{(sim.amMetrics.measuredBw98Hz / 1000).toFixed(2)} kHz</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/70 py-1.5">
                <span className="text-slate-400">Measured −20 dB FFT BW</span>
                <span className="text-slate-100">{(sim.amMetrics.measuredBw20DbHz / 1000).toFixed(2)} kHz</span>
              </div>
            </div>
            <div className="mt-2.5 space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
              <p>
                General AM average power obeys P_AM = Pc·mean[(1 + x(t))²] (which reduces to Pc[1 + mean(x²)] for zero-mean signals, and Pc(1 + μ²/2) only for pure single-tone sinusoids).
              </p>
              <p className="bg-[#080D16] border border-slate-800 rounded p-2 text-slate-300">
                <strong className="text-blue-300">AM Broadcast Bandwidth Note (BW_AM = 2·f_max):</strong> With a 5 kHz maximum educational tone, DSB-FC requires BW_AM = 10.0 kHz. In <strong className="text-slate-100">ITU Region 1 (Ethiopia) 9 kHz-spaced Medium-Wave channels</strong>, practical broadcast audio is band-limited to <span className="font-mono text-cyan-300">f_max ≤ 4.5 kHz</span> (giving BW_AM ≤ 9.0 kHz) to prevent adjacent-channel splatter; test this by setting the Signal Generator to 4.0–4.5 kHz while keeping the 3–5 kHz lab option available.
              </p>
            </div>
          </div>

          {/* Educational Envelope Detector Guide */}
          <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-2">
            <h3 className="text-sm font-semibold text-blue-300">
              How the RC Diode Envelope Detector Recovers Baseband Audio
            </h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>
                <strong className="text-slate-200">Diode Half-Wave Rectification:</strong> Only positive RF half-cycles above the capacitor voltage forward-bias the diode, blocking negative carrier swings.
              </li>
              <li>
                <strong className="text-slate-200">Capacitor Charging &amp; Discharging:</strong> When the rectified carrier peak exceeds capacitor voltage, the capacitor charges rapidly toward the envelope peak; between carrier cycles it discharges exponentially at rate exp(−t / τ) where τ = RC.
              </li>
              <li>
                <strong className="text-slate-200">Choosing RC Time Constant τ ({amParams.envelopeTauUs} μs active):</strong> If τ is too small (≪ 1/fc), the capacitor discharges deeply between RF peaks, leaking high-frequency carrier ripple; if τ is too large (approaching 1/(2πf_max)), the capacitor cannot decay fast enough on steep 3–5 kHz downward troughs, causing <em>diagonal clipping</em>.
              </li>
              <li>
                <strong className="text-slate-200">Overmodulation Distortion (μ &gt; 1):</strong> When 1 + x(t) &lt; 0, the carrier phase flips 180°, so the diode detector tracks the positive magnitude |1 + x(t)| rather than x(t), creating folded troughs and harmonic distortion.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
