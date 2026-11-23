export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = (Math.floor(seed) >>> 0) || 1;
  }

  nextUniform(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextGaussian(): number {
    let u1 = this.nextUniform();
    const u2 = this.nextUniform();
    if (u1 < 1e-12) u1 = 1e-12;
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  generateUnitGaussianVector(length: number): Float64Array {
    const out = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      out[i] = this.nextGaussian();
    }
    let sum = 0;
    for (let i = 0; i < length; i++) sum += out[i];
    const mean = sum / length;
    let sumSq = 0;
    for (let i = 0; i < length; i++) {
      const centered = out[i] - mean;
      out[i] = centered;
      sumSq += centered * centered;
    }
    const std = Math.sqrt(sumSq / length) || 1;
    for (let i = 0; i < length; i++) {
      out[i] /= std;
    }
    return out;
  }
}
