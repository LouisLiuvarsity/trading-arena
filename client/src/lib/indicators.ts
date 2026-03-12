// ============================================================
// Technical Indicator Calculation Library
// All functions accept OHLCV candle arrays and return series data
// Compatible with lightweight-charts LineSeries / HistogramSeries
// ============================================================

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LinePoint {
  time: number;
  value: number;
}

export interface HistogramPoint {
  time: number;
  value: number;
  color?: string;
}

// ─── Helpers ────────────────────────────────────────────────

function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) sum -= data[i - period];
    result.push(i >= period - 1 ? sum / period : null);
  }
  return result;
}

function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (prev === null) {
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += data[j];
      prev = s / period;
      result.push(prev);
    } else {
      prev = data[i] * k + prev * (1 - k);
      result.push(prev);
    }
  }
  return result;
}

function stdDev(data: number[], period: number, means: (number | null)[]): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (means[i] === null || i < period - 1) {
      result.push(null);
      continue;
    }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - means[i]!;
      sumSq += diff * diff;
    }
    result.push(Math.sqrt(sumSq / period));
  }
  return result;
}

function toLinePoints(candles: Candle[], values: (number | null)[]): LinePoint[] {
  const pts: LinePoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (values[i] !== null && values[i] !== undefined && isFinite(values[i]!)) {
      pts.push({ time: candles[i].time, value: values[i]! });
    }
  }
  return pts;
}

// ─── 1. MA (Simple Moving Average) ─────────────────────────

export interface MAParams { periods: number[]; }
export const MA_DEFAULTS: MAParams = { periods: [5, 10, 20, 60] };
export const MA_COLORS = ['#E6A817', '#E040FB', '#00BCD4', '#FF5722', '#4CAF50', '#2196F3'];

export function calcMA(candles: Candle[], params: MAParams): { period: number; data: LinePoint[] }[] {
  const closes = candles.map(c => c.close);
  return params.periods.map(p => ({
    period: p,
    data: toLinePoints(candles, sma(closes, p)),
  }));
}

// ─── 2. EMA (Exponential Moving Average) ────────────────────

export interface EMAParams { periods: number[]; }
export const EMA_DEFAULTS: EMAParams = { periods: [12, 26] };
export const EMA_COLORS = ['#FF9800', '#2196F3', '#4CAF50', '#E040FB'];

export function calcEMA(candles: Candle[], params: EMAParams): { period: number; data: LinePoint[] }[] {
  const closes = candles.map(c => c.close);
  return params.periods.map(p => ({
    period: p,
    data: toLinePoints(candles, ema(closes, p)),
  }));
}

// ─── 3. BOLL (Bollinger Bands) ──────────────────────────────

export interface BOLLParams { period: number; multiplier: number; }
export const BOLL_DEFAULTS: BOLLParams = { period: 20, multiplier: 2 };

export function calcBOLL(candles: Candle[], params: BOLLParams): {
  mid: LinePoint[]; upper: LinePoint[]; lower: LinePoint[];
} {
  const closes = candles.map(c => c.close);
  const mid = sma(closes, params.period);
  const sd = stdDev(closes, params.period, mid);
  const upper = mid.map((m, i) => m !== null && sd[i] !== null ? m + params.multiplier * sd[i]! : null);
  const lower = mid.map((m, i) => m !== null && sd[i] !== null ? m - params.multiplier * sd[i]! : null);
  return {
    mid: toLinePoints(candles, mid),
    upper: toLinePoints(candles, upper),
    lower: toLinePoints(candles, lower),
  };
}

// ─── 4. SAR (Parabolic Stop and Reverse) ────────────────────

export interface SARParams { step: number; max: number; }
export const SAR_DEFAULTS: SARParams = { step: 0.02, max: 0.2 };

