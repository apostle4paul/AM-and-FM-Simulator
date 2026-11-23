import React, { useMemo, useState } from 'react';
import { MetricCard } from '../common/MetricCard';
import { SectionHeader, WarningNotice } from '../common/ControlPrimitives';
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

type ComparisonBasis = 'equal-coverage' | 'equal-power' | 'custom';

interface SystemCostInputs {
  // Base CAPEX
  transmitterCostEtb: number;
  antennaTowerCostEtb: number;
  installationCostEtb: number;
  electricalInfraCostEtb: number;
  receiverUnitCostEtb: number;
  receiverQuantity: number;
  // Base OPEX
  powerConsumptionKw: number;
  operatingHoursPerDay: number;
  electricityTariffEtbPerKwh: number;
  annualMaintenanceEtb: number;
  annualPersonnelSiteEtb: number;
  annualReplacementOtherEtb: number;
  // Optional non-overlapping site/backup/STL add-ons (default 0 unless enabled/edited)
  stlHardwareCapexEtb: number;
  dieselLitersPerHour: number;
  dieselHoursPerYear: number;
  dieselPriceEtbPerLiter: number;
  annualGeneratorMaintEtb: number;
  annualSiteTowerLeaseEtb: number;
  annualStlLinkOpexEtb: number;
  annualBackupPowerEtb: number;
}

const ZERO_OPTIONALS = {
  stlHardwareCapexEtb: 0,
  dieselLitersPerHour: 0,
  dieselHoursPerYear: 0,
  dieselPriceEtbPerLiter: 95,
  annualGeneratorMaintEtb: 0,
  annualSiteTowerLeaseEtb: 0,
  annualStlLinkOpexEtb: 0,
  annualBackupPowerEtb: 0,
};

const ILLUSTRATIVE_OPTIONALS: Record<
  Exclude<ComparisonBasis, 'custom'>,
  { am: typeof ZERO_OPTIONALS; fm: typeof ZERO_OPTIONALS }
> = {
  'equal-coverage': {
    am: {
      stlHardwareCapexEtb: 450_000,
      dieselLitersPerHour: 22,
      dieselHoursPerYear: 450,
      dieselPriceEtbPerLiter: 95,
      annualGeneratorMaintEtb: 280_000,
      annualSiteTowerLeaseEtb: 600_000,
      annualStlLinkOpexEtb: 180_000,
      annualBackupPowerEtb: 320_000,
    },
    fm: {
      stlHardwareCapexEtb: 1_850_000,
      dieselLitersPerHour: 9,
      dieselHoursPerYear: 550,
      dieselPriceEtbPerLiter: 95,
      annualGeneratorMaintEtb: 220_000,
      annualSiteTowerLeaseEtb: 900_000,
      annualStlLinkOpexEtb: 720_000,
      annualBackupPowerEtb: 380_000,
    },
  },
  'equal-power': {
    am: {
      stlHardwareCapexEtb: 350_000,
      dieselLitersPerHour: 8,
      dieselHoursPerYear: 400,
      dieselPriceEtbPerLiter: 95,
      annualGeneratorMaintEtb: 160_000,
      annualSiteTowerLeaseEtb: 450_000,
      annualStlLinkOpexEtb: 140_000,
      annualBackupPowerEtb: 200_000,
    },
    fm: {
      stlHardwareCapexEtb: 750_000,
      dieselLitersPerHour: 5.5,
      dieselHoursPerYear: 400,
      dieselPriceEtbPerLiter: 95,
      annualGeneratorMaintEtb: 130_000,
      annualSiteTowerLeaseEtb: 350_000,
      annualStlLinkOpexEtb: 320_000,
      annualBackupPowerEtb: 180_000,
    },
  },
};

const BASIS_PRESETS: Record<
  Exclude<ComparisonBasis, 'custom'>,
  {
    title: string;
    summary: string;
    am: SystemCostInputs;
    fm: SystemCostInputs;
  }
