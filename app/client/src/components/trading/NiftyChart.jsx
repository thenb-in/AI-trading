import { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { marketApi } from '@app/services/api';

// How many 5-min candles to fetch when scrolling back (7 days = ~7*75 = 525 candles)
const LOAD_MORE_DAYS = 7;
const LOAD_MORE_SECONDS = LOAD_MORE_DAYS * 24 * 60 * 60;
// Trigger load-more when within this many candles of the left edge
const LOAD_TRIGGER_BARS = 10;

const PATTERN_LABELS = {
  hammer: 'H', inverted_hammer: 'IH', shooting_star: 'SS',
  bullish_engulfing: 'BE', bearish_engulfing: 'BE',
  doji: 'D', morning_star: 'MS', evening_star: 'ES',
  bullish_marubozu: 'BM', bearish_marubozu: 'BM',
};

function isDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function chartTheme() {
  const dark = isDark();
  return {
    layout: {
      background: { color: dark ? '#1a1a2e' : '#ffffff' },
      textColor: dark ? '#d1d5db' : '#374151',
    },
    grid: {
      vertLines: { color: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      horzLines: { color: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
    },
    crosshair: { mode: CrosshairMode.Normal },
    timeScale: { borderColor: dark ? '#374151' : '#e5e7eb', timeVisible: true, secondsVisible: false },
  };
}

// Build EMA series from candle array
function buildEma(candles, period) {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  result.push({ time: candles[period - 1].time, value: Number(ema.toFixed(2)) });
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push({ time: candles[i].time, value: Number(ema.toFixed(2)) });
  }
  return result;
}

// Previous Day High/Low from all candles using IST day boundaries
function buildPdhPdl(allCandles) {
  if (allCandles.length < 2) return null;
  const IST_OFFSET = 19800; // 5.5 * 3600 seconds
  const getDay = ts => Math.floor((ts + IST_OFFSET) / 86400);
  const days = [...new Set(allCandles.map(c => getDay(c.time)))].sort((a, b) => a - b);
  const lastDay = getDay(allCandles[allCandles.length - 1].time);
  const prevDayIdx = days.indexOf(lastDay) - 1;
  if (prevDayIdx < 0) return null;
  const prevDay = days[prevDayIdx];
  const prev = allCandles.filter(c => getDay(c.time) === prevDay);
  if (!prev.length) return null;
  return {
    pdh: Number(Math.max(...prev.map(c => c.high)).toFixed(2)),
    pdl: Number(Math.min(...prev.map(c => c.low)).toFixed(2)),
  };
}

// Simple swing S/R from candle array
function buildSwingLevels(candles, lookback = 3, maxLevels = 6, clusterTol = 0.002) {
  const rawHighs = [], rawLows = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    let isHigh = true, isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }
    if (isHigh) rawHighs.push({ price: c.high, time: c.time });
    if (isLow) rawLows.push({ price: c.low, time: c.time });
  }
  function cluster(pts, type) {
    const levels = [];
    for (const pt of pts) {
      const ex = levels.find(l => Math.abs(l.price - pt.price) / pt.price <= clusterTol);
      if (ex) { ex.price = (ex.price * ex.strength + pt.price) / (ex.strength + 1); ex.strength++; }
      else levels.push({ price: Number(pt.price.toFixed(2)), type, strength: 1 });
    }
    return levels.sort((a, b) => b.strength - a.strength).slice(0, maxLevels);
  }
  return [...cluster(rawHighs, 'resistance'), ...cluster(rawLows, 'support')]
    .sort((a, b) => b.strength - a.strength).slice(0, maxLevels);
}