export function calcSAR(candles: Candle[], params: SARParams): LinePoint[] {
  if (candles.length < 2) return [];
  const { step, max } = params;
  const result: LinePoint[] = [];
  let isLong = candles[1].close > candles[0].close;
  let af = step;
  let ep = isLong ? candles[0].high : candles[0].low;
  let sar = isLong ? candles[0].low : candles[0].high;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    sar = sar + af * (ep - sar);
    if (isLong) {
      if (i >= 2) sar = Math.min(sar, candles[i - 1].low, candles[i - 2].low);
      else sar = Math.min(sar, candles[i - 1].low);
      if (c.low < sar) {
        isLong = false; sar = ep; ep = c.low; af = step;
      } else {
        if (c.high > ep) { ep = c.high; af = Math.min(af + step, max); }
      }
    } else {
      if (i >= 2) sar = Math.max(sar, candles[i - 1].high, candles[i - 2].high);
      else sar = Math.max(sar, candles[i - 1].high);
      if (c.high > sar) {
        isLong = true; sar = ep; ep = c.high; af = step;
      } else {
        if (c.low < ep) { ep = c.low; af = Math.min(af + step, max); }
      }
    }
    if (isFinite(sar)) result.push({ time: c.time, value: sar });
  }
  return result;
}

// ─── 5. AVL (Volume Weighted Average Price) ─────────────────

export interface AVLParams { period: number; }
export const AVL_DEFAULTS: AVLParams = { period: 20 };

export function calcAVL(candles: Candle[], params: AVLParams): LinePoint[] {
  const tp = candles.map(c => (c.high + c.low + c.close) / 3);
  const vol = candles.map(c => c.volume ?? 1);
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < params.period - 1) { result.push(null); continue; }
    let sumTPV = 0, sumV = 0;
    for (let j = i - params.period + 1; j <= i; j++) {
      sumTPV += tp[j] * vol[j]; sumV += vol[j];
    }
    result.push(sumV > 0 ? sumTPV / sumV : null);
  }
  return toLinePoints(candles, result);
}

// ─── 6. SUPER (Supertrend) ──────────────────────────────────

export interface SUPERParams { period: number; multiplier: number; }
export const SUPER_DEFAULTS: SUPERParams = { period: 10, multiplier: 3 };

export interface SupertrendPoint { time: number; value: number; direction: 'up' | 'down'; }

export function calcSUPER(candles: Candle[], params: SUPERParams): SupertrendPoint[] {
  const { period, multiplier } = params;
  if (candles.length < period) return [];
  const atrValues: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { atrValues.push(candles[i].high - candles[i].low); continue; }
    atrValues.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  const atr: (number | null)[] = [];
  let atrSum = 0;
  for (let i = 0; i < candles.length; i++) {
    atrSum += atrValues[i];
    if (i < period - 1) atr.push(null);
    else if (i === period - 1) atr.push(atrSum / period);
    else { const prev = atr[i - 1]!; atr.push((prev * (period - 1) + atrValues[i]) / period); }
  }
  const result: SupertrendPoint[] = [];
  let prevUB = 0, prevLB = 0, prevST = 0, prevDir: 'up' | 'down' = 'up';
  for (let i = 0; i < candles.length; i++) {
    if (atr[i] === null) continue;
    const hl2 = (candles[i].high + candles[i].low) / 2;
    let ub = hl2 + multiplier * atr[i]!;
    let lb = hl2 - multiplier * atr[i]!;
    if (i > period - 1) {
      ub = (lb < prevLB || candles[i - 1].close > prevUB) ? ub : Math.min(ub, prevUB);
      lb = (ub > prevUB || candles[i - 1].close < prevLB) ? lb : Math.max(lb, prevLB);
    }
    let dir: 'up' | 'down', st: number;
    if (i === period - 1) {
      dir = candles[i].close > ub ? 'up' : 'down';
      st = dir === 'up' ? lb : ub;
    } else {
      dir = prevDir === 'up' ? (candles[i].close < prevST ? 'down' : 'up') : (candles[i].close > prevST ? 'up' : 'down');
      st = dir === 'up' ? lb : ub;
    }
    prevUB = ub; prevLB = lb; prevST = st; prevDir = dir;
    if (isFinite(st)) result.push({ time: candles[i].time, value: st, direction: dir });
  }
  return result;
}