> = {
  'equal-coverage': {
    title: 'Equal Regional Coverage Objective (Illustrative 100 km Corridor)',
    summary:
      'Compares 1 high-power Medium-Wave AM site (50 kW RF / ~85 kW total site load with tall insulated mast and buried copper radials) against a multi-site VHF FM network (3 hilltop 5 kW FM relay sites) sized to cover a comparable regional corridor.',
    am: {
      transmitterCostEtb: 18_500_000,
      antennaTowerCostEtb: 14_000_000,
      installationCostEtb: 4_200_000,
      electricalInfraCostEtb: 6_500_000,
      receiverUnitCostEtb: 1_400,
      receiverQuantity: 1000,
      powerConsumptionKw: 85,
      operatingHoursPerDay: 18,
      electricityTariffEtbPerKwh: 3.5,
      annualMaintenanceEtb: 1_800_000,
      annualPersonnelSiteEtb: 2_400_000,
      annualReplacementOtherEtb: 950_000,
      ...ZERO_OPTIONALS,
    },
    fm: {
      transmitterCostEtb: 15_000_000,
      antennaTowerCostEtb: 11_500_000,
      installationCostEtb: 3_600_000,
      electricalInfraCostEtb: 4_800_000,
      receiverUnitCostEtb: 1_100,
      receiverQuantity: 1000,
      powerConsumptionKw: 30,
      operatingHoursPerDay: 18,
      electricityTariffEtbPerKwh: 3.5,
      annualMaintenanceEtb: 1_400_000,
      annualPersonnelSiteEtb: 2_100_000,
      annualReplacementOtherEtb: 750_000,
      ...ZERO_OPTIONALS,
    },
  },
  'equal-power': {
    title: 'Equal Transmitter Power Rating (Single-Site 10 kW RF Class)',
    summary:
      'Compares a single 10 kW Medium-Wave AM transmitter site against a single 10 kW VHF FM transmitter site at identical RF output power. Isolates antenna/ground-system cost and transmitter wall-plug efficiency.',
    am: {
      transmitterCostEtb: 9_500_000,
      antennaTowerCostEtb: 9_800_000,
      installationCostEtb: 2_600_000,
      electricalInfraCostEtb: 3_200_000,
      receiverUnitCostEtb: 1_400,
      receiverQuantity: 500,
      powerConsumptionKw: 22,
      operatingHoursPerDay: 18,
      electricityTariffEtbPerKwh: 3.5,
      annualMaintenanceEtb: 1_050_000,
      annualPersonnelSiteEtb: 1_500_000,
      annualReplacementOtherEtb: 550_000,
      ...ZERO_OPTIONALS,
    },
    fm: {
      transmitterCostEtb: 6_200_000,
      antennaTowerCostEtb: 4_100_000,
      installationCostEtb: 1_500_000,
      electricalInfraCostEtb: 2_100_000,
      receiverUnitCostEtb: 1_100,
      receiverQuantity: 500,
      powerConsumptionKw: 15,
      operatingHoursPerDay: 18,
      electricityTariffEtbPerKwh: 3.5,
      annualMaintenanceEtb: 650_000,
      annualPersonnelSiteEtb: 1_200_000,
      annualReplacementOtherEtb: 400_000,
      ...ZERO_OPTIONALS,
    },
  },
};

interface YearCashFlow {
  year: number;
  baseOpexEtb: number;
  nominalOpexEtb: number;
  discountedPvOpexEtb: number;
}

function computeSystemTCO(
  c: SystemCostInputs,
  enableInflation: boolean,
  inflationRatePct: number,
  discountRatePct: number
) {
  const receiverCapexEtb = c.receiverUnitCostEtb * c.receiverQuantity;
  const baseCapexEtb =
    c.transmitterCostEtb +
    c.antennaTowerCostEtb +
    c.installationCostEtb +
    c.electricalInfraCostEtb +
    receiverCapexEtb;
  const optionalCapexEtb = c.stlHardwareCapexEtb;
  const totalCapexEtb = baseCapexEtb + optionalCapexEtb;

  const totalBroadcastHoursPerYear = c.operatingHoursPerDay * 365;
  const dieselHoursApplied = Math.min(c.dieselHoursPerYear, totalBroadcastHoursPerYear);
  const gridHoursPerYear = Math.max(0, totalBroadcastHoursPerYear - dieselHoursApplied);
  const annualEnergyKwh = c.powerConsumptionKw * gridHoursPerYear;
  const annualElectricityEtb = annualEnergyKwh * c.electricityTariffEtbPerKwh;
  const baseOtherOpexEtb = c.annualPersonnelSiteEtb + c.annualReplacementOtherEtb;
  const baseAnnualOpexEtb = annualElectricityEtb + c.annualMaintenanceEtb + baseOtherOpexEtb;

  const annualDieselFuelEtb =
    c.dieselLitersPerHour * dieselHoursApplied * c.dieselPriceEtbPerLiter;
  const optionalAnnualOpexEtb =
    annualDieselFuelEtb +
    c.annualGeneratorMaintEtb +
    c.annualSiteTowerLeaseEtb +
    c.annualStlLinkOpexEtb +
    c.annualBackupPowerEtb;

  const totalBaseYearAnnualOpexEtb = baseAnnualOpexEtb + optionalAnnualOpexEtb;
  const baseYearFiveYearOpexEtb = 5 * totalBaseYearAnnualOpexEtb;
  const baseYearFiveYearTcoEtb = totalCapexEtb + baseYearFiveYearOpexEtb;

  const inf = enableInflation ? Math.max(0, inflationRatePct) / 100 : 0;
  const disc = Math.max(0, discountRatePct) / 100;

  const yearlySchedule: YearCashFlow[] = [];
  let nominalFiveYearOpexEtb = 0;
  let discountedFiveYearOpexPvEtb = 0;

  for (let t = 1; t <= 5; t++) {
    const nominalOpexEtb = totalBaseYearAnnualOpexEtb * Math.pow(1 + inf, t);
    const discountedPvOpexEtb = nominalOpexEtb / Math.pow(1 + disc, t);
    nominalFiveYearOpexEtb += nominalOpexEtb;
    discountedFiveYearOpexPvEtb += discountedPvOpexEtb;
    yearlySchedule.push({
      year: t,
      baseOpexEtb: totalBaseYearAnnualOpexEtb,
      nominalOpexEtb,
      discountedPvOpexEtb,
    });
  }

  const nominalFiveYearTcoEtb = totalCapexEtb + nominalFiveYearOpexEtb;
  const discountedFiveYearNpvEtb = totalCapexEtb + discountedFiveYearOpexPvEtb;

  return {
    receiverCapexEtb,
    baseCapexEtb,
    optionalCapexEtb,
    totalCapexEtb,
    totalBroadcastHoursPerYear,
    gridHoursPerYear,
    dieselHoursApplied,
    annualEnergyKwh,
    annualElectricityEtb,
    baseOtherOpexEtb,
    baseAnnualOpexEtb,
    annualDieselFuelEtb,
    optionalAnnualOpexEtb,
    totalBaseYearAnnualOpexEtb,
    baseYearFiveYearOpexEtb,
    baseYearFiveYearTcoEtb,
    nominalFiveYearOpexEtb,
    nominalFiveYearTcoEtb,
    discountedFiveYearOpexPvEtb,
    discountedFiveYearNpvEtb,
    yearlySchedule,
  };
}

