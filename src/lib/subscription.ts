export type Subscription = {
  identifier: string;
  amount: number;
  returnAmount: number;
  durationMs: number;
  startedAt: number;
  tax: number;
  taxPaid?: boolean;
  taxSenderNumber?: string;
  taxProofName?: string;
  taxSubmittedAt?: string;
};

const KEY = "em_subscriptions";

/** رقم استلام الضريبة */
export const TAX_PHONE = "01208895415";

/** ضريبة كل باقة حسب مبلغ الباقة */
export const PACKAGE_TAX: Record<number, number> = {
  300: 500,
  700: 950,
  1500: 2800,
  5000: 6500,
  8000: 10000,
  12000: 16500,
  20000: 22000,
};

function read(): Subscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Subscription[]) : [];
  } catch {
    return [];
  }
}

function write(list: Subscription[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

function norm(v: string) {
  return v.trim().toLowerCase();
}

export function getSubscription(identifier: string): Subscription | null {
  const id = norm(identifier);
  return read().find((s) => norm(s.identifier) === id) ?? null;
}

export function subscribe(input: {
  identifier: string;
  amount: number;
  returnAmount: number;
  durationMs: number;
}): Subscription {
  const sub: Subscription = {
    identifier: input.identifier,
    amount: input.amount,
    returnAmount: input.returnAmount,
    durationMs: input.durationMs,
    startedAt: Date.now(),
    tax: PACKAGE_TAX[input.amount] ?? 0,
  };
  write([sub, ...read().filter((s) => norm(s.identifier) !== norm(input.identifier))]);
  return sub;
}

export function submitTaxProof(input: {
  identifier: string;
  senderNumber: string;
  proofName: string;
}) {
  const id = norm(input.identifier);
  write(
    read().map((s) =>
      norm(s.identifier) === id
        ? {
            ...s,
            taxPaid: true,
            taxSenderNumber: input.senderNumber,
            taxProofName: input.proofName,
            taxSubmittedAt: new Date().toISOString(),
          }
        : s,
    ),
  );
}

/** نسبة اكتمال الباقة من 0 إلى 1 */
export function progressOf(sub: Subscription, now = Date.now()): number {
  if (sub.durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, (now - sub.startedAt) / sub.durationMs));
}

/** الأرباح الحالية: تزيد من مبلغ الباقة حتى مبلغ الاستلام خلال مدة الباقة */
export function currentProfit(sub: Subscription, now = Date.now()): number {
  const p = progressOf(sub, now);
  return sub.amount + (sub.returnAmount - sub.amount) * p;
}

export function remainingMs(sub: Subscription, now = Date.now()): number {
  return Math.max(0, sub.startedAt + sub.durationMs - now);
}

export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