// ─── 7. VOL (Volume) ───────────────────────────────────────

export interface VOLParams { maPeriod: number; }
export const VOL_DEFAULTS: VOLParams = { maPeriod: 20 };

export function calcVOL(candles: Candle[], params: VOLParams): {
  bars: HistogramPoint[]; ma: LinePoint[];
} {
  const volumes = candles.map(c => c.volume ?? 0);
  const bars: HistogramPoint[] = candles.map((c, i) => ({
    time: c.time, value: volumes[i],
    color: c.close >= c.open ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)',
  }));
  return { bars, ma: toLinePoints(candles, sma(volumes, params.maPeriod)) };
}

// ─── 8. MACD ────────────────────────────────────────────────

export interface MACDParams { fast: number; slow: number; signal: number; }
export const MACD_DEFAULTS: MACDParams = { fast: 12, slow: 26, signal: 9 };

export function calcMACD(candles: Candle[], params: MACDParams): {
  macd: LinePoint[]; signal: LinePoint[]; histogram: HistogramPoint[];
} {
  const closes = candles.map(c => c.close);
  const fastEma = ema(closes, params.fast);
  const slowEma = ema(closes, params.slow);
  const macdLine: (number | null)[] = fastEma.map((f, i) =>
    f !== null && slowEma[i] !== null ? f - slowEma[i]! : null
  );
  const macdNonNull = macdLine.filter(v => v !== null) as number[];
  const signalRaw = ema(macdNonNull, params.signal);
  const signalLine: (number | null)[] = [];
  let si = 0;
  for (const m of macdLine) {
    if (m === null) signalLine.push(null);
    else { signalLine.push(signalRaw[si] ?? null); si++; }
  }
  const hist: (number | null)[] = macdLine.map((m, i) =>
    m !== null && signalLine[i] !== null ? m - signalLine[i]! : null
  );
  const histogram: HistogramPoint[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (hist[i] !== null && isFinite(hist[i]!)) {
      histogram.push({
        time: candles[i].time, value: hist[i]!,
        color: hist[i]! >= 0
          ? (i > 0 && hist[i - 1] !== null && hist[i]! < hist[i - 1]! ? '#26a69a80' : '#26a69a')
          : (i > 0 && hist[i - 1] !== null && hist[i]! > hist[i - 1]! ? '#ef535080' : '#ef5350'),
      });
    }
  }
  return {
    macd: toLinePoints(candles, macdLine),
    signal: toLinePoints(candles, signalLine),
    histogram,
  };
}

// ─── 9. RSI ─────────────────────────────────────────────────

export interface RSIParams { period: number; }
export const RSI_DEFAULTS: RSIParams = { period: 14 };

export function calcRSI(candles: Candle[], params: RSIParams): LinePoint[] {
  const closes = candles.map(c => c.close);
  const result: (number | null)[] = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(null); continue; }
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    if (i < params.period) { avgGain += gain; avgLoss += loss; result.push(null); }
    else if (i === params.period) {
      avgGain = (avgGain + gain) / params.period;
      avgLoss = (avgLoss + loss) / params.period;
      result.push(100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss)));
    } else {
      avgGain = (avgGain * (params.period - 1) + gain) / params.period;
      avgLoss = (avgLoss * (params.period - 1) + loss) / params.period;
      result.push(100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss)));
    }
  }
  return toLinePoints(candles, result);
}

// ─── 10. KDJ ────────────────────────────────────────────────

export interface KDJParams { kPeriod: number; dPeriod: number; jSmooth: number; }
export const KDJ_DEFAULTS: KDJParams = { kPeriod: 9, dPeriod: 3, jSmooth: 3 };

