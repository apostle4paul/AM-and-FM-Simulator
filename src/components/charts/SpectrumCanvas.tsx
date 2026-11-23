import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SpectrumData } from '../../types/simulation';

export interface SpectrumMarker {
  freqKHz: number;
  label: string;
  color?: string;
}

interface SpectrumCanvasProps {
  title: string;
  spectrum: SpectrumData;
  secondarySpectrum?: SpectrumData;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  minFreqKHz?: number;
  maxFreqKHz?: number;
  bracketCenterKHz?: number;
  bracketWidthKHz?: number;
  bracketLabel?: string;
  markers?: SpectrumMarker[];
  height?: number;
}

export const SpectrumCanvas: React.FC<SpectrumCanvasProps> = ({
  title,
  spectrum,
  secondarySpectrum,
  primaryLabel = 'Magnitude',
  secondaryLabel = 'Secondary',
  primaryColor = '#06B6D4',
  secondaryColor = '#F59E0B',
  minFreqKHz = 0,
  maxFreqKHz = 200,
  bracketCenterKHz,
  bracketWidthKHz,
  bracketLabel,
  markers,
  height = 230,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [yUnitMode, setYUnitMode] = useState<'db' | 'linear'>('db');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [hoverBin, setHoverBin] = useState<{ fKHz: number; valPrimary: number; valSecondary?: number; xPx: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const syncWidth = () => {
      if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    };
    syncWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', syncWidth);
    return () => window.removeEventListener('resize', syncWidth);
  }, []);

  const { startBin, endBin, yMin, yMax } = useMemo(() => {
    const freqs = spectrum.frequenciesKHz;
    const n = freqs.length;
    if (n === 0) return { startBin: 0, endBin: 0, yMin: -80, yMax: 0 };

    const dfKHz = spectrum.binResolutionHz / 1000 || 0.1;
    const sBin = Math.max(0, Math.floor(minFreqKHz / dfKHz));
    const eBin = Math.min(n - 1, Math.ceil(maxFreqKHz / dfKHz));

    if (yUnitMode === 'db') {
      let peak = -80;
      for (let i = sBin; i <= eBin; i++) {
        if (spectrum.powerDb[i] > peak) peak = spectrum.powerDb[i];
        if (secondarySpectrum && secondarySpectrum.powerDb[i] > peak) peak = secondarySpectrum.powerDb[i];
      }
      const top = Math.ceil((peak + 6) / 10) * 10;
      return { startBin: sBin, endBin: eBin, yMin: top - 80, yMax: top };
    } else {
      let peak = 0.01;
      for (let i = sBin; i <= eBin; i++) {
        if (spectrum.magnitudeV[i] > peak) peak = spectrum.magnitudeV[i];
        if (secondarySpectrum && secondarySpectrum.magnitudeV[i] > peak) peak = secondarySpectrum.magnitudeV[i];
      }
      return { startBin: sBin, endBin: eBin, yMin: 0, yMax: peak * 1.12 };
    }
  }, [spectrum, secondarySpectrum, minFreqKHz, maxFreqKHz, yUnitMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    if (width <= 0) return;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padLeft = 58;
    const padRight = 16;
    const padTop = 18;
    const padBottom = 32;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    ctx.fillStyle = '#080D16';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // Grid & labels
    ctx.strokeStyle = '#182234';
    ctx.lineWidth = 1;
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#94A3B8';

    for (let i = 0; i <= 4; i++) {
      const y = padTop + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      const val = yMax - (i / 4) * (yMax - yMin);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(yUnitMode === 'db' ? `${val.toFixed(0)}` : val.toFixed(2), padLeft - 8, y);
    }

    const fSpan = Math.max(0.1, maxFreqKHz - minFreqKHz);
    for (let i = 0; i <= 5; i++) {
      const x = padLeft + (i / 5) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();

      const fTick = minFreqKHz + (i / 5) * fSpan;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${fTick.toFixed(1)}`, x, padTop + plotH + 6);
    }

    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('Frequency (kHz)', padLeft + plotW, padTop + plotH + 18);

    ctx.save();
    ctx.translate(14, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(yUnitMode === 'db' ? 'Power (dBW, 1 Ω)' : 'Voltage Amp (Vp)', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    // Optional Theoretical Bandwidth Bracket Highlight
    if (
      bracketCenterKHz !== undefined &&
      bracketWidthKHz !== undefined &&
      bracketWidthKHz > 0
    ) {
      const fLow = bracketCenterKHz - bracketWidthKHz / 2;
      const fHigh = bracketCenterKHz + bracketWidthKHz / 2;
      const x1 = padLeft + ((fLow - minFreqKHz) / fSpan) * plotW;
      const x2 = padLeft + ((fHigh - minFreqKHz) / fSpan) * plotW;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.fillRect(x1, padTop, Math.max(1, x2 - x1), plotH);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, padTop);
      ctx.lineTo(x1, padTop + plotH);
      ctx.moveTo(x2, padTop);
      ctx.lineTo(x2, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
      if (bracketLabel) {
        ctx.fillStyle = '#67E8F9';
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(bracketLabel, (x1 + x2) / 2, padTop + 4);
      }
    }

    const drawSpec = (spec: SpectrumData, color: string, fillAlpha: boolean) => {
      const arr = yUnitMode === 'db' ? spec.powerDb : spec.magnitudeV;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let b = startBin; b <= endBin; b++) {
        const f = spec.frequenciesKHz[b];
        const x = padLeft + ((f - minFreqKHz) / fSpan) * plotW;
        const val = Math.max(yMin, Math.min(yMax, arr[b]));
        const y = padTop + ((yMax - val) / (yMax - yMin)) * plotH;
        if (b === startBin) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (fillAlpha) {
        const lastF = spec.frequenciesKHz[endBin] ?? maxFreqKHz;
        const firstF = spec.frequenciesKHz[startBin] ?? minFreqKHz;
        ctx.lineTo(padLeft + ((lastF - minFreqKHz) / fSpan) * plotW, padTop + plotH);
        ctx.lineTo(padLeft + ((firstF - minFreqKHz) / fSpan) * plotW, padTop + plotH);
        ctx.closePath();
        ctx.fillStyle = color === '#3B82F6' ? 'rgba(59, 130, 246, 0.14)' : 'rgba(6, 182, 212, 0.12)';
        ctx.fill();
      }
    };

    if (secondarySpectrum && secondarySpectrum.frequenciesKHz.length > 0) {
      drawSpec(secondarySpectrum, secondaryColor, false);
    }
    if (spectrum.frequenciesKHz.length > 0) {
      drawSpec(spectrum, primaryColor, !secondarySpectrum);
    }

    // Spectral Component Markers (Carrier, USB, LSB, Message Tones)
    if (markers && markers.length > 0) {
      markers.forEach((m, idx) => {
        if (m.freqKHz < minFreqKHz || m.freqKHz > maxFreqKHz) return;
        const x = padLeft + ((m.freqKHz - minFreqKHz) / fSpan) * plotW;
        ctx.strokeStyle = m.color || 'rgba(226, 232, 240, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(x, padTop + 16);
        ctx.lineTo(x, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = m.color || '#E2E8F0';
        ctx.font = '10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const yText = padTop + 18 + (idx % 2) * 12;
        ctx.fillText(m.label, x, yText);
      });
    }

    ctx.restore();

    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    if (hoverBin && hoverBin.xPx >= padLeft && hoverBin.xPx <= padLeft + plotW) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverBin.xPx, padTop);
      ctx.lineTo(hoverBin.xPx, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    spectrum,
    secondarySpectrum,
    startBin,
    endBin,
    yMin,
    yMax,
    minFreqKHz,
    maxFreqKHz,
    height,
    yUnitMode,
    primaryColor,
    secondaryColor,
    bracketCenterKHz,
    bracketWidthKHz,
    bracketLabel,
    markers,
    hoverBin,
    containerWidth,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || endBin <= startBin) return;
    const rect = canvas.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const padLeft = 58;
    const padRight = 16;
    const plotW = rect.width - padLeft - padRight;
    if (xPx < padLeft || xPx > padLeft + plotW) {
      setHoverBin(null);
      return;
    }
    const frac = (xPx - padLeft) / plotW;
    const targetF = minFreqKHz + frac * (maxFreqKHz - minFreqKHz);
    const dfKHz = spectrum.binResolutionHz / 1000 || 0.1;
    const bin = Math.min(endBin, Math.max(startBin, Math.round(targetF / dfKHz)));
    const arr1 = yUnitMode === 'db' ? spectrum.powerDb : spectrum.magnitudeV;
    const arr2 = secondarySpectrum
      ? yUnitMode === 'db'
        ? secondarySpectrum.powerDb
        : secondarySpectrum.magnitudeV
      : null;

    setHoverBin({
      xPx,
      fKHz: spectrum.frequenciesKHz[bin] ?? targetF,
      valPrimary: arr1[bin] ?? 0,
      valSecondary: arr2 ? arr2[bin] ?? 0 : undefined,
    });
  };

  return (
    <div className="bg-[#0D131F] border border-slate-800 rounded-md p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="inline-block w-3 h-0.5" style={{ backgroundColor: primaryColor }} />
              <span>{primaryLabel}</span>
            </span>
            {secondarySpectrum && (
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="inline-block w-3 h-0.5" style={{ backgroundColor: secondaryColor }} />
                <span>{secondaryLabel}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-[#080D16] border border-slate-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => setYUnitMode('db')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                yUnitMode === 'db' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Power (dBW)
            </button>
            <button
              type="button"
              onClick={() => setYUnitMode('linear')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                yUnitMode === 'linear' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Voltage (Vp)
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverBin(null)}
          className="block w-full cursor-crosshair rounded"
        />
        {hoverBin && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-slate-300 bg-[#080D16] border border-slate-800 rounded px-2.5 py-1">
            <span className="text-slate-400">f = {hoverBin.fKHz.toFixed(2)} kHz</span>
            <span style={{ color: primaryColor }}>
              {primaryLabel}: {hoverBin.valPrimary.toFixed(2)} {yUnitMode === 'db' ? 'dBW' : 'Vp'}
            </span>
            {hoverBin.valSecondary !== undefined && (
              <span style={{ color: secondaryColor }}>
                {secondaryLabel}: {hoverBin.valSecondary.toFixed(2)} {yUnitMode === 'db' ? 'dBW' : 'Vp'}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
        <span>
          FFT N={spectrum.fftSize} | Δf={spectrum.binResolutionHz.toFixed(1)} Hz | Hann window
        </span>
        <span>
          {yUnitMode === 'db'
            ? 'Power Spectrum (1 Ω ref): P = Vrms²/R = Vp²/(2R), dBW = 10·log10(P)'
            : 'Single-Sided Voltage Amplitude Spectrum: Peak Voltage Vp (V)'}
        </span>
      </div>
    </div>
  );
};
