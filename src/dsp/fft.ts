import { SpectrumData } from '../types/simulation';

/**
 * In-place iterative Radix-2 Cooley-Tukey FFT.
 */
export function fftRadix2(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if (n <= 1) return;

  let j = 0;
  for (let i = 0; i < n; i++) {
    if (i < j) {
      const tr = re[i];
      const ti = im[i];
      re[i] = re[j];
      im[i] = im[j];
      re[j] = tr;
      im[j] = ti;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    const wStepRe = Math.cos(angleStep);
    const wStepIm = Math.sin(angleStep);

    for (let start = 0; start < n; start += size) {
      let wRe = 1.0;
      let wIm = 0.0;
      for (let k = 0; k < half; k++) {
        const evenIdx = start + k;
        const oddIdx = evenIdx + half;
        const tRe = wRe * re[oddIdx] - wIm * im[oddIdx];
        const tIm = wRe * im[oddIdx] + wIm * re[oddIdx];

        re[oddIdx] = re[evenIdx] - tRe;
        im[oddIdx] = im[evenIdx] - tIm;
        re[evenIdx] += tRe;
        im[evenIdx] += tIm;

        const nextWRe = wRe * wStepRe - wIm * wStepIm;
        wIm = wRe * wStepIm + wIm * wStepRe;
        wRe = nextWRe;
      }
    }
  }
}

/**
 * Computes single-sided Hann-windowed FFT spectrum and occupied bandwidth metrics.
 */
export function computeSpectrum(
  signal: Float64Array,
  fs: number,
  minFftSize = 16384
): SpectrumData {
  const nSig = signal.length;
  let fftSize = 1;
  while (fftSize < Math.max(nSig, minFftSize)) {
    fftSize <<= 1;
  }
  if (fftSize > 32768) {
    fftSize = 32768;
  }

  const useLen = Math.min(nSig, fftSize);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);

  let windowSum = 0;
  for (let i = 0; i < useLen; i++) {
    const w = useLen > 1 ? 0.5 * (1 - Math.cos((2 * Math.PI * i) / (useLen - 1))) : 1;
    re[i] = signal[i] * w;
    windowSum += w;
  }

  fftRadix2(re, im);

  const numBins = fftSize >> 1;
  const frequenciesKHz = new Float64Array(numBins);
  const magnitudeV = new Float64Array(numBins);
  const powerDb = new Float64Array(numBins);
  const binResolutionHz = fs / fftSize;
  const scale = windowSum > 0 ? 2.0 / windowSum : 1.0;

  let peakMag = -1;
  let peakIdx = 0;
  let totalPower = 0;

  for (let k = 0; k < numBins; k++) {
    frequenciesKHz[k] = (k * binResolutionHz) / 1000;
    const rawMag = Math.hypot(re[k], im[k]);
    const mag = k === 0 ? rawMag / (windowSum || 1) : rawMag * scale;
    magnitudeV[k] = mag;
    // Power referenced to 1 Ohm (V^2 / 2 for sinusoid peak mag)
    const pBin = k === 0 ? mag * mag : 0.5 * mag * mag;
    powerDb[k] = 10 * Math.log10(Math.max(pBin, 1e-14));

    if (k > 0) {
      totalPower += pBin;
      if (mag > peakMag) {
        peakMag = mag;
        peakIdx = k;
      }
    }
  }

  const peakPowerDb = powerDb[peakIdx] ?? -120;

  // 98%-power occupied bandwidth centered around spectral centroid / peak
  let weightedFreqSum = 0;
  for (let k = 1; k < numBins; k++) {
    const p = 0.5 * magnitudeV[k] * magnitudeV[k];
    weightedFreqSum += k * p;
  }
  const centroidBin = totalPower > 0 ? Math.round(weightedFreqSum / totalPower) : peakIdx;

  let occupiedBw98Hz = 0;
  if (totalPower > 0) {
    let left = centroidBin;
    let right = centroidBin;
    let accPower = 0.5 * magnitudeV[centroidBin] * magnitudeV[centroidBin];
    const targetPower = 0.98 * totalPower;

    while (accPower < targetPower && (left > 1 || right < numBins - 1)) {
      const pLeft = left > 1 ? 0.5 * magnitudeV[left - 1] * magnitudeV[left - 1] : -1;
      const pRight = right < numBins - 1 ? 0.5 * magnitudeV[right + 1] * magnitudeV[right + 1] : -1;
      if (pLeft >= pRight && left > 1) {
        left--;
        accPower += pLeft;
      } else if (right < numBins - 1) {
        right++;
        accPower += pRight;
      } else {
        break;
      }
    }
    occupiedBw98Hz = (right - left) * binResolutionHz;
  }

  // -20 dB bandwidth relative to peak spectral bin
  const thresholdDb = peakPowerDb - 20;
  let lowBin20 = peakIdx;
  let highBin20 = peakIdx;
  for (let k = 1; k < numBins; k++) {
    if (powerDb[k] >= thresholdDb) {
      lowBin20 = k;
      break;
    }
  }
  for (let k = numBins - 1; k >= 1; k--) {
    if (powerDb[k] >= thresholdDb) {
      highBin20 = k;
      break;
    }
  }
  const bwMinus20DbHz = Math.max(0, (highBin20 - lowBin20) * binResolutionHz);

  return {
    frequenciesKHz,
    magnitudeV,
    powerDb,
    peakFreqKHz: frequenciesKHz[peakIdx] ?? 0,
    peakPowerDb,
    occupiedBw98Hz,
    bwMinus20DbHz,
    fftSize,
    binResolutionHz,
  };
}