export function calcKDJ(candles: Candle[], params: KDJParams): {
  k: LinePoint[]; d: LinePoint[]; j: LinePoint[];
} {
  const { kPeriod, dPeriod, jSmooth } = params;
  const rsv: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) { rsv.push(null); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high); ll = Math.min(ll, candles[j].low);
    }
    rsv.push(hh === ll ? 50 : ((candles[i].close - ll) / (hh - ll)) * 100);
  }
  const kValues: (number | null)[] = [];
  let prevK = 50;
  for (let i = 0; i < rsv.length; i++) {
    if (rsv[i] === null) { kValues.push(null); continue; }
    prevK = (2 / dPeriod) * rsv[i]! + ((dPeriod - 2) / dPeriod) * prevK;
    kValues.push(prevK);
  }
  const dValues: (number | null)[] = [];
  let prevD = 50;
  for (let i = 0; i < kValues.length; i++) {
    if (kValues[i] === null) { dValues.push(null); continue; }
    prevD = (2 / jSmooth) * kValues[i]! + ((jSmooth - 2) / jSmooth) * prevD;
    dValues.push(prevD);
  }
  const jValues = kValues.map((k, i) =>
    k !== null && dValues[i] !== null ? 3 * k - 2 * dValues[i]! : null
  );
  return {
    k: toLinePoints(candles, kValues),
    d: toLinePoints(candles, dValues),
    j: toLinePoints(candles, jValues),
  };
}

// ─── 11. OBV (On Balance Volume) ────────────────────────────

export interface OBVParams { maPeriod: number; }
export const OBV_DEFAULTS: OBVParams = { maPeriod: 20 };

export function calcOBV(candles: Candle[], params: OBVParams): {
  obv: LinePoint[]; ma: LinePoint[];
} {
  const obvValues: number[] = [];
  let cumOBV = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) cumOBV = candles[i].volume ?? 0;
    else {
      const vol = candles[i].volume ?? 0;
      if (candles[i].close > candles[i - 1].close) cumOBV += vol;
      else if (candles[i].close < candles[i - 1].close) cumOBV -= vol;
    }
    obvValues.push(cumOBV);
  }
  return {
    obv: candles.map((c, i) => ({ time: c.time, value: obvValues[i] })),
    ma: toLinePoints(candles, sma(obvValues, params.maPeriod)),
  };
}

// ─── 12. WR (Williams %R) ──────────────────────────────────

export interface WRParams { period: number; }
export const WR_DEFAULTS: WRParams = { period: 14 };

export function calcWR(candles: Candle[], params: WRParams): LinePoint[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < params.period - 1) { result.push(null); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - params.period + 1; j <= i; j++) {
      hh = Math.max(hh, candles[j].high); ll = Math.min(ll, candles[j].low);
    }
    result.push(hh === ll ? -50 : ((hh - candles[i].close) / (hh - ll)) * -100);
  }
  return toLinePoints(candles, result);
}

// ─── Indicator Registry ─────────────────────────────────────

export type OverlayIndicator = 'MA' | 'EMA' | 'BOLL' | 'SAR' | 'AVL' | 'SUPER';
export type SubChartIndicator = 'VOL' | 'MACD' | 'RSI' | 'KDJ' | 'OBV' | 'WR';
export type IndicatorKey = OverlayIndicator | SubChartIndicator;

export interface IndicatorConfig {
  key: IndicatorKey;
  nameZh: string;
  nameEn: string;
  type: 'overlay' | 'subchart';
  defaultParams: Record<string, unknown>;
  paramLabels: Record<string, { zh: string; en: string; min?: number; max?: number; step?: number }>;
}

