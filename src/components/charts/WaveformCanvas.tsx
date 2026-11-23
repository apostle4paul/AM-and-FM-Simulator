import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface WaveformSeries {
  label: string;
  data: Float64Array;
  color: string;
  dashed?: boolean;
  lineWidth?: number;
}

interface WaveformCanvasProps {
  title: string;
  timeSec: Float64Array;
  series: WaveformSeries[];
  yLabel?: string;
  yUnit?: string;
  height?: number;
  defaultWindowMs?: number;
  allowWindowToggle?: boolean;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  title,
  timeSec,
  series,
  yLabel = 'Amplitude',
  yUnit = 'V',
  height = 240,
  defaultWindowMs = 2.0,
  allowWindowToggle = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalDurationMs = timeSec.length > 1 ? timeSec[timeSec.length - 1] * 1000 : 6;
  const [windowMs, setWindowMs] = useState<number>(Math.min(defaultWindowMs, totalDurationMs));
  const [offsetMs, setOffsetMs] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [hoverInfo, setHoverInfo] = useState<{ xPx: number; tMs: number; vals: { label: string; color: string; v: number }[] } | null>(null);

  useEffect(() => {
    setWindowMs((prev) => Math.min(prev, totalDurationMs));
    setOffsetMs((prev) => Math.min(prev, Math.max(0, totalDurationMs - 0.5)));
  }, [totalDurationMs]);

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

