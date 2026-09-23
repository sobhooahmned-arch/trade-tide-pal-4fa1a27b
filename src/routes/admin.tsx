import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { clearStoredUser, getStoredUser } from "@/lib/auth";
import { fmt } from "@/lib/market";
import {
  getAccounts,
  getRequests,
  setRequestStatus,
  updateBalance,
  type Account,
  type MoneyRequest,
} from "@/lib/store";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | Easy Money" },
      {
        name: "description",
        content: "لوحة إدارة Easy Money: مراجعة طلبات الإيداع والسحب وإضافة الأرصدة للمستخدمين.",
      },
      { property: "og:title", content: "لوحة الإدارة | Easy Money" },
      {
        property: "og:description",
        content: "أضف أو اخصم أرصدة المستخدمين وراجع طلبات الإيداع والسحب.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setAccounts(getAccounts());
    setRequests(getRequests());
  }, []);

  useEffect(() => {
    const u = getStoredUser();
    if (!u?.isAdmin) {
      navigate({ to: "/", replace: true });
      return;
    }
    refresh();
    setReady(true);
  }, [navigate, refresh]);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  }

  function approve(req: MoneyRequest) {
    if (req.kind === "withdraw") {
      const bal = accounts.find((a) => a.identifier === req.identifier)?.balance ?? 0;
      if (req.amount > bal) return flash("رصيد المستخدم لا يكفي لتنفيذ السحب.");
    }
    updateBalance(req.identifier, req.kind === "deposit" ? req.amount : -req.amount);
    setRequestStatus(req.id, "approved");
    refresh();
    flash(
      req.kind === "deposit"
        ? `تمت إضافة ${fmt(req.amount)} ج.م إلى ${req.name}`
        : `تم خصم ${fmt(req.amount)} ج.م من ${req.name}`,
    );
  }

  function reject(req: MoneyRequest) {
    setRequestStatus(req.id, "rejected");
    refresh();
    flash("تم رفض الطلب.");
  }

  if (!ready) return null;

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending").slice(0, 12);

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground">
              $
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">لوحة الإدارة</p>
              <p className="text-xs text-muted-foreground">Easy Money</p>
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
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-5">
        {notice && (
          <p className="mb-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
            {notice}
          </p>
        )}

        <h2 className="text-lg font-bold">طلبات في انتظار المراجعة ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">لا توجد طلبات حالياً.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {r.name}{" "}
                      <span className={r.kind === "deposit" ? "text-primary" : "text-accent"}>
                        · {r.kind === "deposit" ? "إيداع" : "سحب"} {fmt(r.amount)} ج.م
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {r.identifier}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(r)}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                    >
                      موافقة
                    </button>
                    <button
                      onClick={() => reject(r)}
                      className="rounded-lg border border-border px-3 py-2 text-xs"
                    >
                      رفض
                    </button>
                  </div>
                </div>
                {r.proof && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-bold text-primary">
                      عرض إثبات التحويل
                    </summary>
                    <img
                      src={r.proof}
                      alt="إثبات التحويل"
                      className="mt-2 max-h-72 w-full rounded-xl object-contain"
                    />
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}

        <h2 className="mt-8 text-lg font-bold">حسابات المستخدمين ({accounts.length})</h2>
        {accounts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">لا يوجد مستخدمون مسجلون بعد.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {accounts.map((a) => (
              <UserRow
                key={a.identifier}
                account={a}
                onChange={(delta) => {
                  updateBalance(a.identifier, delta);
                  refresh();
                  flash(
                    delta >= 0
                      ? `تمت إضافة ${fmt(delta)} ج.م إلى ${a.name}`
                      : `تم خصم ${fmt(-delta)} ج.م من ${a.name}`,
                  );
                }}
              />
            ))}
          </ul>
        )}

        {history.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-bold">سجل الطلبات</h2>
            <ul className="mt-3 space-y-2">
              {history.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  <span>
                    {r.name} · {r.kind === "deposit" ? "إيداع" : "سحب"} {fmt(r.amount)} ج.م
                  </span>
                  <span
                    className={`text-xs ${
                      r.status === "approved" ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {r.status === "approved" ? "تم التنفيذ" : "مرفوض"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function UserRow({
  account,
  onChange,
}: {
  account: Account;
  onChange: (delta: number) => void;
}) {
  const [raw, setRaw] = useState("");
  const amount = Number(raw);

  return (
    <li className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-bold">{account.name}</p>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {account.identifier}
          </p>
        </div>
        <p className="text-sm font-bold text-primary">{fmt(account.balance)} ج.م</p>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          dir="ltr"
          placeholder="المبلغ"
          className="flex-1 rounded-xl border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => {
            if (!amount || amount <= 0) return;
            onChange(amount);
            setRaw("");
          }}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
        >
          إضافة
        </button>
        <button
          onClick={() => {
            if (!amount || amount <= 0) return;
            onChange(-amount);
            setRaw("");
          }}
          className="rounded-xl border border-border px-3 py-2 text-xs"
        >
          خصم
        </button>
      </div>
    </li>
  );
}