export const INDICATOR_REGISTRY: IndicatorConfig[] = [
  {
    key: 'MA', nameZh: '移动平均线', nameEn: 'Moving Average', type: 'overlay',
    defaultParams: { ...MA_DEFAULTS },
    paramLabels: { periods: { zh: '周期列表', en: 'Periods' } },
  },
  {
    key: 'EMA', nameZh: '指数移动平均线', nameEn: 'Exponential MA', type: 'overlay',
    defaultParams: { ...EMA_DEFAULTS },
    paramLabels: { periods: { zh: '周期列表', en: 'Periods' } },
  },
  {
    key: 'BOLL', nameZh: '布林线', nameEn: 'Bollinger Bands', type: 'overlay',
    defaultParams: { ...BOLL_DEFAULTS },
    paramLabels: {
      period: { zh: '周期', en: 'Period', min: 2, max: 200, step: 1 },
      multiplier: { zh: '倍数', en: 'Multiplier', min: 0.5, max: 5, step: 0.1 },
    },
  },
  {
    key: 'SAR', nameZh: '抛物线转向指标', nameEn: 'Parabolic SAR', type: 'overlay',
    defaultParams: { ...SAR_DEFAULTS },
    paramLabels: {
      step: { zh: '加速因子', en: 'Step', min: 0.001, max: 0.1, step: 0.001 },
      max: { zh: '最大加速', en: 'Max AF', min: 0.1, max: 0.5, step: 0.01 },
    },
  },
  {
    key: 'AVL', nameZh: '均价线', nameEn: 'Avg Price Line', type: 'overlay',
    defaultParams: { ...AVL_DEFAULTS },
    paramLabels: { period: { zh: '周期', en: 'Period', min: 2, max: 200, step: 1 } },
  },
  {
    key: 'SUPER', nameZh: '超级趋势', nameEn: 'Supertrend', type: 'overlay',
    defaultParams: { ...SUPER_DEFAULTS },
    paramLabels: {
      period: { zh: '周期', en: 'Period', min: 2, max: 100, step: 1 },
      multiplier: { zh: '倍数', en: 'Multiplier', min: 0.5, max: 10, step: 0.1 },
    },
  },
  {
    key: 'VOL', nameZh: '成交量', nameEn: 'Volume', type: 'subchart',
    defaultParams: { ...VOL_DEFAULTS },
    paramLabels: { maPeriod: { zh: 'MA周期', en: 'MA Period', min: 2, max: 200, step: 1 } },
  },
  {
    key: 'MACD', nameZh: '指数平滑异同移动平均线', nameEn: 'MACD', type: 'subchart',
    defaultParams: { ...MACD_DEFAULTS },
    paramLabels: {
      fast: { zh: '快线', en: 'Fast', min: 2, max: 100, step: 1 },
      slow: { zh: '慢线', en: 'Slow', min: 2, max: 200, step: 1 },
      signal: { zh: '信号线', en: 'Signal', min: 2, max: 100, step: 1 },
    },
  },
  {
    key: 'RSI', nameZh: '相对强弱指标', nameEn: 'RSI', type: 'subchart',
    defaultParams: { ...RSI_DEFAULTS },
    paramLabels: { period: { zh: '周期', en: 'Period', min: 2, max: 100, step: 1 } },
  },
  {
    key: 'KDJ', nameZh: '随机震荡指标', nameEn: 'KDJ', type: 'subchart',
    defaultParams: { ...KDJ_DEFAULTS },
    paramLabels: {
      kPeriod: { zh: 'K周期', en: 'K Period', min: 2, max: 100, step: 1 },
      dPeriod: { zh: 'D平滑', en: 'D Smooth', min: 2, max: 100, step: 1 },
      jSmooth: { zh: 'J平滑', en: 'J Smooth', min: 2, max: 100, step: 1 },
    },
  },
  {
    key: 'OBV', nameZh: '能量潮指标', nameEn: 'OBV', type: 'subchart',
    defaultParams: { ...OBV_DEFAULTS },
    paramLabels: { maPeriod: { zh: 'MA周期', en: 'MA Period', min: 2, max: 200, step: 1 } },
  },
  {
    key: 'WR', nameZh: '威廉指标', nameEn: 'Williams %R', type: 'subchart',
    defaultParams: { ...WR_DEFAULTS },
    paramLabels: { period: { zh: '周期', en: 'Period', min: 2, max: 100, step: 1 } },
  },
];

export function getIndicatorConfig(key: IndicatorKey): IndicatorConfig | undefined {
  return INDICATOR_REGISTRY.find(c => c.key === key);
}
