import React from 'react';
import {
  AMParams,
  ChannelParams,
  FMParams,
  FullSimulationResult,
  SignalParams,
} from '../../types/simulation';
import { MetricCard } from '../common/MetricCard';
import { SectionHeader, WarningNotice } from '../common/ControlPrimitives';
import { WaveformCanvas } from '../charts/WaveformCanvas';
import { Activity, ArrowRight, Radio, Sliders, TrendingDown } from 'lucide-react';

export type NavSectionId =
  | 'overview'
  | 'signal-generator'
  | 'am-lab'
  | 'fm-lab'
  | 'comparison'
  | 'experiments'
  | 'ethiopia'
  | 'cost-tco'
  | 'decision-matrix'
  | 'theory-validation';

interface OverviewSectionProps {
  sim: FullSimulationResult;
  signalParams: SignalParams;
  amParams: AMParams;
  fmParams: FMParams;
  channelParams: ChannelParams;
  onApplyPreset: (preset: 'clean' | 'moderate' | 'weak') => void;
  onNavigate: (id: NavSectionId) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  sim,
  signalParams,
  amParams,
  fmParams,
  channelParams,
  onApplyPreset,
  onNavigate,
}) => {
  const snrFmt = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : 'Noise Off');

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AM vs FM Communication Simulator and Engineering Comparison"
        subtitle="Browser-based digital communication laboratory comparing conventional DSB-FC Amplitude Modulation and Frequency Modulation over identical baseband signals and calibrated AWGN channels for Ethiopian regional broadcasting."
        actions={
          <div className="flex items-center gap-1.5 bg-[#0D131F] border border-slate-800 rounded-md p-1">
            {(
              [
                { id: 'clean', label: 'Clean (40 dB)' },
                { id: 'moderate', label: 'Moderate (20 dB)' },
                { id: 'weak', label: 'Weak (5 dB)' },
              ] as const
            ).map((p) => {
              const active = channelParams.presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onApplyPreset(p.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        }
      />

      {sim.warnings.length > 0 && (
        <div className="space-y-2">
          {sim.warnings.map((w, idx) => (
            <WarningNotice key={idx} tone="amber" title="Physical / Modulation Constraint Notice">
              {w}
            </WarningNotice>
          ))}
        </div>
      )}

      {/* Primary Telemetry KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Channel Input SNR"
          value={snrFmt(sim.am.inputSnrDb)}
          unit={Number.isFinite(sim.am.inputSnrDb) ? 'dB' : ''}
          sublabel={`P_ref = ${channelParams.referencePowerW.toFixed(2)} W`}
          tone="neutral"
        />
        <MetricCard
          label="AM Output SNR"
          value={`${sim.am.isOutputSnrPrecisionCapped ? '>' : ''}${sim.am.outputSnrDb.toFixed(2)}`}
          unit="dB"
          sublabel={`NMSE Dist: ${sim.am.distortionPct.toFixed(2)}%${sim.am.isOutputSnrPrecisionCapped ? ' (Capped)' : ''}`}
          tone="blue"
        />
        <MetricCard
          label="FM Output SNR"
          value={`${sim.fm.isOutputSnrPrecisionCapped ? '>' : ''}${sim.fm.outputSnrDb.toFixed(2)}`}
          unit="dB"
          sublabel={`NMSE Dist: ${sim.fm.distortionPct.toFixed(2)}%${sim.fm.isOutputSnrPrecisionCapped ? ' (Capped)' : ''}`}
          tone="cyan"
        />
        <MetricCard
          label="AM Modulation Index"
          value={sim.amMetrics.effectiveMu.toFixed(2)}
          sublabel={`BW_AM = ${(sim.amMetrics.theoreticalBwHz / 1000).toFixed(1)} kHz`}
          tone={sim.amMetrics.isOvermodulated ? 'rose' : 'blue'}
        />
        <MetricCard
          label="FM Modulation Index"
          value={sim.fmMetrics.beta.toFixed(2)}
          sublabel={`${(fmParams.deEmphasisUs ?? 0) > 0 ? 'Nom. Carson BW' : 'Carson BW'} = ${(sim.fmMetrics.carsonBwHz / 1000).toFixed(1)} kHz`}
          tone="cyan"
        />
        <MetricCard
          label="FM Post-BPF CNR"
          value={snrFmt(sim.fm.postBpfCnrDb)}
          unit={Number.isFinite(sim.fm.postBpfCnrDb) ? 'dB' : ''}
          sublabel={`RX BW = ${(fmParams.rxBandwidthHz / 1000).toFixed(0)} kHz`}
          tone={sim.fm.postBpfCnrDb < 10 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Live Comparative Waveform Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
        <div className="xl:col-span-2">
          <WaveformCanvas
            title="Live Baseband Recovery Comparison: Original vs AM vs FM"
            timeSec={sim.signal.timeSec}
            series={[
              { label: 'Original Message', data: sim.signal.messageV, color: '#94A3B8', dashed: true },
              { label: 'AM Recovered', data: sim.am.recoveredAligned, color: '#3B82F6' },
              { label: 'FM Recovered', data: sim.fm.recoveredAligned, color: '#06B6D4' },
            ]}
            yLabel="Voltage"
            yUnit="V"
            height={280}
            defaultWindowMs={1.5}
          />
        </div>

        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">Active Laboratory Configuration</h2>
            <p className="mt-1 text-xs text-slate-400">
              Both modulators process identical discrete-time message samples at equalized channel transmit power.
            </p>

            <dl className="mt-4 space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <dt className="text-slate-400">Message Mode</dt>
                <dd className="text-slate-100">
                  {signalParams.mode === 'single' ? 'Sinusoidal' : 'Composite'} (f_max {(sim.signal.fMaxHz / 1000).toFixed(2)} kHz)
                </dd>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <dt className="text-slate-400">Sampling Rate (fs)</dt>
                <dd className="text-slate-100">
                  {(sim.signal.fs / 1000).toFixed(0)} kHz ({sim.signal.numSamples} pts)
                </dd>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <dt className="text-slate-400">AM Carrier / RX BW</dt>
                <dd className="text-blue-400">
                  {(amParams.carrierFreqHz / 1000).toFixed(0)} kHz / {(amParams.rxBandwidthHz / 1000).toFixed(0)} kHz
                </dd>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <dt className="text-slate-400">FM Carrier / Δf / RX BW</dt>
                <dd className="text-cyan-400">
                  {(fmParams.carrierFreqHz / 1000).toFixed(0)} kHz / {(fmParams.freqDeviationHz / 1000).toFixed(0)} kHz / {(fmParams.rxBandwidthHz / 1000).toFixed(0)} kHz
                </dd>
              </div>
              <div className="flex justify-between pb-1">
                <dt className="text-slate-400">Channel Seed</dt>
                <dd className="text-slate-100">#{signalParams.seed}</dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('comparison')}
              className="px-3 py-2 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <span>Full Comparison</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('experiments')}
              className="px-3 py-2 rounded bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <span>Run Experiments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Concise Laboratory Usage Guide */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-100">How to Use This Communication Laboratory</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-400 leading-relaxed">
          <div className="bg-[#080D16] border border-slate-800/80 rounded p-2.5">
            <span className="font-semibold text-slate-200 block mb-0.5">1. What It Demonstrates</span>
            Simulates real-time discrete DSP chains for DSB-FC AM (envelope detection) and FM (quadrature I/Q discrimination) over a calibrated shared channel.
          </div>
          <div className="bg-[#080D16] border border-slate-800/80 rounded p-2.5">
            <span className="font-semibold text-slate-200 block mb-0.5">2. Run Experiments</span>
            Use Clean (40 dB), Moderate (20 dB), or Weak (5 dB) buttons above, or open <strong className="text-slate-200">Section 6</strong> to execute all three runs and export CSV/Markdown/JSON.
          </div>
          <div className="bg-[#080D16] border border-slate-800/80 rounded p-2.5">
            <span className="font-semibold text-slate-200 block mb-0.5">3. Compare AM vs FM</span>
            Adjust message/modem settings in <strong className="text-slate-200">Sections 2–4</strong> and inspect matched-power SNR, NMSE, bandwidth, and threshold sweep in <strong className="text-slate-200">Section 5</strong>.
          </div>
          <div className="bg-[#080D16] border border-slate-800/80 rounded p-2.5">
            <span className="font-semibold text-slate-200 block mb-0.5">4. Ethiopia &amp; Decision Matrix</span>
            Review rural MW vs. urban FM trade-offs in <strong className="text-slate-200">Section 7</strong>, 5-year ETB TCO in <strong className="text-slate-200">Section 8</strong>, and weighted scoring in <strong className="text-slate-200">Section 9</strong>.
          </div>
        </div>
      </div>

      {/* Engineering Workflow Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'signal-generator' as NavSectionId,
            icon: Activity,
            title: '01. Baseband & Modem Labs',
            desc: 'Configure 3–5 kHz messages, AM RC envelope detection (including μ > 1 overmodulation), and FM phase discrimination.',
            action: 'Open Signal Generator',
          },
          {
            id: 'fm-lab' as NavSectionId,
            icon: TrendingDown,
            title: '02. FM Threshold Sweep',
            desc: 'Sweep channel SNR from +30 dB to −14 dB (or custom range) to locate the empirical FM click-noise threshold knee.',
            action: 'Investigate Threshold',
          },
          {
            id: 'ethiopia' as NavSectionId,
            icon: Radio,
            title: '03. Ethiopian Broadcasting',
            desc: 'Compare MW AM ground/sky-wave propagation vs VHF FM urban/line-of-sight deployment and 5-year ETB TCO.',
            action: 'Analyze Scenarios',
          },
          {
            id: 'theory-validation' as NavSectionId,
            icon: Sliders,
            title: '04. Decision & Validation',
            desc: 'Weight engineering criteria by Ethiopian deployment profile and verify simulator accuracy against hand math.',
            action: 'Inspect Validation',
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
                  <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{card.title}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(card.id)}
                className="mt-4 text-left text-xs font-medium text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
              >
                <span>{card.action}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
