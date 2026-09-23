import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Clock3, Gem, Landmark, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearStoredUser, getStoredUser, type StoredUser } from "@/lib/auth";
import { createStocks, fmt, tick, toPath, type Stock } from "@/lib/market";
import { addRequest, getBalance, userRequests, type MoneyRequest } from "@/lib/store";

type PackageGroup = "small" | "large";

type InvestmentPackage = {
  amount: number;
  returnAmount: number;
  duration: string;
};

const INVESTMENT_PACKAGES: Record<PackageGroup, InvestmentPackage[]> = {
  small: [
    { amount: 300, returnAmount: 3000, duration: "30 دقيقة" },
    { amount: 700, returnAmount: 7100, duration: "35 دقيقة" },
    { amount: 1500, returnAmount: 15000, duration: "45 دقيقة" },
  ],
  large: [
    { amount: 5000, returnAmount: 45000, duration: "ساعة واحدة" },
    { amount: 8000, returnAmount: 72000, duration: "ساعتين" },
    { amount: 12000, returnAmount: 86000, duration: "ساعتين" },
    { amount: 20000, returnAmount: 120000, duration: "ساعتين" },
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
  }, [navigate]);

  useEffect(() => {
    const id = window.setInterval(() => setStocks((s) => tick(s)), 1200);
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

  const profit = useMemo(
    () =>
      balance <= 0 ? 0 : stocks.reduce((acc, s) => acc + (s.change / 100) * (balance / 6), 0),
    [stocks, balance],
  );

  if (!user) return null;

  function applyWithdraw(amount: number) {
    if (!user) return;
    addRequest({ identifier: user.identifier, name: user.name, kind: "withdraw", amount });
    setReqs(userRequests(user.identifier));
    setModal(null);
    setNotice("تم إرسال طلب السحب، سيتم تنفيذه بعد مراجعة الإدارة.");
    window.setTimeout(() => setNotice(null), 5000);
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
            <InvestmentPackages group={openPackages} packages={INVESTMENT_PACKAGES[openPackages]} />
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
            value={`${profit >= 0 ? "+" : ""}${fmt(profit)} ج.م`}
            tone={profit >= 0 ? "up" : "down"}
          />
          <Stat label="عدد الأسهم المتابعة" value={`${stocks.length}`} />
        </section>

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
          onClose={() => setModal(null)}
          onConfirm={applyWithdraw}
        />
      )}
    </main>
  );
}

function InvestmentPackages({
  group,
  packages,
}: {
  group: PackageGroup;
  packages: InvestmentPackage[];
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
  onClose,
  onConfirm,
}: {
  kind: "deposit" | "withdraw";
  max?: number | undefined;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amount = Number(raw);

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