const fmtEtb = (val: number) => `${Math.round(val).toLocaleString('en-US')} ETB`;
const fmtM = (val: number) => `${(val / 1_000_000).toFixed(2)}M`;

export const CostTCOSection: React.FC = () => {
  const [basis, setBasis] = useState<ComparisonBasis>('equal-coverage');
  const [amCosts, setAmCosts] = useState<SystemCostInputs>(BASIS_PRESETS['equal-coverage'].am);
  const [fmCosts, setFmCosts] = useState<SystemCostInputs>(BASIS_PRESETS['equal-coverage'].fm);
  const [enableInflation, setEnableInflation] = useState<boolean>(true);
  const [inflationRatePct, setInflationRatePct] = useState<number>(12.0);
  const [discountRatePct, setDiscountRatePct] = useState<number>(10.0);
  const [quoteSourceNote, setQuoteSourceNote] = useState<string>(
    'Illustrative ETB engineering planning estimates (replace with verified EEU tariff circular / vendor quote reference if submitting procurement figures).'
  );

  const selectBasis = (nextBasis: Exclude<ComparisonBasis, 'custom'>) => {
    setBasis(nextBasis);
    setAmCosts({ ...BASIS_PRESETS[nextBasis].am });
    setFmCosts({ ...BASIS_PRESETS[nextBasis].fm });
  };

  const applyOptionalScenario = (includeOptionals: boolean) => {
    const activePresetKey: Exclude<ComparisonBasis, 'custom'> =
      basis === 'equal-power' ? 'equal-power' : 'equal-coverage';
    const optSet = includeOptionals
      ? ILLUSTRATIVE_OPTIONALS[activePresetKey]
      : { am: ZERO_OPTIONALS, fm: ZERO_OPTIONALS };
    setAmCosts((prev) => ({ ...prev, ...optSet.am }));
    setFmCosts((prev) => ({ ...prev, ...optSet.fm }));
  };

  const updateField = (
    system: 'am' | 'fm',
    field: keyof SystemCostInputs,
    rawVal: string
  ) => {
    const num = Math.max(0, parseFloat(rawVal) || 0);
    setBasis('custom');
    if (system === 'am') {
      setAmCosts((prev) => ({ ...prev, [field]: num }));
    } else {
      setFmCosts((prev) => ({ ...prev, [field]: num }));
    }
  };

  const amCalc = useMemo(
    () => computeSystemTCO(amCosts, enableInflation, inflationRatePct, discountRatePct),
    [amCosts, enableInflation, inflationRatePct, discountRatePct]
  );
  const fmCalc = useMemo(
    () => computeSystemTCO(fmCosts, enableInflation, inflationRatePct, discountRatePct),
    [fmCosts, enableInflation, inflationRatePct, discountRatePct]
  );

  const nominalDiffEtb = amCalc.nominalFiveYearTcoEtb - fmCalc.nominalFiveYearTcoEtb;
  const npvDiffEtb = amCalc.discountedFiveYearNpvEtb - fmCalc.discountedFiveYearNpvEtb;
  const avgNominal = (amCalc.nominalFiveYearTcoEtb + fmCalc.nominalFiveYearTcoEtb) / 2 || 1;
  const nominalPctDiff = (Math.abs(nominalDiffEtb) / avgNominal) * 100;
  const lowerNominalSystem =
    nominalDiffEtb > 0 ? 'FM' : nominalDiffEtb < 0 ? 'AM' : 'Equal';
  const lowerNpvSystem = npvDiffEtb > 0 ? 'FM' : npvDiffEtb < 0 ? 'AM' : 'Equal';

  const chartData = [
    {
      system: 'AM (Base-Year)',
      'Total CAPEX': Math.round((amCalc.totalCapexEtb / 1_000_000) * 100) / 100,
      '5-Yr Electricity': Math.round(((amCalc.annualElectricityEtb * 5) / 1_000_000) * 100) / 100,
      '5-Yr Base Maint & Staff':
        Math.round((((amCosts.annualMaintenanceEtb + amCalc.baseOtherOpexEtb) * 5) / 1_000_000) * 100) / 100,
      '5-Yr Optional Add-Ons': Math.round(((amCalc.optionalAnnualOpexEtb * 5) / 1_000_000) * 100) / 100,
    },
    {
      system: 'FM (Base-Year)',
      'Total CAPEX': Math.round((fmCalc.totalCapexEtb / 1_000_000) * 100) / 100,
      '5-Yr Electricity': Math.round(((fmCalc.annualElectricityEtb * 5) / 1_000_000) * 100) / 100,
      '5-Yr Base Maint & Staff':
        Math.round((((fmCosts.annualMaintenanceEtb + fmCalc.baseOtherOpexEtb) * 5) / 1_000_000) * 100) / 100,
      '5-Yr Optional Add-Ons': Math.round(((fmCalc.optionalAnnualOpexEtb * 5) / 1_000_000) * 100) / 100,
    },
  ];

  const comparisonBarData = [
    {
      basis: 'Base-Year TCO',
      AM: Math.round((amCalc.baseYearFiveYearTcoEtb / 1_000_000) * 100) / 100,
      FM: Math.round((fmCalc.baseYearFiveYearTcoEtb / 1_000_000) * 100) / 100,
    },
    {
      basis: 'Nominal TCO',
      AM: Math.round((amCalc.nominalFiveYearTcoEtb / 1_000_000) * 100) / 100,
      FM: Math.round((fmCalc.nominalFiveYearTcoEtb / 1_000_000) * 100) / 100,
    },
    {
      basis: 'Discounted NPV',
      AM: Math.round((amCalc.discountedFiveYearNpvEtb / 1_000_000) * 100) / 100,
      FM: Math.round((fmCalc.discountedFiveYearNpvEtb / 1_000_000) * 100) / 100,
    },
  ];

  const baseInputRows: {
    key: keyof SystemCostInputs;
    label: string;
    group: 'CAPEX' | 'OPEX';
    unit: string;
    step?: number;
  }[] = [
    { key: 'transmitterCostEtb', label: 'Transmitter Purchase', group: 'CAPEX', unit: 'ETB', step: 100000 },
    { key: 'antennaTowerCostEtb', label: 'Antenna, Tower & Civil/Ground Radials', group: 'CAPEX', unit: 'ETB', step: 100000 },
    { key: 'installationCostEtb', label: 'Installation & Commissioning', group: 'CAPEX', unit: 'ETB', step: 50000 },
    { key: 'electricalInfraCostEtb', label: 'Initial Electrical Infrastructure (Substation/Switchgear)', group: 'CAPEX', unit: 'ETB', step: 50000 },
    { key: 'receiverUnitCostEtb', label: 'Subsidized Receiver Unit Cost', group: 'CAPEX', unit: 'ETB', step: 50 },
    { key: 'receiverQuantity', label: 'Receiver Distribution Quantity', group: 'CAPEX', unit: 'units', step: 50 },
    { key: 'powerConsumptionKw', label: 'Total Site Electrical Power Draw', group: 'OPEX', unit: 'kW', step: 1 },
    { key: 'operatingHoursPerDay', label: 'Daily Broadcast Hours', group: 'OPEX', unit: 'hr/day', step: 1 },
    { key: 'electricityTariffEtbPerKwh', label: 'Grid Electricity Tariff', group: 'OPEX', unit: 'ETB/kWh', step: 0.25 },
    { key: 'annualMaintenanceEtb', label: 'Annual Routine RF & Tower Maintenance', group: 'OPEX', unit: 'ETB/yr', step: 50000 },
    { key: 'annualPersonnelSiteEtb', label: 'Annual Technical Personnel & Core Site Ops', group: 'OPEX', unit: 'ETB/yr', step: 50000 },
    { key: 'annualReplacementOtherEtb', label: 'Annual Equipment Replacement & Spares Reserve', group: 'OPEX', unit: 'ETB/yr', step: 50000 },
  ];

  const optionalInputRows: {
    key: keyof SystemCostInputs;
    label: string;
    group: 'OPT CAPEX' | 'OPT OPEX' | 'DIESEL';
    unit: string;
    step?: number;
    note: string;
  }[] = [
    {
      key: 'stlHardwareCapexEtb',
      label: 'FM/AM Studio-to-Transmitter Link (STL) Terminal CAPEX',
      group: 'OPT CAPEX',
      unit: 'ETB',
      step: 50000,
      note: 'Dedicated microwave/IP STL hardware (not in Transmitter Purchase)',
    },
    {
      key: 'annualStlLinkOpexEtb',
      label: 'Annual Studio-to-Transmitter Link (STL) Lease / Licensing',
      group: 'OPT OPEX',
      unit: 'ETB/yr',
      step: 20000,
      note: 'Microwave spectrum or fiber lease for remote hilltop FM/AM feeds',
    },
    {
      key: 'annualSiteTowerLeaseEtb',
      label: 'Annual Site & Tower Land / Rooftop Leasing',
      group: 'OPT OPEX',
      unit: 'ETB/yr',
      step: 50000,
      note: 'Land/tower rent only (distinct from personnel OpEx)',
    },
    {
      key: 'dieselLitersPerHour',
      label: 'Diesel Generator Fuel Burn Rate',
      group: 'DIESEL',
      unit: 'L/hr',
      step: 0.5,
      note: 'Fuel burn rate during grid outages',
    },
    {
      key: 'dieselHoursPerYear',
      label: 'Annual Backup Diesel Run Hours',
      group: 'DIESEL',
      unit: 'hr/yr',
      step: 25,
      note: 'Subtracted from annual broadcast hours so grid & diesel never double-count',
    },
    {
      key: 'dieselPriceEtbPerLiter',
      label: 'Diesel Fuel Price',
      group: 'DIESEL',
      unit: 'ETB/L',
      step: 5,
      note: 'Illustrative pump/delivered fuel assumption',
    },
    {
      key: 'annualGeneratorMaintEtb',
      label: 'Annual Diesel Generator Maintenance & Overhaul',
      group: 'OPT OPEX',
      unit: 'ETB/yr',
      step: 20000,
      note: 'Engine oil, filters & servicing (distinct from RF/tower maint)',
    },
    {
      key: 'annualBackupPowerEtb',
      label: 'Annual Additional Backup-Power Expenses (Battery/UPS/Solar)',
      group: 'OPT OPEX',
      unit: 'ETB/yr',
      step: 20000,
      note: 'Battery bank replacement reserve / rectifier / solar upkeep',
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="CAPEX, OPEX, and Five-Year Total Cost of Ownership (ETB)"
        subtitle="Interactive Ethiopian Birr economic engineering model distinguishing Base-Year constant-price TCO, Inflation-Adjusted Nominal 5-year TCO, and Discounted Present-Value NPV."
      />

      <WarningNotice tone="amber" title="Illustrative Ethiopian Birr (ETB) Assumptions Notice">
        <p>
          All pre-loaded ETB unit prices, tariffs, diesel rates, and inflation/discount assumptions are illustrative engineering planning estimates—NOT verified vendor quotations or official Ethiopian procurement bids. Optional add-on items do not double-count base fields and start at 0 ETB until edited or loaded via the optional baseline button.
        </p>
        <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-[11px] opacity-95">
          <li>Actual hardware and civil costs vary by supplier, terrain location, and procurement year; imported RF equipment incurs additional international freight, customs, and foreign-currency conversion costs.</li>
          <li>Consumer or subsidized receiver distribution may be funded as a separate public-information program expense rather than broadcaster CAPEX (set Receiver Quantity to 0 to exclude).</li>
          <li>The 100 km regional corridor is an illustrative planning objective; comparing one 50 kW MW AM site against three 5 kW VHF FM sites is <strong>not</strong> proof of equal geographical RF coverage.</li>
        </ul>
      </WarningNotice>

      {/* Engineering Basis + Financial Assumptions Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-200">
              Defined Engineering Comparison Basis
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectBasis('equal-coverage')}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                  basis === 'equal-coverage'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                    : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Equal Regional Coverage Objective
              </button>
              <button
                type="button"
                onClick={() => selectBasis('equal-power')}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                  basis === 'equal-power'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                    : 'bg-[#080D16] border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Equal Transmitter Power (10 kW)
              </button>
              {basis === 'custom' && (
                <span className="px-3 py-1.5 rounded text-xs font-mono bg-amber-500/15 border border-amber-500/40 text-amber-300">
                  Custom User Inputs Active
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {basis === 'custom'
              ? 'Custom user-edited CAPEX/OPEX scenario. Select a preset button above to reload Equal Regional Coverage or Equal Transmitter Power baselines.'
              : BASIS_PRESETS[basis].summary}
          </p>
          <label className="block pt-1 text-[11px] text-slate-400 space-y-1">
            <span>Tariff / Vendor Quote Source &amp; Assumption Note (Editable for Documentation):</span>
            <input
              type="text"
              value={quoteSourceNote}
              onChange={(e) => setQuoteSourceNote(e.target.value)}
              className="w-full bg-[#080D16] border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </label>
        </div>

        {/* Inflation & Discount Rate Financial Assumptions */}
        <div className="lg:col-span-5 bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-200">
              5-Year Macroeconomic Assumptions (Nominal & NPV)
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={enableInflation}
                onChange={(e) => setEnableInflation(e.target.checked)}
                className="accent-cyan-400 w-3.5 h-3.5"
              />
              <span>Apply Inflation</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className={`space-y-1 ${!enableInflation ? 'opacity-50' : ''}`}>
              <span className="text-slate-400 block">Annual Inflation Rate (i, %)</span>
              <input
                type="number"
                min={0}
                max={60}
                step={0.5}
                disabled={!enableInflation}
                value={inflationRatePct}
                onChange={(e) => setInflationRatePct(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-[#080D16] border border-slate-700 rounded px-2.5 py-1.5 font-mono tabular-nums text-amber-200 focus:outline-none focus:border-amber-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-slate-400 block">Discount Rate (r, %)</span>
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={discountRatePct}
                onChange={(e) => setDiscountRatePct(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-[#080D16] border border-slate-700 rounded px-2.5 py-1.5 font-mono tabular-nums text-emerald-200 focus:outline-none focus:border-emerald-400"
              />
            </label>
          </div>
          <p className="text-[11px] text-slate-500 font-mono">
            OPEX_nom(t) = Base · (1 + i)^t | NPV = CAPEX + Σ OPEX_nom(t)/(1 + r)^t
          </p>
        </div>
      </div>

      {/* Primary 5-Year Economic Summary Cards (Clearly Distinguishing Base vs Nominal vs PV/NPV) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="AM 5-Yr TCO (Nominal)"
          value={fmtM(amCalc.nominalFiveYearTcoEtb)}
          unit="ETB"
          sublabel={`Base: ${fmtM(amCalc.baseYearFiveYearTcoEtb)} | NPV: ${fmtM(amCalc.discountedFiveYearNpvEtb)}`}
          tone="blue"
        />
        <MetricCard
          label="FM 5-Yr TCO (Nominal)"
          value={fmtM(fmCalc.nominalFiveYearTcoEtb)}
          unit="ETB"
          sublabel={`Base: ${fmtM(fmCalc.baseYearFiveYearTcoEtb)} | NPV: ${fmtM(fmCalc.discountedFiveYearNpvEtb)}`}
          tone="cyan"
        />
        <MetricCard
          label="Nominal 5-Yr Cost Difference"
          value={fmtM(Math.abs(nominalDiffEtb))}
          unit="ETB"
          sublabel={
            lowerNominalSystem === 'Equal'
              ? 'AM and FM Nominal TCO equal'
              : `${lowerNominalSystem} saves ${nominalPctDiff.toFixed(1)}% nominal`
          }
          tone="emerald"
        />
        <MetricCard
          label="Discounted Present-Value (NPV) Diff"
          value={fmtM(Math.abs(npvDiffEtb))}
          unit="ETB"
          sublabel={
            lowerNpvSystem === 'Equal'
              ? 'AM and FM NPV equal'
              : `${lowerNpvSystem} lower PV by ${fmtEtb(Math.abs(npvDiffEtb))}`
          }
          tone="amber"
        />
      </div>

      {/* Editable Core ETB Input Table */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-3">
          Core Editable Ethiopian Birr (ETB) CAPEX & Base-Year OPEX Parameters
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 font-medium">Cost / Engineering Line Item</th>
                <th className="py-2 pr-3 font-medium text-blue-400">AM System</th>
                <th className="py-2 pr-3 font-medium text-cyan-400">FM System</th>
                <th className="py-2 font-medium">Unit</th>
              </tr>
            </thead>
            <tbody>
              {baseInputRows.map((row) => (
                <tr key={row.key} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-mono text-[11px] text-slate-400">{row.group}</td>
                  <td className="py-2 pr-3 text-slate-200">{row.label}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={0}
                      step={row.step ?? 1}
                      value={amCosts[row.key]}
                      onChange={(e) => updateField('am', row.key, e.target.value)}
                      className="w-36 bg-[#080D16] border border-slate-700 rounded px-2.5 py-1 font-mono tabular-nums text-blue-200 focus:outline-none focus:border-blue-400"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={0}
                      step={row.step ?? 1}
                      value={fmCosts[row.key]}
                      onChange={(e) => updateField('fm', row.key, e.target.value)}
                      className="w-36 bg-[#080D16] border border-slate-700 rounded px-2.5 py-1 font-mono tabular-nums text-cyan-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>
                  <td className="py-2 font-mono text-slate-400">{row.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optional Non-Overlapping Site, Diesel, Leasing, STL & Backup Inputs */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Optional Ethiopian Site Add-Ons (Diesel Backup, Tower Lease, FM STL, Additional Backup Power)
            </h2>
            <p className="text-[11px] text-slate-400">
              Kept separate from core fields above to prevent double-counting. All values are illustrative assumptions and default to 0 until loaded or edited.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyOptionalScenario(true)}
              className="px-3 py-1.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-200 text-xs font-medium whitespace-nowrap"
            >
              Load Illustrative Optional Add-Ons
            </button>
            <button
              type="button"
              onClick={() => applyOptionalScenario(false)}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium whitespace-nowrap"
            >
              Zero Optional Add-Ons
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Optional Line Item</th>
                <th className="py-2 pr-3 font-medium text-blue-400">AM System</th>
                <th className="py-2 pr-3 font-medium text-cyan-400">FM System</th>
                <th className="py-2 pr-3 font-medium">Unit</th>
                <th className="py-2 font-medium">Scope Note (No Double Counting)</th>
              </tr>
            </thead>
            <tbody>
              {optionalInputRows.map((row) => (
                <tr key={row.key} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-mono text-[11px] text-amber-300">{row.group}</td>
                  <td className="py-2 pr-3 text-slate-200">{row.label}</td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={0}
                      step={row.step ?? 1}
                      value={amCosts[row.key]}
                      onChange={(e) => updateField('am', row.key, e.target.value)}
                      className="w-32 bg-[#080D16] border border-slate-700 rounded px-2.5 py-1 font-mono tabular-nums text-blue-200 focus:outline-none focus:border-blue-400"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min={0}
                      step={row.step ?? 1}
                      value={fmCosts[row.key]}
                      onChange={(e) => updateField('fm', row.key, e.target.value)}
                      className="w-32 bg-[#080D16] border border-slate-700 rounded px-2.5 py-1 font-mono tabular-nums text-cyan-200 focus:outline-none focus:border-cyan-400"
                    />
                  </td>
                  <td className="py-2 pr-3 font-mono text-slate-400">{row.unit}</td>
                  <td className="py-2 text-[11px] text-slate-400">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculated Financial Breakdown + Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7 bg-[#0D131F] border border-slate-800 rounded-md p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-3">
            Calculated Cost Summary (Base-Year vs Inflation-Adjusted Nominal vs Present-Value NPV)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono tabular-nums">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-sans">
                  <th className="py-2 pr-3 font-medium">Calculated Metric</th>
                  <th className="py-2 pr-3 font-medium text-blue-400">AM System</th>
                  <th className="py-2 font-medium text-cyan-400">FM System</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-300">Receiver Equipment Subtotal</td>
                  <td className="py-2 pr-3 text-blue-300">{fmtEtb(amCalc.receiverCapexEtb)}</td>
                  <td className="py-2 text-cyan-300">{fmtEtb(fmCalc.receiverCapexEtb)}</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-300">Optional STL Terminal CAPEX</td>
                  <td className="py-2 pr-3 text-blue-300">{fmtEtb(amCalc.optionalCapexEtb)}</td>
                  <td className="py-2 text-cyan-300">{fmtEtb(fmCalc.optionalCapexEtb)}</td>
                </tr>
                <tr className="border-b border-slate-800/60 font-semibold">
                  <td className="py-2 pr-3 font-sans text-slate-100">Total Initial CAPEX (Year 0)</td>
                  <td className="py-2 pr-3 text-blue-300">{fmtEtb(amCalc.totalCapexEtb)}</td>
                  <td className="py-2 text-cyan-300">{fmtEtb(fmCalc.totalCapexEtb)}</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-300">
                    Net Grid Hours &amp; Energy ((Broadcast − Diesel) × kW)
                  </td>
                  <td className="py-2 pr-3">
                    {Math.round(amCalc.gridHoursPerYear).toLocaleString()} hr ·{' '}
                    {Math.round(amCalc.annualEnergyKwh).toLocaleString()} kWh
                  </td>
                  <td className="py-2">
                    {Math.round(fmCalc.gridHoursPerYear).toLocaleString()} hr ·{' '}
                    {Math.round(fmCalc.annualEnergyKwh).toLocaleString()} kWh
                  </td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-300">Base Annual Grid Electricity Cost (Net Grid Hours)</td>
                  <td className="py-2 pr-3 text-blue-300">{fmtEtb(amCalc.annualElectricityEtb)}</td>
                  <td className="py-2 text-cyan-300">{fmtEtb(fmCalc.annualElectricityEtb)}</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-300">Optional Annual Diesel Fuel Cost</td>
                  <td className="py-2 pr-3 text-amber-300">{fmtEtb(amCalc.annualDieselFuelEtb)}</td>
                  <td className="py-2 text-amber-300">{fmtEtb(fmCalc.annualDieselFuelEtb)}</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-300">Optional Lease / STL / Gen Maint / Backup OPEX</td>
                  <td className="py-2 pr-3 text-amber-300">
                    {fmtEtb(amCalc.optionalAnnualOpexEtb - amCalc.annualDieselFuelEtb)}
                  </td>
                  <td className="py-2 text-amber-300">
                    {fmtEtb(fmCalc.optionalAnnualOpexEtb - fmCalc.annualDieselFuelEtb)}
                  </td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-200">Base-Year Total Annual OPEX</td>
                  <td className="py-2 pr-3 text-blue-300">{fmtEtb(amCalc.totalBaseYearAnnualOpexEtb)}</td>
                  <td className="py-2 text-cyan-300">{fmtEtb(fmCalc.totalBaseYearAnnualOpexEtb)}</td>
                </tr>
                <tr className="border-b border-slate-800/60">
                  <td className="py-2 pr-3 font-sans text-slate-200">Base-Year 5-Yr TCO (Constant Prices)</td>
                  <td className="py-2 pr-3 text-slate-200">{fmtEtb(amCalc.baseYearFiveYearTcoEtb)}</td>
                  <td className="py-2 text-slate-200">{fmtEtb(fmCalc.baseYearFiveYearTcoEtb)}</td>
                </tr>
                <tr className="border-b border-slate-800/60 bg-[#080D16] font-semibold">
                  <td className="py-2.5 pr-3 font-sans text-amber-200">
                    Nominal 5-Yr TCO ({enableInflation ? `${inflationRatePct}%/yr inflation` : '0% inflation'})
                  </td>
                  <td className="py-2.5 pr-3 text-blue-300">{fmtEtb(amCalc.nominalFiveYearTcoEtb)}</td>
                  <td className="py-2.5 text-cyan-300">{fmtEtb(fmCalc.nominalFiveYearTcoEtb)}</td>
                </tr>
                <tr className="bg-[#080D16] font-semibold">
                  <td className="py-2.5 pr-3 font-sans text-emerald-200">
                    Discounted 5-Yr Present-Value TCO (NPV @ r = {discountRatePct}%)
                  </td>
                  <td className="py-2.5 pr-3 text-blue-300">{fmtEtb(amCalc.discountedFiveYearNpvEtb)}</td>
                  <td className="py-2.5 text-cyan-300">{fmtEtb(fmCalc.discountedFiveYearNpvEtb)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#0D131F] border border-slate-800 rounded-md p-4 flex flex-col space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 mb-1">
              Base-Year Cost Stack (Million ETB)
            </h2>
            <p className="text-xs text-slate-400 mb-2">
              Initial CAPEX versus 5-year unescalated electricity, core maintenance/staff, and optional site add-ons.
            </p>
            <div className="h-52 w-full bg-[#080D16] border border-slate-800 rounded p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
                  <CartesianGrid stroke="#182234" strokeDasharray="3 3" />
                  <XAxis dataKey="system" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${v}M`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131F',
                      borderColor: '#334155',
                      fontSize: '11px',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    formatter={(val, name) => [`${Number(val ?? 0).toFixed(2)}M ETB`, String(name ?? '')]}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Total CAPEX" stackId="tco" fill="#3B82F6" />
                  <Bar dataKey="5-Yr Electricity" stackId="tco" fill="#F59E0B" />
                  <Bar dataKey="5-Yr Base Maint & Staff" stackId="tco" fill="#06B6D4" />
                  <Bar dataKey="5-Yr Optional Add-Ons" stackId="tco" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">
              Base-Year vs Nominal vs Present-Value (NPV) Comparison
            </h3>
            <div className="h-44 w-full bg-[#080D16] border border-slate-800 rounded p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonBarData} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
                  <CartesianGrid stroke="#182234" strokeDasharray="3 3" />
                  <XAxis dataKey="basis" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `${v}M`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131F',
                      borderColor: '#334155',
                      fontSize: '11px',
                      fontFamily: 'IBM Plex Mono, monospace',
                    }}
                    formatter={(val, name) => [`${Number(val ?? 0).toFixed(2)}M ETB`, String(name ?? '')]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="AM" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="FM" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Year-by-Year 5-Year OPEX Schedule */}
      <div className="bg-[#0D131F] border border-slate-800 rounded-md p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-2">
          Year-by-Year 5-Year OPEX Schedule (Base-Year vs Nominal vs Discounted PV)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left font-mono tabular-nums">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans">
                <th className="py-2 pr-3 font-medium">Year (t)</th>
                <th className="py-2 pr-3 font-medium text-blue-400">AM Base OPEX</th>
                <th className="py-2 pr-3 font-medium text-blue-300">AM Nominal OPEX</th>
                <th className="py-2 pr-3 font-medium text-blue-200">AM PV OPEX</th>
                <th className="py-2 pr-3 font-medium text-cyan-400">FM Base OPEX</th>
                <th className="py-2 pr-3 font-medium text-cyan-300">FM Nominal OPEX</th>
                <th className="py-2 font-medium text-cyan-200">FM PV OPEX</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {amCalc.yearlySchedule.map((row, idx) => {
                const fmRow = fmCalc.yearlySchedule[idx];
                return (
                  <tr key={row.year} className="border-b border-slate-800/60">
                    <td className="py-2 pr-3 font-sans font-medium">Year {row.year}</td>
                    <td className="py-2 pr-3">{fmtEtb(row.baseOpexEtb)}</td>
                    <td className="py-2 pr-3 text-blue-300">{fmtEtb(row.nominalOpexEtb)}</td>
                    <td className="py-2 pr-3 text-emerald-300">{fmtEtb(row.discountedPvOpexEtb)}</td>
                    <td className="py-2 pr-3">{fmtEtb(fmRow.baseOpexEtb)}</td>
                    <td className="py-2 pr-3 text-cyan-300">{fmtEtb(fmRow.nominalOpexEtb)}</td>
                    <td className="py-2 text-emerald-300">{fmtEtb(fmRow.discountedPvOpexEtb)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
