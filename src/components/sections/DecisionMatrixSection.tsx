import React, { useState } from 'react';
import { MetricCard } from '../common/MetricCard';
import { SectionHeader, WarningNotice } from '../common/ControlPrimitives';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ScenarioProfileId = 'rural' | 'urban' | 'emergency';

interface CriterionRow {
  id: string;
  label: string;
  weightPct: number;
  amRating: number; // 1-5 (higher = more favorable, including lower cost/power/complexity)
  fmRating: number; // 1-5
  scoringNote: string;
}

const SCENARIO_PROFILES: Record<
  ScenarioProfileId,
  {
    name: string;
    description: string;
    criteria: CriterionRow[];
  }
> = {
  rural: {
    name: '1. Rural & Wide-Area Broadcasting',
    description:
      'Prioritizes regional ground/sky-wave reach across dispersed rural communities and low-cost multi-band receivers.',
    criteria: [
      { id: 'coverage', label: 'Coverage Reach', weightPct: 25, amRating: 5, fmRating: 2, scoringNote: 'MW AM covers wide regions per site vs FM line-of-sight limits' },
      { id: 'audio', label: 'Audio Quality', weightPct: 20, amRating: 2, fmRating: 5, scoringNote: 'FM delivers wider audio passband and higher SNR above threshold' },
      { id: 'noise', label: 'Noise Performance', weightPct: 15, amRating: 2, fmRating: 4, scoringNote: 'AM suffers lightning static; FM rejects amplitude noise above threshold' },
      { id: 'cost', label: 'Infrastructure Cost (Lower=5)', weightPct: 15, amRating: 3, fmRating: 3, scoringNote: 'Single AM mast vs multi-site FM relay towers for wide area' },
      { id: 'receivers', label: 'Receiver Availability', weightPct: 10, amRating: 4, fmRating: 4, scoringNote: 'MW/SW battery radios in remote areas vs phone FM tuners' },
      { id: 'power', label: 'Power Consumption (Lower=5)', weightPct: 10, amRating: 2, fmRating: 4, scoringNote: 'High-power AM transmitter vs efficient solid-state FM' },
      { id: 'maintenance', label: 'Maintenance Simplicity (Lower=5)', weightPct: 5, amRating: 2, fmRating: 4, scoringNote: 'AM ground radials & lightning exposure vs modular FM' },
    ],
  },
  urban: {
    name: '2. Urban & Community Broadcasting',
    description:
      'Prioritizes crisp audio fidelity, urban impulsive EMI rejection, lower civil footprint, and widespread smartphone/car FM receivers.',
    criteria: [
      { id: 'coverage', label: 'Coverage Reach', weightPct: 15, amRating: 4, fmRating: 4, scoringNote: 'Both cover metropolitan basin from elevated sites like Entoto' },
      { id: 'audio', label: 'Audio Quality', weightPct: 25, amRating: 2, fmRating: 5, scoringNote: 'FM excels for music, speech clarity, and community programming' },
      { id: 'noise', label: 'Noise Performance', weightPct: 20, amRating: 1, fmRating: 5, scoringNote: 'Urban electrical EMI severely degrades AM envelopes' },
      { id: 'cost', label: 'Infrastructure Cost (Lower=5)', weightPct: 15, amRating: 2, fmRating: 5, scoringNote: 'Urban land for AM radial fields is costly; FM mounts on rooftops' },
      { id: 'receivers', label: 'Receiver Availability', weightPct: 10, amRating: 2, fmRating: 5, scoringNote: 'Urban phones, cars, and home sets overwhelmingly carry FM' },
      { id: 'power', label: 'Power Consumption (Lower=5)', weightPct: 10, amRating: 3, fmRating: 4, scoringNote: 'Lower kW needed for compact urban FM coverage' },
      { id: 'maintenance', label: 'Maintenance Simplicity (Lower=5)', weightPct: 5, amRating: 2, fmRating: 5, scoringNote: 'Easy urban FM rack servicing' },
    ],
  },
  emergency: {
    name: '3. Emergency & Public Information',
    description:
      'Balances wide-area disaster continuity, receiver battery life, noise intelligibility, and multi-channel redundancy.',
    criteria: [
      { id: 'coverage', label: 'Coverage Reach', weightPct: 30, amRating: 5, fmRating: 3, scoringNote: 'Single resilient MW AM site survives local repeater outages' },
      { id: 'audio', label: 'Audio Quality', weightPct: 10, amRating: 3, fmRating: 5, scoringNote: 'Voice intelligibility (3–5 kHz) adequate on both, clearer on FM' },
      { id: 'noise', label: 'Noise Performance', weightPct: 15, amRating: 3, fmRating: 4, scoringNote: 'AM degrades gracefully at weak SNR; FM fails steeply below threshold' },
      { id: 'cost', label: 'Infrastructure Cost (Lower=5)', weightPct: 10, amRating: 3, fmRating: 4, scoringNote: 'Backup generator sizing favors efficient FM unless wide reach needed' },
      { id: 'receivers', label: 'Receiver Availability', weightPct: 15, amRating: 4, fmRating: 5, scoringNote: 'Battery/crank MW+FM and mobile FM tuners' },
      { id: 'power', label: 'Power Consumption (Lower=5)', weightPct: 10, amRating: 2, fmRating: 4, scoringNote: 'Emergency diesel autonomy favors lower transmitter draw' },
      { id: 'maintenance', label: 'Maintenance Simplicity (Lower=5)', weightPct: 10, amRating: 2, fmRating: 4, scoringNote: 'Rapid fault restoration critical during emergencies' },
    ],
  },
};

