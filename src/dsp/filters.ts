export interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export function applyBiquad(input: Float64Array, c: BiquadCoeffs): Float64Array {
  const n = input.length;
  const output = new Float64Array(n);
  let z1 = 0;
  let z2 = 0;
  const { b0, b1, b2, a1, a2 } = c;

  for (let i = 0; i < n; i++) {
    const x = input[i];
    const y = b0 * x + z1;
    z1 = b1 * x - a1 * y + z2;
    z2 = b2 * x - a2 * y;
    output[i] = y;
  }
  return output;
}

export function makeLowpassBiquad(cutoffHz: number, fs: number, q: number): BiquadCoeffs {
  const safeCutoff = Math.max(10, Math.min(cutoffHz, 0.45 * fs));
  const w0 = (2 * Math.PI * safeCutoff) / fs;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * q);

  const a0 = 1 + alpha;
  return {
    b0: ((1 - cosW0) / 2) / a0,
    b1: (1 - cosW0) / a0,
    b2: ((1 - cosW0) / 2) / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

export function makeBandpassBiquad(centerHz: number, fs: number, q: number): BiquadCoeffs {
  const safeCenter = Math.max(100, Math.min(centerHz, 0.45 * fs));
  const w0 = (2 * Math.PI * safeCenter) / fs;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const safeQ = Math.max(0.3, q);
  const alpha = sinW0 / (2 * safeQ);

  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

export function butterworthLPF4(input: Float64Array, cutoffHz: number, fs: number): Float64Array {
  const q1 = 0.5411961;
  const q2 = 1.3065630;
  const stage1 = applyBiquad(input, makeLowpassBiquad(cutoffHz, fs, q1));
  return applyBiquad(stage1, makeLowpassBiquad(cutoffHz, fs, q2));
}

export function bandpassFilter6(
  input: Float64Array,
  centerHz: number,
  bandwidthHz: number,
  fs: number
): Float64Array {
  const safeBw = Math.max(1000, Math.min(bandwidthHz, 0.8 * fs));
  const qStage = (centerHz / safeBw) * Math.sqrt(Math.pow(2, 1 / 3) - 1);
  const coeffs = makeBandpassBiquad(centerHz, fs, qStage);

  const s1 = applyBiquad(input, coeffs);
  const s2 = applyBiquad(s1, coeffs);
  return applyBiquad(s2, coeffs);
}

/**
 * Matched 1st-order broadcast FM Pre-Emphasis / De-Emphasis bilinear filters.
 * H_pre(s) = (1 + s*tau1) / (1 + s*tau2), where tau2 = tau1 / 10 (shelf above audio band).
 * H_de(s)  = (1 + s*tau2) / (1 + s*tau1) is its exact algebraic inverse.
 */
function applyFirstOrderIIR(
  input: Float64Array,
  b0: number,
  b1: number,
  a1: number
): Float64Array {
  const n = input.length;
  const out = new Float64Array(n);
  if (n === 0) return out;
  let xPrev = input[0];
  let yPrev = input[0];
  for (let i = 0; i < n; i++) {
    const x = input[i];
    const y = b0 * x + b1 * xPrev - a1 * yPrev;
    out[i] = y;
    xPrev = x;
    yPrev = y;
  }
  return out;
}

export function applyPreEmphasis(input: Float64Array, tauUs: number, fs: number): Float64Array {
  if (tauUs <= 0) return input;
  const tau1 = tauUs * 1e-6;
  const tau2 = tau1 * 0.1;
  const k = 2 * fs;
  const den = 1 + k * tau2;
  const b0 = (1 + k * tau1) / den;
  const b1 = (1 - k * tau1) / den;
  const a1 = (1 - k * tau2) / den;
  return applyFirstOrderIIR(input, b0, b1, a1);
}

export function applyDeEmphasis(input: Float64Array, tauUs: number, fs: number): Float64Array {
  if (tauUs <= 0) return input;
  const tau1 = tauUs * 1e-6;
  const tau2 = tau1 * 0.1;
  const k = 2 * fs;
  const den = 1 + k * tau1;
  const b0 = (1 + k * tau2) / den;
  const b1 = (1 - k * tau2) / den;
  const a1 = (1 - k * tau1) / den;
  return applyFirstOrderIIR(input, b0, b1, a1);
}
