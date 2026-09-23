import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Clock3,
  Gem,
  Landmark,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearStoredUser, getStoredUser, type StoredUser } from "@/lib/auth";
import { createStocks, fmt, tick, toPath, type Stock } from "@/lib/market";
import { addRequest, getBalance, userRequests, type MoneyRequest } from "@/lib/store";
import {
  currentProfit,
  formatRemaining,
  getSubscription,
  PACKAGE_TAX,
  progressOf,
  remainingMs,
  subscribe,
  submitTaxProof,
  TAX_PHONE,
  type Subscription,
} from "@/lib/subscription";

type PackageGroup = "small" | "large";

type InvestmentPackage = {
  amount: number;
  returnAmount: number;
  duration: string;
  durationMs: number;
};

const MIN = 60 * 1000;

const INVESTMENT_PACKAGES: Record<PackageGroup, InvestmentPackage[]> = {
  small: [
    { amount: 300, returnAmount: 3000, duration: "30 دقيقة", durationMs: 30 * MIN },
    { amount: 700, returnAmount: 7100, duration: "35 دقيقة", durationMs: 35 * MIN },
    { amount: 1500, returnAmount: 15000, duration: "45 دقيقة", durationMs: 45 * MIN },
  ],
  large: [
    { amount: 5000, returnAmount: 45000, duration: "ساعة واحدة", durationMs: 60 * MIN },
    { amount: 8000, returnAmount: 72000, duration: "ساعتين", durationMs: 120 * MIN },
    { amount: 12000, returnAmount: 86000, duration: "ساعتين", durationMs: 120 * MIN },
    { amount: 20000, returnAmount: 120000, duration: "ساعتين", durationMs: 120 * MIN },
  ],
};

export const Route = createFileRoute("/market")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "السوق والمحفظة | Easy Money" },
      {
        name: "description",
        content:
          "تابع حركة الأسهم وأرباح المستثمرين لحظة بلحظة، وأدِر الإيداع والسحب من أعلى الصفحة.",
      },
      { property: "og:title", content: "السوق والمحفظة | Easy Money" },
      {
        property: "og:description",
        content: "أسعار متحركة، أرباح محفظتك، وإيداع وسحب في خطوة واحدة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketPage,
});

function MarketPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [stocks, setStocks] = useState<Stock[]>(() => createStocks());
  const [balance, setBalance] = useState(0);
  const [reqs, setReqs] = useState<MoneyRequest[]>([]);
  const [modal, setModal] = useState<"withdraw" | null>(null);
  const [openPackages, setOpenPackages] = useState<PackageGroup | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      navigate({ to: "/", replace: true });
      return;
    }
    if (u.isAdmin) {
      navigate({ to: "/admin", replace: true });
      return;
    }
    setUser(u);
    setBalance(getBalance(u.identifier));
    setReqs(userRequests(u.identifier));
    setSub(getSubscription(u.identifier));
  }, [navigate]);

  useEffect(() => {
    const id = window.setInterval(() => setStocks((s) => tick(s)), 1200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // تحديث الرصيد لو الإدارة أضافت مبلغاً
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      setBalance(getBalance(user.identifier));
      setReqs(userRequests(user.identifier));
    }, 2000);
    return () => window.clearInterval(id);
  }, [user]);

  const marketProfit = useMemo(
    () =>
      balance <= 0 ? 0 : stocks.reduce((acc, s) => acc + (s.change / 100) * (balance / 6), 0),
    [stocks, balance],
  );

  const profit = sub ? currentProfit(sub, now) : marketProfit;
  const subDone = sub ? progressOf(sub, now) >= 1 : false;

  if (!user) return null;

  function handleSubscribe(pkg: InvestmentPackage) {
    if (!user) return;
    if (sub) {
      setNotice("أنت مشترك بالفعل في باقة، استلم أرباحها الأول.");
      window.setTimeout(() => setNotice(null), 5000);
      return;
    }
    const created = subscribe({
      identifier: user.identifier,
      amount: pkg.amount,
      returnAmount: pkg.returnAmount,
      durationMs: pkg.durationMs,
    });
    setSub(created);
    setNow(Date.now());
    setNotice(
      `تم الاشتراك في باقة ${fmt(pkg.amount)} ج.م، أرباحك هتزيد لحد ${fmt(pkg.returnAmount)} ج.م خلال ${pkg.duration}.`,
    );
    window.setTimeout(() => setNotice(null), 6000);
  }

  function applyWithdraw(amount: number) {
    if (!user) return;
    addRequest({ identifier: user.identifier, name: user.name, kind: "withdraw", amount });
    setReqs(userRequests(user.identifier));
    setModal(null);
    setNotice("تم إرسال طلب السحب، سيتم تنفيذه بعد مراجعة الإدارة.");
    window.setTimeout(() => setNotice(null), 5000);
  }

  function handleTaxProof(senderNumber: string, proofName: string) {
    if (!user) return;
    submitTaxProof({ identifier: user.identifier, senderNumber, proofName });
    setSub(getSubscription(user.identifier));
    setModal(null);
    setNotice("تم إرسال إثبات دفع الضريبة، سيتم مراجعته وتحويل الأرباح.");
    window.setTimeout(() => setNotice(null), 6000);
  }


  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground">
                $
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">Easy Money</p>
                <p className="text-xs text-muted-foreground">أهلاً {user.name}</p>
              </div>
            </div>
            <button
              onClick={() => {
                clearStoredUser();
                navigate({ to: "/", replace: true });
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              خروج
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate({ to: "/deposit" })}
              className="rounded-2xl bg-primary px-4 py-3 text-right font-bold text-primary-foreground transition hover:opacity-90"
            >
              <span className="block text-xs font-medium opacity-80">إيداع</span>
              إضافة رصيد ↓
            </button>
            <button
              onClick={() => setModal("withdraw")}
              className="rounded-2xl border border-accent/60 bg-accent/10 px-4 py-3 text-right font-bold text-accent transition hover:bg-accent/20"
            >
              <span className="block text-xs font-medium opacity-80">سحب</span>
              تحويل للحساب ↑
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={openPackages === "small" ? "default" : "secondary"}
              aria-expanded={openPackages === "small"}
              onClick={() => setOpenPackages((current) => (current === "small" ? null : "small"))}
              className="h-auto min-h-14 justify-between whitespace-normal rounded-lg px-4 py-3 text-right font-bold"
            >
              <span className="flex items-center gap-2">
                <WalletCards aria-hidden="true" />
                باقات الاستثمار الصغيرة
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`transition-transform ${openPackages === "small" ? "rotate-180" : ""}`}
              />
            </Button>
            <Button
              type="button"
              variant={openPackages === "large" ? "default" : "outline"}
              aria-expanded={openPackages === "large"}
              onClick={() => setOpenPackages((current) => (current === "large" ? null : "large"))}
              className="h-auto min-h-14 justify-between whitespace-normal rounded-lg px-4 py-3 text-right font-bold"
            >
              <span className="flex items-center gap-2">
                <Landmark aria-hidden="true" />
                باقات الاستثمار الضخمة
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`transition-transform ${openPackages === "large" ? "rotate-180" : ""}`}
              />
            </Button>
          </div>

          {openPackages && (
            <InvestmentPackages
              group={openPackages}
              packages={INVESTMENT_PACKAGES[openPackages]}
              activeAmount={sub?.amount ?? null}
              onSubscribe={handleSubscribe}
            />
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-5">
        {notice && (
          <p className="mb-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
            {notice}
          </p>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label="رصيد المحفظة" value={`${fmt(balance)} ج.م`} />
          <Stat
            label="أرباح الاستثمار"
            value={`${!sub && profit >= 0 ? "+" : ""}${fmt(profit)} ج.م`}
            tone={profit >= 0 ? "up" : "down"}
          />
          <Stat label="عدد الأسهم المتابعة" value={`${stocks.length}`} />
        </section>

        {sub && (
          <section className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">
                باقة {fmt(sub.amount)} ج.م — الاستلام {fmt(sub.returnAmount)} ج.م
              </p>
              <p className="text-sm text-muted-foreground">
                {subDone ? "تم اكتمال الباقة" : `الوقت المتبقي ${formatRemaining(remainingMs(sub, now))}`}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.round(progressOf(sub, now) * 100)}%` }}
              />
            </div>
            {subDone && (
              <p className="mt-3 text-sm text-primary">
                أرباح باقة {fmt(sub.amount)} ج.م جاهزة للسحب بعد دفع ضريبة الباقة ({fmt(sub.tax)} ج.م).
              </p>
            )}
          </section>
        )}


        <h2 className="mt-7 text-lg font-bold">حركة الأسهم المباشرة</h2>
        <p className="text-sm text-muted-foreground">
          أسعار تجريبية تتحدث تلقائياً كل ثانية تقريباً.
        </p>

        <section className="mt-3 space-y-2">
          {stocks.map((s) => (
            <StockRow key={s.symbol} stock={s} />
          ))}
        </section>

        {reqs.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-bold">طلباتي</h2>
            <ul className="mt-3 space-y-2">
              {reqs.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <span className={t.kind === "deposit" ? "text-primary" : "text-accent"}>
                    {t.kind === "deposit" ? "إيداع" : "سحب"} {fmt(t.amount)} ج.م
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.status === "pending"
                      ? "قيد المراجعة"
                      : t.status === "approved"
                        ? "تم التنفيذ"
                        : "مرفوض"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {modal && (
        <MoneyModal
          kind="withdraw"
          max={balance}
          subscription={sub}
          onClose={() => setModal(null)}
          onConfirm={applyWithdraw}
          onTaxProof={handleTaxProof}
        />
      )}
    </main>
  );
}

function InvestmentPackages({
  group,
  packages,
  activeAmount,
  onSubscribe,
}: {
  group: PackageGroup;
  packages: InvestmentPackage[];
  activeAmount: number | null;
  onSubscribe: (pkg: InvestmentPackage) => void;
}) {
  const isLarge = group === "large";

  return (
    <section
      aria-label={isLarge ? "باقات الاستثمار الضخمة" : "باقات الاستثمار الصغيرة"}
      className="grid gap-2 rounded-lg border border-border bg-background/95 p-3 shadow-2xl sm:grid-cols-2 lg:grid-cols-4"
    >
      {packages.map((item, index) => (
        <article
          key={item.amount}
          className={`relative overflow-hidden rounded-lg border bg-card p-4 ${
            isLarge ? "border-accent/35" : "border-primary/35"
          }`}
        >
          <div
            className={`absolute inset-y-0 right-0 w-1 ${isLarge ? "bg-accent" : "bg-primary"}`}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">باقة {index + 1}</p>
              <p className="mt-1 text-xl font-black tabular-nums">{fmt(item.amount)} ج.م</p>
            </div>
            <Gem
              aria-hidden="true"
              className={isLarge ? "text-accent" : "text-primary"}
            />
          </div>
          <div className="my-3 h-px bg-border" />
          <p className="text-xs text-muted-foreground">الاستلام المتوقع</p>
          <p className={`mt-1 text-lg font-black ${isLarge ? "text-accent" : "text-primary"}`}>
            {fmt(item.returnAmount)} ج.م
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-3.5" />
            خلال {item.duration}
          </p>
          <Button
            type="button"
            variant={activeAmount === item.amount ? "secondary" : "default"}
            disabled={activeAmount !== null}
            onClick={() => onSubscribe(item)}
            className="mt-3 w-full rounded-lg font-bold"
          >
            {activeAmount === item.amount ? "مشترك في الباقة" : "اشتراك في الباقة"}
          </Button>
        </article>
      ))}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          tone === "up" ? "text-primary" : tone === "down" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StockRow({ stock }: { stock: Stock }) {
  const up = stock.change >= 0;
  const prev = useRef(stock.price);
  const flash = stock.price > prev.current ? "up" : stock.price < prev.current ? "down" : null;
  prev.current = stock.price;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="min-w-24 flex-1">
        <p className="font-bold">{stock.name}</p>
        <p className="text-xs text-muted-foreground" dir="ltr">
          {stock.symbol}
        </p>
      </div>
      <svg viewBox="0 0 120 36" className="h-9 w-28 shrink-0" preserveAspectRatio="none">
        <path
          d={toPath(stock.history, 120, 36)}
          fill="none"
          strokeWidth="2"
          className={up ? "stroke-primary" : "stroke-destructive"}
          strokeLinecap="round"
        />
      </svg>
      <div className="min-w-24 text-left">
        <p
          className={`font-bold tabular-nums transition-colors duration-300 ${
            flash === "up" ? "text-primary" : flash === "down" ? "text-destructive" : ""
          }`}
          dir="ltr"
        >
          {fmt(stock.price)}
        </p>
        <p
          className={`text-xs tabular-nums ${up ? "text-primary" : "text-destructive"}`}
          dir="ltr"
        >
          {up ? "▲" : "▼"} {fmt(Math.abs(stock.change))}%
        </p>
      </div>
    </div>
  );
}

function MoneyModal({
  kind,
  max,
  subscription,
  onClose,
  onConfirm,
  onTaxProof,
}: {
  kind: "deposit" | "withdraw";
  max?: number | undefined;
  subscription?: Subscription | null;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  onTaxProof?: (senderNumber: string, proofName: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [senderNumber, setSenderNumber] = useState("");
  const [proofName, setProofName] = useState("");
  const amount = Number(raw);

  // الضريبة تظهر فقط للمشتركين في باقة ولم يدفعوا ضريبتها
  const needsTax = Boolean(subscription) && !subscription?.taxPaid;
  const tax = subscription ? (subscription.tax || PACKAGE_TAX[subscription.amount] || 0) : 0;

  if (needsTax && subscription) {
    return (
      <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center">
        <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-border bg-card p-6 text-right">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck aria-hidden="true" className="text-primary" />
            دفع ضريبة الباقة
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            عشان تتم عملية سحب أرباح باقة {fmt(subscription.amount)} ج.م، لازم تدفع ضريبة الباقة
            الأول.
          </p>
          <p className="mt-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
            الضريبة المطلوبة: {fmt(tax)} ج.م
          </p>

          <div className="mt-4 rounded-xl border border-border bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              1- حوّل الضريبة المطلوبة على الرقم ده لاستلام الأرباح مباشرة
            </p>
            <p className="mt-1 text-lg font-black tabular-nums" dir="ltr">
              {TAX_PHONE}
            </p>
          </div>

          <label className="mt-4 block text-xs text-muted-foreground">
            2- الرقم الذي تم التحويل منه
          </label>
          <input
            value={senderNumber}
            onChange={(e) => setSenderNumber(e.target.value.replace(/[^\d+]/g, ""))}
            inputMode="tel"
            dir="ltr"
            placeholder="01xxxxxxxxx"
            className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-3 outline-none focus:border-primary"
          />

          <label className="mt-4 block text-xs text-muted-foreground">3- إثبات التحويل</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setProofName(e.target.files?.[0]?.name ?? "")}
            className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
          />
          {proofName && <p className="mt-1 text-xs text-primary">{proofName}</p>}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => {
                if (senderNumber.trim().length < 8) return setError("اكتب رقم التحويل صح.");
                if (!proofName) return setError("أضف إثبات التحويل.");
                setError(null);
                onTaxProof?.(senderNumber.trim(), proofName);
              }}
              className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground"
            >
              إرسال إثبات الدفع
            </button>
            <button onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm">
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-right">
        <h3 className="text-lg font-bold">{kind === "deposit" ? "إيداع رصيد" : "سحب رصيد"}</h3>
        {kind === "deposit" ? (
          <p className="mt-1 text-sm text-muted-foreground">
            هنتنقل لصفحة فيها أرقام أورنج كاش للتحويل، هتضيف فيها إثبات التحويل وتكتب المبلغ.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {`المتاح للسحب: ${fmt(max ?? 0)} ج.م`}
            </p>
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              dir="ltr"
              placeholder="0.00"
              className="mt-4 w-full rounded-xl border border-input bg-background/60 px-3 py-3 text-lg outline-none focus:border-primary"
            />
            <div className="mt-3 flex gap-2">
              {[500, 1000, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setRaw(String(v))}
                  className="flex-1 rounded-lg bg-secondary py-2 text-sm"
                >
                  {v}
                </button>
              ))}
            </div>
          </>
        )}
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => {
              if (kind === "deposit") return onConfirm(0);
              if (!amount || amount <= 0) return setError("اكتب مبلغاً صحيحاً.");
              if (max !== undefined && amount > max) return setError("المبلغ أكبر من رصيدك.");
              onConfirm(amount);
            }}
            className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground"
          >
            تأكيد
          </button>
          <button onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-sm">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