export const DecisionMatrixSection: React.FC = () => {
  const [profileId, setProfileId] = useState<ScenarioProfileId>('rural');
  const [criteria, setCriteria] = useState<CriterionRow[]>(SCENARIO_PROFILES.rural.criteria);

  const selectProfile = (id: ScenarioProfileId) => {
    setProfileId(id);
    setCriteria(SCENARIO_PROFILES[id].criteria.map((c) => ({ ...c })));
  };

  const totalWeight = criteria.reduce((acc, c) => acc + c.weightPct, 0);
  const weightNorm = totalWeight > 0 ? totalWeight : 100;

  const amScore = criteria.reduce(
    (acc, c) => acc + (c.weightPct / weightNorm) * c.amRating,
    0
  );
  const fmScore = criteria.reduce(
    (acc, c) => acc + (c.weightPct / weightNorm) * c.fmRating,
    0
  );
  const diff = fmScore - amScore;

  const normalizeWeights = () => {
    if (totalWeight <= 0) return;
    const scaled = criteria.map((c) => ({
      ...c,
      weightPct: Math.round((c.weightPct / totalWeight) * 100),
    }));
    const sum = scaled.reduce((a, b) => a + b.weightPct, 0);
    if (scaled.length > 0 && sum !== 100) {
      scaled[0].weightPct += 100 - sum;
    }
    setCriteria(scaled);
  };

  const chartData = criteria.map((c) => ({
    criterion: c.label.replace(/\s*\(.*?\)/, ''),
    AM: Number(((c.weightPct / weightNorm) * c.amRating).toFixed(3)),
    FM: Number(((c.weightPct / weightNorm) * c.fmRating).toFixed(3)),
    amRaw: c.amRating,
    fmRaw: c.fmRating,
  }));

  const winner =
    Math.abs(diff) < 0.08
      ? 'Hybrid / Tie — Deploy Context-Specific Mix'
      : diff > 0
      ? `FM Recommended (+${diff.toFixed(2)} weighted pts)`
      : `AM Recommended (+${Math.abs(diff).toFixed(2)} weighted pts)`;

  const covCriterion = criteria.find((c) => c.id === 'coverage') ?? criteria[0];
  const otherCriteria = criteria.filter((c) => c.id !== covCriterion?.id);
  const otherWeightSum = otherCriteria.reduce((acc, c) => acc + c.weightPct, 0);
  const amRestAvg =
    otherWeightSum > 0
      ? otherCriteria.reduce((acc, c) => acc + (c.weightPct / otherWeightSum) * c.amRating, 0)
      : amScore;
  const fmRestAvg =
    otherWeightSum > 0
      ? otherCriteria.reduce((acc, c) => acc + (c.weightPct / otherWeightSum) * c.fmRating, 0)
      : fmScore;
  const covDelta = covCriterion ? covCriterion.amRating - covCriterion.fmRating : 0; // AM - FM on coverage
  const restDelta = amRestAvg - fmRestAvg; // AM - FM on all other criteria
  const denom = covDelta - restDelta;
  const pCross = Math.abs(denom) > 1e-6 ? -restDelta / denom : null;
  const hasInteriorCrossover = pCross !== null && pCross > 0 && pCross < 1 && otherWeightSum > 0;
  const crossoverPct = hasInteriorCrossover ? pCross * 100 : null;
  const currentLeaderText =
    Math.abs(diff) < 0.08
      ? `effectively tied (AM ${amScore.toFixed(2)} vs FM ${fmScore.toFixed(2)}, |Δ| = ${Math.abs(diff).toFixed(2)})`
      : diff > 0
      ? `FM leads (${fmScore.toFixed(2)} vs AM ${amScore.toFixed(2)}, +${diff.toFixed(2)} pts)`
      : `AM leads (${amScore.toFixed(2)} vs FM ${fmScore.toFixed(2)}, +${Math.abs(diff).toFixed(2)} pts)`;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Weighted Engineering Decision Matrix"
        subtitle="Scenario-driven multi-criteria decision analysis (MCDA) for Ethiopian broadcasting technology selection. Higher scores (1–5) always represent more favorable performance."
      />

      {/* Profile Tabs */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SCENARIO_PROFILES) as ScenarioProfileId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => selectProfile(id)}
              className={`px-3.5 py-2 rounded text-xs font-medium border transition-colors ${
                profileId === id
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                  : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {SCENARIO_PROFILES[id].name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">{SCENARIO_PROFILES[profileId].description}</p>
      </div>

      {totalWeight !== 100 && (
        <WarningNotice tone="amber" title={`Weights Sum to ${totalWeight}% (Target = 100%)`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Final weighted scores are automatically normalized by {totalWeight}%, or click to scale weights cleanly to 100%.
            </span>
            <button
              type="button"
              onClick={normalizeWeights}
              className="px-3 py-1 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-medium"
            >
              Normalize to 100%
            </button>
          </div>
        </WarningNotice>
      )}

      {/* Score Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="AM Weighted Score"
          value={amScore.toFixed(2)}
          unit="/ 5.00"
          tone="blue"
        />
        <MetricCard
          label="FM Weighted Score"
          value={fmScore.toFixed(2)}
          unit="/ 5.00"
          tone="cyan"
        />
        <MetricCard
          label="Score Margin (FM − AM)"
          value={`${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`}
          unit="pts"
          tone={diff > 0 ? 'cyan' : 'blue'}
        />
        <MetricCard
          label="Scenario Recommendation"
          value={Math.abs(diff) < 0.08 ? 'Hybrid' : diff > 0 ? 'VHF FM' : 'MW AM'}
          sublabel={winner}
          tone="emerald"
        />
      </div>

      {/* Interactive Matrix Table */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Criteria Weights & Ratings (1 = Poor / Unfavorable, 5 = Excellent / Favorable)
          </h2>
          <span
            className={`text-xs font-mono tabular-nums ${
              totalWeight === 100 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            Total Weight: {totalWeight}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-medium">Criterion</th>
                <th className="py-2 pr-3 font-medium w-28">Weight (%)</th>
                <th className="py-2 pr-3 font-medium w-24 text-blue-400">AM (1–5)</th>
                <th className="py-2 pr-3 font-medium w-24 text-cyan-400">FM (1–5)</th>
                <th className="py-2 pr-3 font-medium text-blue-300">AM Weighted</th>
                <th className="py-2 pr-3 font-medium text-cyan-300">FM Weighted</th>
                <th className="py-2 font-medium">Basis</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, idx) => {
                const wNorm = c.weightPct / weightNorm;
                return (
                  <tr key={c.id} className="border-b border-slate-800/70">
                    <td className="py-2 pr-3 font-medium text-slate-200">{c.label}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={c.weightPct}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                          const next = [...criteria];
                          next[idx] = { ...c, weightPct: val };
                          setCriteria(next);
                        }}
                        className="w-20 bg-[#080D16] border border-slate-700 rounded px-2 py-1 font-mono tabular-nums text-slate-100"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={c.amRating}
                        onChange={(e) => {
                          const next = [...criteria];
                          next[idx] = { ...c, amRating: parseInt(e.target.value, 10) };
                          setCriteria(next);
                        }}
                        className="bg-[#080D16] border border-slate-700 rounded px-2 py-1 font-mono text-blue-300"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={c.fmRating}
                        onChange={(e) => {
                          const next = [...criteria];
                          next[idx] = { ...c, fmRating: parseInt(e.target.value, 10) };
                          setCriteria(next);
                        }}
                        className="bg-[#080D16] border border-slate-700 rounded px-2 py-1 font-mono text-cyan-300"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-blue-300">
                      {(wNorm * c.amRating).toFixed(3)}
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums text-cyan-300">
                      {(wNorm * c.fmRating).toFixed(3)}
                    </td>
                    <td className="py-2 text-slate-400">{c.scoringNote}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
          <h3 className="text-sm font-semibold text-slate-100 mb-3">
            Weighted Score Contribution by Criterion
          </h3>
          <div className="h-64 w-full bg-[#080D16] border border-slate-800 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="#182234" strokeDasharray="3 3" />
                <XAxis dataKey="criterion" stroke="#94A3B8" fontSize={10} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D131F',
                    borderColor: '#334155',
                    fontSize: '12px',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="AM" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="FM" fill="#06B6D4" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
          <h3 className="text-sm font-semibold text-slate-100 mb-3">
            Unweighted Capability Profile (1–5 Scale)
          </h3>
          <div className="h-64 w-full bg-[#080D16] border border-slate-800 rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid stroke="#1E293B" />
                <PolarAngleAxis dataKey="criterion" stroke="#94A3B8" fontSize={10} />
                <PolarRadiusAxis domain={[0, 5]} stroke="#475569" fontSize={10} />
                <Radar
                  name="AM Rating"
                  dataKey="amRaw"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.22}
                />
                <Radar
                  name="FM Rating"
                  dataKey="fmRaw"
                  stroke="#06B6D4"
                  fill="#06B6D4"
                  fillOpacity={0.22}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scale Clarification, Weight Sensitivity & Balanced Engineering Synthesis */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
        <div className="bg-[#080D16] border border-slate-800 rounded p-3">
          <div className="font-semibold text-slate-200 mb-1">Scale Convention (Section 7 vs. Section 9)</div>
          <p className="text-slate-400">
            In <strong className="text-slate-200">Section 7 Complexity Tables</strong>, 1 = easy / very low complexity and 5 = very difficult. In this <strong className="text-slate-200">Section 9 Decision Matrix</strong>, every score is oriented for favorability: 1 = least favorable and 5 = most favorable (so lower cost/complexity receives a higher rating).
          </p>
        </div>
        <div className="bg-[#080D16] border border-slate-800 rounded p-3">
          <div className="font-semibold text-amber-300 mb-1">Live Weight Sensitivity Analysis</div>
          <p className="text-slate-400">
            At the active weights ({covCriterion?.label} ={' '}
            <span className="font-mono text-slate-200">{covCriterion?.weightPct ?? 0}%</span>),{' '}
            <strong className="text-slate-200">{currentLeaderText}</strong>.{' '}
            {crossoverPct !== null
              ? `Holding remaining weight ratios fixed, AM and FM break even when ${covCriterion?.label} is ${crossoverPct.toFixed(1)}%${covDelta > 0 ? `: AM leads above ${crossoverPct.toFixed(1)}%, while FM leads below ${crossoverPct.toFixed(1)}%.` : `: FM leads above ${crossoverPct.toFixed(1)}%, while AM leads below ${crossoverPct.toFixed(1)}%.`}`
              : covDelta === 0 && Math.abs(restDelta) < 1e-6
              ? 'AM and FM score identically across every weight allocation under these ratings.'
              : `${diff >= 0 ? 'FM' : 'AM'} holds the weighted lead across all 0–100% allocations of ${covCriterion?.label} unless individual criterion ratings change.`}
          </p>
        </div>
        <div className="bg-[#080D16] border border-slate-800 rounded p-3">
          <div className="font-semibold text-emerald-300 mb-1">Balanced Deployment Conclusion</div>
          <p className="text-slate-400">
            Neither technology dominates every context: <strong className="text-blue-300">MW AM</strong> remains defensible for wide-area remote and emergency reach; <strong className="text-cyan-300">VHF FM</strong> is generally superior for urban and community radio where spectrum and line-of-sight permit; <strong className="text-slate-200">Hybrid AM+FM</strong> fits national corridors needing both reach and local clarity.
          </p>
        </div>
      </div>
    </div>
  );
};
