import React, { useState } from 'react';
import {
  AMParams,
  ChannelParams,
  FMParams,
  FullSimulationResult,
  SavedExperimentRecord,
  SignalParams,
  ThresholdSweepResult,
  ValidationCheckResult,
} from '../../types/simulation';
import { runIndependentValidationSuite } from '../../dsp/validation';
import { SectionHeader } from '../common/ControlPrimitives';
import { exportCurrentComparisonJSON, exportSummaryMarkdown } from '../../utils/export';
import { AlertTriangle, CheckCircle2, Download, FileText, Info, RefreshCw } from 'lucide-react';

interface TheoryValidationSectionProps {
  signalParams: SignalParams;
  amParams: AMParams;
  fmParams: FMParams;
  channelParams: ChannelParams;
  sim: FullSimulationResult;
  thresholdSweep?: ThresholdSweepResult | null;
  experiments: SavedExperimentRecord[];
}

export const TheoryValidationSection: React.FC<TheoryValidationSectionProps> = ({
  signalParams,
  amParams,
  fmParams,
  channelParams,
  sim,
  thresholdSweep,
  experiments,
}) => {
  const [validationResults, setValidationResults] = useState<ValidationCheckResult[]>(() =>
    runIndependentValidationSuite()
  );

  const rerunValidation = () => {
    setValidationResults(runIndependentValidationSuite());
  };

  const passCount = validationResults.filter((v) => v.status === 'PASS').length;
  const approxCount = validationResults.filter(
    (v) => v.status === 'APPROXIMATION EXPECTED'
  ).length;
  const failCount = validationResults.filter((v) => v.status === 'FAIL').length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Engineering Theory and Independent Mathematical Validation"
        subtitle={`Exact mathematical derivations governing the simulator's DSP algorithms alongside ${validationResults.length} automated hand-calculation verification tests with explicit tolerances.`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={rerunValidation}
              className="px-3.5 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Run Validation Suite</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportSummaryMarkdown(
                  sim,
                  experiments,
                  validationResults,
                  { signalParams, amParams, fmParams, channelParams },
                  thresholdSweep
                )
              }
              className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Summary (.md)</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportCurrentComparisonJSON(
                  sim,
                  { signalParams, amParams, fmParams, channelParams },
                  validationResults,
                  thresholdSweep
                )
              }
              className="px-3.5 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Snapshot</span>
            </button>
          </div>
        }
      />

      {/* Independent Mathematical Validation Section */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Independent Mathematical Validation Results ({validationResults.length} Tests)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Compares closed-form analytical textbook calculations against actual outputs computed by the TypeScript DSP engine. Closed-form equations are strictly distinguished from finite-window FFT and Carson bandwidth approximations.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <span className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-300">
              PASS: {passCount}
            </span>
            <span className="px-2 py-1 rounded bg-cyan-950/60 border border-cyan-700/50 text-cyan-300">
              APPROX: {approxCount}
            </span>
            {failCount > 0 && (
              <span className="px-2 py-1 rounded bg-rose-950/60 border border-rose-700/50 text-rose-300">
                FAIL: {failCount}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {validationResults.map((v) => {
            const isPass = v.status === 'PASS';
            const isApprox = v.status === 'APPROXIMATION EXPECTED';
            return (
              <div
                key={v.id}
                className={`bg-[#080D16] border rounded-md p-4 space-y-2.5 ${
                  v.status === 'FAIL'
                    ? 'border-rose-700/60'
                    : isApprox
                    ? 'border-cyan-800/60'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono text-cyan-400">{v.category}</div>
                    <h3 className="text-sm font-semibold text-slate-100">{v.title}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                      isPass
                        ? 'text-emerald-300 bg-emerald-950/50 border-emerald-700/50'
                        : isApprox
                        ? 'text-cyan-300 bg-cyan-950/50 border-cyan-700/50'
                        : 'text-rose-300 bg-rose-950/50 border-rose-700/50'
                    }`}
                  >
                    {isPass ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isApprox ? (
                      <Info className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{v.status}</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400">Given Parameters: </span>
                    <span className="font-mono text-slate-200">{v.givenParameters}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Hand Calculation: </span>
                    <span className="font-mono text-slate-200">{v.handCalculation}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className="bg-[#0D131F] border border-slate-800 rounded p-2">
                      <div className="text-[11px] text-slate-400">Theoretical / Reference</div>
                      <div className="font-mono tabular-nums text-slate-100 mt-0.5">
                        {v.theoreticalValue}
                      </div>
                    </div>
                    <div className="bg-[#0D131F] border border-slate-800 rounded p-2">
                      <div className="text-[11px] text-slate-400">Simulator Measured</div>
                      <div className="font-mono tabular-nums text-cyan-300 mt-0.5">
                        {v.simulatorValue}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono bg-[#0D131F]/60 border border-slate-800/70 rounded p-2">
                    <div>
                      <span className="text-slate-400">Abs Err: </span>
                      <span className="text-slate-200">{v.absoluteError}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Rel Err: </span>
                      <span className="text-slate-200">{v.relativeError}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tolerance: </span>
                      <span className="text-slate-300">{v.acceptanceTolerance}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/70">
                    {v.engineeringNote}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Engineering Theory & Governing Equations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-3">
          <h2 className="text-base font-semibold text-blue-300">
            1. Amplitude Modulation (DSB-FC) & Envelope Detection
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Conventional AM varies carrier envelope amplitude using the normalized or amplitude-coupled modulation term <span className="font-mono text-slate-100">x(t)</span>:
          </p>
          <div className="bg-[#080D16] border border-slate-800 rounded p-3 font-mono text-xs text-slate-200 space-y-1">
            <div>s_AM(t) = Ac · [1 + x(t)] · cos(2π · fc · t)</div>
            <div>x(t) = μ·m_norm(t)  or  x(t) = m(t)/Ac (coupled)</div>
            <div>P_AM = Pc · mean[(1 + x(t))²] = Pc · [(1 + x̄)² + σ_x²]</div>
            <div>Zero-mean general: P_AM = Pc·[1 + mean(x²)], η = mean(x²)/[1 + mean(x²)]</div>
            <div>Single-tone special case: P_AM = Pc·(1 + μ²/2), η = μ²/(2 + μ²)</div>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-200">Composite vs Single-Tone Power:</strong> The single-tone formula{' '}
              <span className="font-mono text-slate-300">Pc(1 + μ²/2)</span> holds strictly for a single pure sinusoid. For multi-tone or non-zero-mean signals, sideband power equals{' '}
              <span className="font-mono text-slate-300">Pc·Var(x)</span> and any DC offset <span className="font-mono text-slate-300">x̄</span> shifts discrete carrier power to{' '}
              <span className="font-mono text-slate-300">Pc(1 + x̄)²</span>.
            </li>
            <li>
              <strong className="text-slate-200">Diode + RC Envelope Detector (τ = RC):</strong> Rectifies the bandpass-filtered signal (<span className="font-mono text-slate-300">max(0, y_bpf)</span>), charging during carrier peaks and discharging exponentially as <span className="font-mono text-slate-300">exp(−Ts/τ)</span>. Too small <span className="font-mono text-slate-300">τ</span> leaks <span className="font-mono text-slate-300">fc</span> carrier ripple; too large <span className="font-mono text-slate-300">τ</span> causes diagonal slope clipping on rapid baseband fall times.
            </li>
            <li>
              <strong className="text-slate-200">Overmodulation (μ &gt; 1):</strong> When <span className="font-mono text-slate-300">1 + x(t) &lt; 0</span>, carrier phase inverts 180° and the rectified envelope follows{' '}
              <span className="font-mono text-slate-300">|1 + x(t)|</span> (foldover distortion), generating harmonic distortion that a non-coherent envelope detector cannot invert.
            </li>
          </ul>
        </div>

        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-3">
          <h2 className="text-base font-semibold text-cyan-300">
            2. Frequency Modulation & Quadrature I/Q Discrimination
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Frequency Modulation maintains a constant carrier amplitude <span className="font-mono text-slate-100">Ac</span> while linearly deviating instantaneous frequency <span className="font-mono text-slate-100">f_i(t)</span>:
          </p>
          <div className="bg-[#080D16] border border-slate-800 rounded p-3 font-mono text-xs text-slate-200 space-y-1">
            <div>f_i(t) = fc + Δf · m_norm(t)  |  β = Δf / f_max</div>
            <div>φ(t) = 2π ∫ f_i(τ) dτ  (trapezoidal discrete integration)</div>
            <div>s_FM(t) = Ac · cos[φ(t)]  |  P_FM = Ac² / 2</div>
            <div>BW_Carson = 2 · (Δf + f_max) = 2 · f_max · (β + 1)</div>
          </div>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-slate-200">Quadrature I/Q Discriminator (Actual DSP Implementation):</strong> The bandpass-filtered FM waveform{' '}
              <span className="font-mono text-slate-300">r[n]</span> is mixed down to complex baseband via orthogonal carrier references{' '}
              <span className="font-mono text-slate-300">I_mix = r[n]·cos(2πfc t)</span> and{' '}
              <span className="font-mono text-slate-300">Q_mix = −r[n]·sin(2πfc t)</span>, low-pass filtered with a 4th-order zero-phase Butterworth I/Q filter (cutoff{' '}
              <span className="font-mono text-slate-300">min(Δf + 2f_max, 1.35·fc)</span>) to suppress{' '}
              <span className="font-mono text-slate-300">2fc</span> images, and demodulated via{' '}
              <span className="font-mono text-slate-300">Δθ[n] = atan2(Q[n]I[n−1] − I[n]Q[n−1], I[n]I[n−1] + Q[n]Q[n−1])</span>{' '}
              followed by a 4th-order baseband audio LPF.
            </li>
            <li>
              <strong className="text-slate-200">Noise & FM Threshold Effect:</strong> Above threshold, wideband FM trades Carson bandwidth for post-detection SNR gain proportional to{' '}
              <span className="font-mono text-slate-300">β²</span>. Below threshold, IF noise vectors encircle the complex I/Q origin and trigger impulsive{' '}
              <span className="font-mono text-slate-300">±2π</span> phase cycle slips ("FM clicks"), causing steep nonlinear SNR collapse.
            </li>
          </ul>
        </div>

        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-100">
            3. Channel Calibration, SNR, NMSE & FFT Spectrum Conventions
          </h2>
          <div className="bg-[#080D16] border border-slate-800 rounded p-3 font-mono text-xs text-slate-200 space-y-1">
            <div>SNR_in = 10·log10(P_ref / P_noise)  |  |SNR_err| = |SNR_meas − SNR_target| dB</div>
            <div>SNR_out = 10·log10(P_ref_msg / P_err)  [clamped to [−40, +80] dB]</div>
            <div>NMSE = Σ(x_clean[n] − y_aligned[n])² / Σx_clean[n]²  |  Dist = 100·NMSE (%)</div>
            <div>Power Spectrum: P_bin = V_rms² / 1Ω = V_p² / 2  →  10·log10(P_bin) [dBW]</div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Both AM and FM transmitters are scaled to an identical average passband channel power{' '}
            <span className="font-mono text-slate-200">P_ref</span> before adding identical-seed Box-Muller AWGN at sampling rate{' '}
            <span className="font-mono text-slate-200">fs</span>. A noiseless calibration pass measures exact causal filter group delay and steady-state scalar gain so noise and distortion metrics isolate channel noise and nonlinear modem distortion accurately.
          </p>
        </div>

        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-3">
          <h2 className="text-base font-semibold text-slate-100">
            4. Summary of AM vs FM Engineering Trade-Offs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-1.5 pr-3">Property</th>
                  <th className="py-1.5 pr-3 text-blue-400">AM (DSB-FC)</th>
                  <th className="py-1.5 text-cyan-400">FM</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-800/60">
                  <td className="py-1.5 pr-3 font-medium">Bandwidth Efficiency</td>
                  <td className="py-1.5 pr-3">High (2·f_max)</td>
                  <td className="py-1.5">Lower (2(Δf + f_max))</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-1.5 pr-3 font-medium">Power Efficiency</td>
                  <td className="py-1.5 pr-3">Low (≤ 33.3% single-tone; ~15–25% speech)</td>
                  <td className="py-1.5">High (constant envelope Class-C PA)</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-1.5 pr-3 font-medium">Noise Immunity</td>
                  <td className="py-1.5 pr-3">Vulnerable to amplitude/EMI noise</td>
                  <td className="py-1.5">Superior above threshold + capture effect</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-medium">Weak-Signal Behavior</td>
                  <td className="py-1.5 pr-3">Gradual linear degradation</td>
                  <td className="py-1.5">Sharp threshold cliff (2π clicks)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mapping Equations to Simulator Controls & Measurements */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-100">
          5. Linking Governing Equations to Simulator Controls & Live Measurements
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300 leading-relaxed">
          <div className="bg-[#080D16] border border-slate-800 rounded p-3">
            <div className="font-semibold text-blue-300 mb-1">AM Controls → DSP Outputs</div>
            <p className="text-slate-400">
              Adjusting <span className="font-mono text-slate-200">Ac</span>, <span className="font-mono text-slate-200">μ</span> (or coupling <span className="font-mono text-slate-200">Am/Ac</span>), <span className="font-mono text-slate-200">RX BPF</span>, and <span className="font-mono text-slate-200">RC τ</span> updates discrete carrier vs variance sideband power, <span className="font-mono text-slate-200">fc ± fm</span> spectral peaks, ripple/diagonal clipping, and Output SNR / NMSE distortion. Setting <span className="font-mono text-slate-200">μ &gt; 1.0</span> triggers envelope foldover.
            </p>
          </div>
          <div className="bg-[#080D16] border border-slate-800 rounded p-3">
            <div className="font-semibold text-cyan-300 mb-1">FM Controls → DSP Outputs</div>
            <p className="text-slate-400">
              Adjusting <span className="font-mono text-slate-200">Δf</span> changes <span className="font-mono text-slate-200">β = Δf/f_max</span>, sideband spread (<span className="font-mono text-slate-200">BW_Carson</span> vs 98% / −20 dB FFT BW), and Quadrature I/Q sensitivity. Setting <span className="font-mono text-slate-200">FM RX BPF &lt; 0.9·BW_Carson</span> truncates sidebands and degrades recovery; widening RX BPF admits more IF noise and raises the threshold SNR.
            </p>
          </div>
          <div className="bg-[#080D16] border border-slate-800 rounded p-3">
            <div className="font-semibold text-emerald-300 mb-1">Channel Controls → Fairness Metrics</div>
            <p className="text-slate-400">
              Enabling AWGN normalizes raw TX powers to equal <span className="font-mono text-slate-200">P_ref</span> before noise injection with identical <span className="font-mono text-slate-200">seed</span>, displaying measured vs target SNR (<span className="font-mono text-slate-200">|SNR_err|</span> in dB) and separating clean noiseless output precision (<span className="font-mono text-slate-200">&gt;80 dB</span> cap) from finite-SNR performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
