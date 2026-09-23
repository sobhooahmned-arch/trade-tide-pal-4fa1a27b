export type Stock = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  history: number[];
};

const SEED: Array<{ symbol: string; name: string; price: number }> = [
  { symbol: "ARMX", name: "أرامكس القابضة", price: 128.4 },
  { symbol: "NILE", name: "النيل للتطوير", price: 64.15 },
  { symbol: "GTEK", name: "جلوب تكنولوجي", price: 312.9 },
  { symbol: "SFIN", name: "سهم المالية", price: 45.7 },
  { symbol: "ORYX", name: "أوريكس للطاقة", price: 89.35 },
  { symbol: "MDNA", name: "مدينة العقارية", price: 22.6 },
];

function series(base: number, n = 40): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = Math.max(1, v * (1 + (Math.random() - 0.48) * 0.02));
    out.push(v);
  }
  return out;
}

export function createStocks(): Stock[] {
  return SEED.map((s) => {
    const history = series(s.price);
    const last = history[history.length - 1]!;
    const first = history[0]!;
    return {
      ...s,
      price: last,
      change: ((last - first) / first) * 100,
      history,
    };
  });
}

export function tick(stocks: Stock[]): Stock[] {
  return stocks.map((s) => {
    const next = Math.max(1, s.price * (1 + (Math.random() - 0.47) * 0.012));
    const history = [...s.history.slice(-59), next];
    const first = history[0]!;
    return { ...s, price: next, change: ((next - first) / first) * 100, history };
  });
}

export function toPath(values: number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export const fmt = (n: number) =>
  n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