// Simple pattern detection on last 5 completed candles
function detectPatterns(candles) {
  const markers = [];
  const window = candles.slice(-6, -1);
  for (let i = 0; i < window.length; i++) {
    const c = window[i]; const prev = window[i - 1];
    const range = c.high - c.low; if (range <= 0) continue;
    const body = Math.abs(c.close - c.open);
    const upper = c.high - Math.max(c.close, c.open);
    const lower = Math.min(c.close, c.open) - c.low;
    const bull = c.close > c.open;
    if (body / range < 0.1) markers.push({ time: c.time, position: 'belowBar', color: '#6b7280', shape: 'circle', text: 'D' });
    if (body > 0 && lower >= 2 * body && upper <= 0.3 * body && bull) markers.push({ time: c.time, position: 'belowBar', color: '#0d9488', shape: 'arrowUp', text: 'H' });
    if (body > 0 && upper >= 2 * body && lower <= 0.3 * body && !bull) markers.push({ time: c.time, position: 'aboveBar', color: '#dc2626', shape: 'arrowDown', text: 'SS' });
    if (body / range >= 0.9) markers.push({ time: c.time, position: bull ? 'belowBar' : 'aboveBar', color: bull ? '#0d9488' : '#dc2626', shape: bull ? 'arrowUp' : 'arrowDown', text: bull ? 'BM' : 'BM' });
    if (prev) {
      const pb = Math.abs(prev.close - prev.open); const pbull = prev.close > prev.open;
      if (!pbull && bull && c.open <= prev.close && c.close >= prev.open && body > pb) markers.push({ time: c.time, position: 'belowBar', color: '#0d9488', shape: 'arrowUp', text: 'BE' });
      if (pbull && !bull && c.open >= prev.close && c.close <= prev.open && body > pb) markers.push({ time: c.time, position: 'aboveBar', color: '#dc2626', shape: 'arrowDown', text: 'BE' });
    }
  }
  return markers;
}