  // Determine active sample index bounds
  const { startIdx, endIdx, yMin, yMax } = useMemo(() => {
    const n = timeSec.length;
    if (n === 0 || series.length === 0) {
      return { startIdx: 0, endIdx: 0, yMin: -1, yMax: 1 };
    }
    const tStart = offsetMs / 1000;
    const tEnd = Math.min(totalDurationMs, offsetMs + windowMs) / 1000;
    const dt = timeSec[1] - timeSec[0] || 1e-6;
    const sIdx = Math.max(0, Math.floor(tStart / dt));
    const eIdx = Math.min(n - 1, Math.ceil(tEnd / dt));

    let minV = Infinity;
    let maxV = -Infinity;
    for (const s of series) {
      for (let i = sIdx; i <= eIdx; i++) {
        const val = s.data[i];
        if (Number.isFinite(val)) {
          if (val < minV) minV = val;
          if (val > maxV) maxV = val;
        }
      }
    }
    if (!Number.isFinite(minV) || !Number.isFinite(maxV)) {
      minV = -1;
      maxV = 1;
    }
    const span = maxV - minV;
    const pad = span > 1e-9 ? span * 0.12 : 0.5;
    return {
      startIdx: sIdx,
      endIdx: eIdx,
      yMin: minV - pad,
      yMax: maxV + pad,
    };
  }, [timeSec, series, offsetMs, windowMs, totalDurationMs]);

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
    const padTop = 14;
    const padBottom = 32;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Plot background
    ctx.fillStyle = '#080D16';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // Grid lines (5 horizontal, 6 vertical)
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
      const label = Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, padLeft - 8, y);
    }

    const tStartMs = timeSec[startIdx] ? timeSec[startIdx] * 1000 : 0;
    const tEndMs = timeSec[endIdx] ? timeSec[endIdx] * 1000 : windowMs;
    const tSpanMs = Math.max(1e-6, tEndMs - tStartMs);

    for (let i = 0; i <= 5; i++) {
      const x = padLeft + (i / 5) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();

      const tTick = tStartMs + (i / 5) * tSpanMs;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${tTick.toFixed(2)}`, x, padTop + plotH + 6);
    }

    // Zero baseline if within range
    if (yMin < 0 && yMax > 0) {
      const yZero = padTop + ((yMax - 0) / (yMax - yMin)) * plotH;
      ctx.strokeStyle = '#293852';
      ctx.beginPath();
      ctx.moveTo(padLeft, yZero);
      ctx.lineTo(padLeft + plotW, yZero);
      ctx.stroke();
    }

    // Axis titles
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`Time (ms)`, padLeft + plotW, padTop + plotH + 18);

    ctx.save();
    ctx.translate(14, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${yLabel} (${yUnit})`, 0, 0);
    ctx.restore();

    // Clip to plot region
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    const sampleCount = endIdx - startIdx + 1;
    // Peak-preserving envelope decimation when sampleCount > plotW * 2
    const useDecimation = sampleCount > plotW * 2;

    for (const s of series) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth ?? 1.5;
      if (s.dashed) {
        ctx.setLineDash([5, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();

      if (!useDecimation) {
        for (let i = startIdx; i <= endIdx; i++) {
          const x = padLeft + ((i - startIdx) / Math.max(1, sampleCount - 1)) * plotW;
          const y = padTop + ((yMax - s.data[i]) / (yMax - yMin)) * plotH;
          if (i === startIdx) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        const cols = Math.max(100, Math.floor(plotW));
        for (let c = 0; c < cols; c++) {
          const i0 = startIdx + Math.floor((c / cols) * sampleCount);
          const i1 = Math.min(endIdx, startIdx + Math.floor(((c + 1) / cols) * sampleCount));
          let minVal = Infinity;
          let maxVal = -Infinity;
          for (let i = i0; i <= i1; i++) {
            const v = s.data[i];
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          }
          const x = padLeft + (c / (cols - 1)) * plotW;
          const yTop = padTop + ((yMax - maxVal) / (yMax - yMin)) * plotH;
          const yBot = padTop + ((yMax - minVal) / (yMax - yMin)) * plotH;
          if (c === 0) ctx.moveTo(x, yTop);
          else ctx.lineTo(x, yTop);
          ctx.lineTo(x, yBot);
        }
      }
      ctx.stroke();
    }
    ctx.restore();

    // Border around plot
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // Crosshair line if hovering
    if (hoverInfo && hoverInfo.xPx >= padLeft && hoverInfo.xPx <= padLeft + plotW) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverInfo.xPx, padTop);
      ctx.lineTo(hoverInfo.xPx, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [series, timeSec, startIdx, endIdx, yMin, yMax, height, windowMs, hoverInfo, yLabel, yUnit, containerWidth]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || endIdx <= startIdx) return;
    const rect = canvas.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const padLeft = 58;
    const padRight = 16;
    const plotW = rect.width - padLeft - padRight;
    if (xPx < padLeft || xPx > padLeft + plotW) {
      setHoverInfo(null);
      return;
    }
    const frac = (xPx - padLeft) / plotW;
    const idx = Math.min(endIdx, Math.max(startIdx, Math.round(startIdx + frac * (endIdx - startIdx))));
    const tMs = timeSec[idx] * 1000;
    const vals = series.map((s) => ({
      label: s.label,
      color: s.color,
      v: s.data[idx] ?? 0,
    }));
    setHoverInfo({ xPx, tMs, vals });
  };

  const windowOptions = [0.25, 0.5, 1.0, 2.0, totalDurationMs].filter(
    (v, idx, arr) => v <= totalDurationMs + 0.01 && arr.indexOf(v) === idx
  );

  return (
    <div className="bg-[#0D131F] border border-slate-800 rounded-md p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <div className="flex items-center gap-3 text-xs">
            {series.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 text-slate-300">
                <span
                  className="inline-block w-3 h-0.5"
                  style={{
                    backgroundColor: s.color,
                    borderBottom: s.dashed ? `1px dashed ${s.color}` : undefined,
                  }}
                />
                <span>{s.label}</span>
              </span>
            ))}
          </div>
        </div>

        {allowWindowToggle && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Window:</span>
            <div className="flex items-center bg-[#080D16] border border-slate-800 rounded p-0.5">
              {windowOptions.map((w) => {
                const active = Math.abs(windowMs - w) < 0.05;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setWindowMs(w);
                      setOffsetMs((prev) => Math.min(prev, Math.max(0, totalDurationMs - w)));
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono tabular-nums whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {w >= totalDurationMs - 0.01 ? 'Full' : `${w}ms`}
                  </button>
                );
              })}
            </div>
            {windowMs < totalDurationMs - 0.05 && (
              <input
                type="range"
                min={0}
                max={Math.max(0.1, totalDurationMs - windowMs)}
                step={0.1}
                value={offsetMs}
                onChange={(e) => setOffsetMs(parseFloat(e.target.value))}
                title="Pan time window"
                className="w-20"
              />
            )}
          </div>
        )}
      </div>

      <div ref={containerRef} className="relative w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          className="block w-full cursor-crosshair rounded"
        />
        {hoverInfo && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-slate-300 bg-[#080D16] border border-slate-800 rounded px-2.5 py-1">
            <span className="text-slate-400">t = {hoverInfo.tMs.toFixed(4)} ms</span>
            {hoverInfo.vals.map((item) => (
              <span key={item.label} style={{ color: item.color }}>
                {item.label}: {item.v.toFixed(3)} {yUnit}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