// Compute ATR from candles
function computeAtr(candles, period = 14) {
  if (candles.length < 2) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

// Generate BUY and SELL breakout scenarios from visible candles
function computeBreakoutScenarios(visibleCandles) {
  if (visibleCandles.length < 10) return [];
  const currentPrice = visibleCandles[visibleCandles.length - 1].close;
  const atr = computeAtr(visibleCandles) ?? currentPrice * 0.005;
  const levels = buildSwingLevels(visibleCandles, 3, 8);

  const resistances = levels.filter(l => l.type === 'resistance' && l.price > currentPrice)
    .sort((a, b) => a.price - b.price); // nearest first
  const supports = levels.filter(l => l.type === 'support' && l.price < currentPrice)
    .sort((a, b) => b.price - a.price); // nearest first

  const scenarios = [];

  // BUY breakout: price breaks above nearest resistance
  if (resistances.length > 0) {
    const trigger = resistances[0].price;
    const entry = Number((trigger * 1.001).toFixed(2));
    const sl = supports.length > 0
      ? Number(supports[0].price.toFixed(2))
      : Number((entry - atr * 1.5).toFixed(2));
    const risk = entry - sl;
    if (risk > 0) {
      const notes = [];
      if (resistances[0].strength >= 3) notes.push(`Strong resistance (tested ${resistances[0].strength}x)`);
      if (supports.length > 0 && (trigger - supports[0].price) / currentPrice < 0.005)
        notes.push('Tight SL — support very close, good risk/reward');
      scenarios.push({
        direction: 'BUY',
        trigger,
        entry,
        stopLoss: sl,
        target1: Number((entry + risk * 1.5).toFixed(2)),
        target2: Number((entry + risk * 2.5).toFixed(2)),
        notes,
      });
    }
  }

  // SELL breakdown: price breaks below nearest support
  if (supports.length > 0) {
    const trigger = supports[0].price;
    const entry = Number((trigger * 0.999).toFixed(2));
    const sl = resistances.length > 0
      ? Number(resistances[0].price.toFixed(2))
      : Number((entry + atr * 1.5).toFixed(2));
    const risk = sl - entry;
    if (risk > 0) {
      const notes = [];
      if (supports[0].strength >= 3) notes.push(`Strong support (tested ${supports[0].strength}x)`);
      if (resistances.length > 0 && (resistances[0].price - trigger) / currentPrice < 0.005)
        notes.push('Tight SL — resistance very close, good risk/reward');
      scenarios.push({
        direction: 'SELL',
        trigger,
        entry,
        stopLoss: sl,
        target1: Number((entry - risk * 1.5).toFixed(2)),
        target2: Number((entry - risk * 2.5).toFixed(2)),
        notes,
      });
    }
  }

  return scenarios;
}

// Draw a rounded rect if supported, otherwise plain rect
function fillPill(ctx, x, y, w, h, r = 3) {
  if (ctx.roundRect) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

export default function NiftyChart({ chartData, symbol = 'NIFTY', onSymbolChange, onScenariosUpdate }) {
  const containerRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const allCandlesRef = useRef([]);
  const loadingMoreRef = useRef(false);
  const symbolRef = useRef(symbol);
  // true = user has scrolled back and is studying history
  const studyingRef = useRef(false);
  const [isStudying, setIsStudying] = useState(false);
  const applyVisibleAnalysisRef = useRef(null);
  const onScenariosUpdateRef = useRef(onScenariosUpdate);

  // Update candle series + EMA lines (called when data changes)
  const applySeriesData = useCallback((candles) => {
    const { candleSeries, ema20Series, ema50Series } = seriesRef.current;
    if (!candleSeries) return;
    candleSeries.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
    ema20Series.setData(buildEma(candles, 20));
    ema50Series.setData(buildEma(candles, 50));
  }, []);

  // Draw all analysis levels onto the transparent overlay canvas
  const redrawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    const { candleSeries, overlayLevels } = seriesRef.current;
    if (!canvas || !candleSeries) return;
    const W = canvas.width, H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    if (!overlayLevels?.length) return;

    // Leave ~65px for the right price axis (don't draw over it)
    const lineEnd = W - 65;

    for (const lv of overlayLevels) {
      const y = candleSeries.priceToCoordinate(lv.price);
      if (y == null || y < 2 || y > H - 2) continue;

      ctx.save();
      ctx.strokeStyle = lv.color;
      ctx.lineWidth = lv.lineWidth ?? 1;
      ctx.globalAlpha = lv.alpha ?? 0.85;

      if (lv.dash === 'dotted')      ctx.setLineDash([2, 4]);
      else if (lv.dash === 'dashed') ctx.setLineDash([7, 5]);
      else                           ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(lineEnd, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label pill drawn inline on the line (near right, inside chart area)
      const price = lv.price.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      const label = `${lv.title}  ${price}`;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const tw = ctx.measureText(label).width;
      const px = lineEnd - tw - 18;
      const py = y - 8;

      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(10,10,20,0.72)';
      fillPill(ctx, px - 4, py, tw + 12, 14, 3);
      ctx.fillStyle = lv.color;
      ctx.fillText(label, px, py + 10);

      ctx.restore();
    }
  }, []);

  // Recompute all overlay levels from visible candles and repaint canvas
  const applyVisibleAnalysis = useCallback((visibleCandles) => {
    const { candleSeries } = seriesRef.current;
    if (!candleSeries || visibleCandles.length < 5) return;

    // VWAP over visible range
    let cumTpV = 0, cumV = 0;
    for (const c of visibleCandles) { const tp = (c.high + c.low + c.close) / 3; cumTpV += tp * (c.volume || 0); cumV += c.volume || 0; }
    const vwap = cumV > 0 ? cumTpV / cumV : null;

    const levels = [];

    // 1. VWAP
    if (vwap) levels.push({ price: Number(vwap.toFixed(2)), color: '#3b82f6', dash: 'dashed', title: 'VWAP' });

    // 2. PDH / PDL — previous day reference for opening direction
    const pdhPdl = buildPdhPdl(allCandlesRef.current);
    if (pdhPdl) {
      levels.push({ price: pdhPdl.pdh, color: '#f97316', dash: 'dashed', title: 'PDH' });
      levels.push({ price: pdhPdl.pdl, color: '#f97316', dash: 'dashed', title: 'PDL' });
    }

    // 3. Top 2 swing S/R (strongest only)
    const topSR = buildSwingLevels(visibleCandles).slice(0, 2);
    for (const sr of topSR) {
      levels.push({ price: sr.price, color: sr.type === 'support' ? '#0d9488' : '#dc2626', dash: 'solid', title: sr.type === 'support' ? 'S' : 'R' });
    }

    // 4. Breakout scenarios — entry trigger + target + SL
    const scenarios = computeBreakoutScenarios(visibleCandles);
    for (const s of scenarios) {
      const isBuy = s.direction === 'BUY';
      const c = isBuy ? '#34d399' : '#f87171'; // lighter shades so they read differently from S/R
      levels.push({ price: s.trigger,  color: c,        dash: 'dotted', title: isBuy ? '▲ Entry' : '▼ Entry', lineWidth: 1 });
      levels.push({ price: s.target1,  color: c,        dash: 'dashed', title: isBuy ? '▲ T1'    : '▼ T1',    lineWidth: 1.5 });
      levels.push({ price: s.stopLoss, color: '#94a3b8', dash: 'dotted', title: isBuy ? '▲ SL'   : '▼ SL',    lineWidth: 1, alpha: 0.7 });
    }

    seriesRef.current.overlayLevels = levels;
    candleSeries.setMarkers(detectPatterns(visibleCandles));
    onScenariosUpdateRef.current?.(scenarios);
    redrawOverlay();
  }, [redrawOverlay]);

  // Keep refs current so chart event handlers (created once) always call latest versions
  useEffect(() => { applyVisibleAnalysisRef.current = applyVisibleAnalysis; }, [applyVisibleAnalysis]);
  useEffect(() => { onScenariosUpdateRef.current = onScenariosUpdate; }, [onScenariosUpdate]);

  // Combined: update series data then visible analysis
  const applyAnalysis = useCallback((candles) => {
    applySeriesData(candles);
    applyVisibleAnalysis(candles);
  }, [applySeriesData, applyVisibleAnalysis]);

  // Load earlier candles when user scrolls back
  const loadMoreCandles = useCallback(async () => {
    if (loadingMoreRef.current || allCandlesRef.current.length === 0) return;
    loadingMoreRef.current = true;
    const oldestTime = allCandlesRef.current[0].time;
    const toTime = oldestTime - 1;
    const fromTime = toTime - LOAD_MORE_SECONDS;
    try {
      const res = await marketApi.getCandles(symbolRef.current, fromTime, toTime);
      const { candles: newCandles } = res.data;
      if (!newCandles?.length) return;
      // Merge: new (older) candles + existing, deduplicate
      const merged = [...newCandles, ...allCandlesRef.current];
      const seen = new Set();
      const deduped = merged.filter(c => { if (seen.has(c.time)) return false; seen.add(c.time); return true; });
      deduped.sort((a, b) => a.time - b.time);
      allCandlesRef.current = deduped;
      applyAnalysis(deduped);
    } catch (e) {
      console.warn('[NiftyChart] loadMoreCandles failed', e);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [applyAnalysis]);

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const W = containerRef.current.clientWidth;
    const H = 400;
    const chart = createChart(containerRef.current, { ...chartTheme(), width: W, height: H });
    const candleSeries = chart.addCandlestickSeries({ upColor: '#0d9488', downColor: '#dc2626', borderUpColor: '#0d9488', borderDownColor: '#dc2626', wickUpColor: '#0d9488', wickDownColor: '#dc2626' });
    const ema20Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'EMA20', priceLineVisible: false });
    const ema50Series = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, title: 'EMA50', priceLineVisible: false });
    chartRef.current = chart;
    seriesRef.current = { candleSeries, ema20Series, ema50Series, overlayLevels: [] };

    // Size the overlay canvas to match the chart
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = W;
      overlayCanvasRef.current.height = H;
    }

    // Scroll/zoom detection — recompute analysis on visible window
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      const all = allCandlesRef.current;
      const total = all.length;

      // Live/studying state
      const atLive = range.to >= total - 3;
      if (atLive && studyingRef.current) {
        studyingRef.current = false;
        setIsStudying(false);
      } else if (!atLive && !studyingRef.current) {
        studyingRef.current = true;
        setIsStudying(true);
      }

      // Extract visible candles by index and recompute S/R + patterns
      if (total > 0) {
        const fromIdx = Math.max(0, Math.floor(range.from));
        const toIdx = Math.min(total - 1, Math.ceil(range.to));
        const visibleCandles = all.slice(fromIdx, toIdx + 1);
        applyVisibleAnalysisRef.current?.(visibleCandles);
      } else {
        // No candles yet but chart panned — still redraw so canvas clears properly
        redrawOverlay();
      }

      // Load more when near left edge
      if (range.from < LOAD_TRIGGER_BARS) {
        loadMoreCandles();
      }
    });

    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w && chartRef.current) {
        chartRef.current.applyOptions({ width: w });
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = w;
          // height stays 400
        }
        redrawOverlay();
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
  }, [loadMoreCandles, redrawOverlay]);

  // Update candle data when chartData refreshes
  useEffect(() => {
    if (!chartData?.candles?.length || !seriesRef.current.candleSeries) return;

    // Guard: skip if the data is for a different symbol than currently selected
    const dataSymbol = chartData.symbol?.replace('NSE:', '');
    if (dataSymbol && dataSymbol !== symbol) return;

    symbolRef.current = symbol;
    const incoming = [...chartData.candles].sort((a, b) => a.time - b.time);

    if (allCandlesRef.current.length === 0 || allCandlesRef.current._symbol !== symbol) {
      // Full reset for this symbol
      allCandlesRef.current = incoming;
      allCandlesRef.current._symbol = symbol;
      studyingRef.current = false;
      setIsStudying(false);
      applyAnalysis(incoming);
      // Center on latest candle (same as Go Live) — then leave freehand
      const chart = chartRef.current;
      if (chart) {
        const total = incoming.length;
        const visibleBars = 60;
        const half = Math.floor(visibleBars / 2);
        chart.timeScale().setVisibleLogicalRange({ from: total - 1 - half, to: total - 1 + half });
      }
    } else {
      // Silent update — never move the viewport
      const oldest = allCandlesRef.current[0];
      const newLatest = incoming.filter(c => c.time >= oldest.time);
      const combined = [...allCandlesRef.current.filter(c => !newLatest.find(m => m.time === c.time)), ...newLatest];
      combined.sort((a, b) => a.time - b.time);
      combined._symbol = symbol;
      allCandlesRef.current = combined;
      applyAnalysis(combined);
    }
  }, [chartData, symbol, applyAnalysis]);

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div className="chart-symbol-toggle">
          <button className={`chart-symbol-btn ${symbol === 'NIFTY' ? 'chart-symbol-btn--active' : ''}`} onClick={() => onSymbolChange?.('NIFTY')}>NIFTY</button>
          <button className={`chart-symbol-btn ${symbol === 'BANKNIFTY' ? 'chart-symbol-btn--active' : ''}`} onClick={() => onSymbolChange?.('BANKNIFTY')}>BANKNIFTY</button>
        </div>
        {isStudying && (
          <button className="chart-golive-btn" onClick={() => {
            studyingRef.current = false;
            setIsStudying(false);
            const chart = chartRef.current;
            if (!chart) return;
            const total = allCandlesRef.current.length;
            const currentRange = chart.timeScale().getVisibleLogicalRange();
            const visibleBars = currentRange ? Math.round(currentRange.to - currentRange.from) : 60;
            const half = Math.floor(visibleBars / 2);
            chart.timeScale().setVisibleLogicalRange({
              from: total - 1 - half,
              to: total - 1 + half,
            });
          }}>
            ● Go Live
          </button>
        )}
        <div className="chart-card__legend">
          <span className="chart-legend-item" style={{ color: '#f59e0b' }}>— EMA20</span>
          <span className="chart-legend-item" style={{ color: '#8b5cf6' }}>— EMA50</span>
          <span className="chart-legend-item" style={{ color: '#3b82f6' }}>· · VWAP</span>
          <span className="chart-legend-item" style={{ color: '#f97316' }}>· · PDH/PDL</span>
          <span className="chart-legend-item" style={{ color: '#34d399' }}>▲ Entry · T1</span>
          <span className="chart-legend-item" style={{ color: '#f87171' }}>▼ Entry · T1</span>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <div ref={containerRef} />
        <canvas
          ref={overlayCanvasRef}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
}
