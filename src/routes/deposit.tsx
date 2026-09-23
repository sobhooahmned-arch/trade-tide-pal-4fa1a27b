import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clearStoredUser, getStoredUser, type StoredUser } from "@/lib/auth";
import { fmt } from "@/lib/market";
import {
  addRequest,
  depositBanUntil,
  getBalance,
  pendingDeposit,
  userRequests,
  type MoneyRequest,
} from "@/lib/store";

const NUMBERS = ["01201838463", "01208895415"];

export const Route = createFileRoute("/deposit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إيداع رصيد | Easy Money" },
      {
        name: "description",
        content:
          "حوّل المبلغ على أرقام أورنج كاش، أرفق إثبات التحويل، واكتب المبلغ لإتمام طلب الإيداع.",
      },
      { property: "og:title", content: "إيداع رصيد | Easy Money" },
      {
        property: "og:description",
        content: "أرقام أورنج كاش للتحويل، إرفاق إثبات التحويل، وتأكيد طلب الإيداع.",
      },
    ],
  }),
  component: DepositPage,
});

async function fileToDataUrl(file: File): Promise<string> {
  const readAsDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read-failed"));
      reader.readAsDataURL(file);
    });
  const raw = await readAsDataUrl();
  if (raw.length < 400_000) return raw;

  // ضغط الصورة الكبيرة حتى لا تتجاوز حجم التخزين المحلي
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode-failed"));
    image.src = raw;
  });
  const scale = Math.min(1, 720 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

function DepositPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [balance, setBalance] = useState(0);
  const [reqs, setReqs] = useState<MoneyRequest[]>([]);
  const [amount, setAmount] = useState("");
  const [proof, setProof] = useState<{ dataUrl: string; name: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"form" | "pending" | "banned">("form");
  const [banLeft, setBanLeft] = useState(0);

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
    if (pendingDeposit(u.identifier)) {
      setView("pending");
      return;
    }
    const until = depositBanUntil(u.identifier);
    if (until) {
      setBanLeft(until - Date.now());
      setView("banned");
    }
  }, [navigate]);

  useEffect(() => {
    if (view !== "banned") return;
    const t = window.setInterval(() => {
      setBanLeft((left) => {
        if (left <= 1000) {
          window.clearInterval(t);
          setView("form");
          return 0;
        }
        return left - 1000;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [view]);

  if (!user) return null;
  const activeUser = user;

  async function copyNumber(num: string) {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(num);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("لم يتم النسخ، انسخ الرقم يدوياً.");
      window.setTimeout(() => setError(null), 3000);
    }
  }

  async function pickProof(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 8_000_000) {
      setError("حجم الصورة كبير جداً، اختر صورة أصغر من 8 ميجا.");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setProof({ dataUrl, name: file.name });
    } catch {
      setError("تعذر قراءة الصورة، جرّب صورة أخرى.");
    }
  }

  function submit() {
    const value = Number(amount);
    if (!value || value <= 0) return setError("اكتب المبلغ الذي حوّلته.");
    if (value > 1_000_000) return setError("المبلغ أكبر من الحد المسموح.");
    if (!proof) return setError("أرفق صورة إثبات التحويل أولاً.");
    if (pendingDeposit(activeUser.identifier)) {
      setView("pending");
      return;
    }
    const until = depositBanUntil(activeUser.identifier);
    if (until) {
      setBanLeft(until - Date.now());
      setView("banned");
      return;
    }
    addRequest({
      identifier: activeUser.identifier,
      name: activeUser.name,
      kind: "deposit",
      amount: value,
      proof: proof.dataUrl,
      proofName: proof.name,
    });
    setReqs(userRequests(activeUser.identifier));
    setView("pending");
  }

  return (
    <main className="min-h-screen pb-16">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-black text-primary-foreground">
              $
            </span>
            <div>
              <p className="text-sm font-bold leading-tight">إيداع رصيد</p>
              <p className="text-xs text-muted-foreground">أهلاً {user.name}</p>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/market", replace: true })}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            رجوع
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pt-5">
        {error && (
          <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            حوّل المبلغ على أحد أرقام أورنج كاش التالية، ثم أرفق إثبات التحويل واكتب المبلغ.
          </p>
          <p className="mt-2 text-sm">
            رصيدك الحالي: <span className="font-bold text-primary">{fmt(balance)} ج.م</span>
          </p>
        </div>

        {view === "pending" && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 px-5 py-8 text-center">
            <p className="text-2xl">⏳</p>
            <p className="mt-2 text-lg font-bold text-primary">
              طلب الإيداع الخاص بك تحت المراجعة
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              لا يمكنك إرسال طلب إيداع جديد حتى تتم مراجعة طلبك الحالي من الإدارة.
              سيُضاف الرصيد إلى حسابك فور الموافقة.
            </p>
            <button
              onClick={() => navigate({ to: "/market", replace: true })}
              className="mt-5 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              العودة إلى السوق
            </button>
          </div>
        )}

        {view === "banned" && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-8 text-center">
            <svg viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-destructive" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M5.5 5.5l13 13" strokeLinecap="round" />
            </svg>
            <p className="mt-2 text-lg font-bold text-destructive">تم رفض طلبك السابق</p>
            <p className="mt-2 text-sm text-muted-foreground">
              لا يمكنك إرسال طلب إيداع جديد قبل انتهاء المهلة.
            </p>
            <p className="mt-3 text-xl font-bold tabular-nums text-destructive" dir="ltr">
              {String(Math.floor(banLeft / 60000)).padStart(2, "0")}:
              {String(Math.floor((banLeft % 60000) / 1000)).padStart(2, "0")}
            </p>
            <button
              onClick={() => navigate({ to: "/market", replace: true })}
              className="mt-5 rounded-xl border border-border px-6 py-3 text-sm font-bold"
            >
              العودة إلى السوق
            </button>
          </div>
        )}

        {view === "form" && (
          <>
        <h2 className="mt-6 text-lg font-bold">أرقام أورنج كاش للتحويل</h2>
        <section className="mt-3 space-y-2">
          {NUMBERS.map((num, i) => (
            <div
              key={num}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-4"
            >
              <div>
                <p className="text-xs text-muted-foreground">
                  أورنج كاش {i === 0 ? "١" : "٢"}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums" dir="ltr">
                  {num}
                </p>
              </div>
              <button
                onClick={() => copyNumber(num)}
                aria-label={`نسخ الرقم ${num}`}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90"
              >
                {copied === num ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 012-2h10" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          ))}
          {copied && (
            <p className="text-sm text-primary">تم نسخ الرقم {copied} ✓</p>
          )}
        </section>

        <h2 className="mt-8 text-lg font-bold">إثبات التحويل</h2>
        <label
          htmlFor="proof-input"
          className="mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/50 bg-primary/5 px-4 py-6 text-center transition hover:bg-primary/10"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-primary">اضغط لإضافة إثبات التحويل</span>
          <span className="text-xs text-muted-foreground">صورة من صور جهازك (إيصال التحويل)</span>
          <input
            id="proof-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickProof(e.target.files?.[0])}
          />
        </label>
        {proof && (
          <div className="mt-3 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">تم إرفاق الإثبات ✓</p>
              <button
                onClick={() => setProof(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                إزالة
              </button>
            </div>
            <img
              src={proof.dataUrl}
              alt="إثبات التحويل"
              className="mt-2 max-h-56 w-full rounded-xl object-contain"
            />
          </div>
        )}

        <h2 className="mt-8 text-lg font-bold">المبلغ المحوّل</h2>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          dir="ltr"
          placeholder="0.00"
          className="mt-3 w-full rounded-2xl border border-input bg-background/60 px-4 py-4 text-xl outline-none focus:border-primary"
        />
        <div className="mt-3 flex gap-2">
          {[500, 1000, 5000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-bold"
            >
              {v}
            </button>
          ))}
        </div>

        <button
          onClick={submit}
          className="mt-6 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground transition hover:opacity-90"
        >
          تأكيد طلب الإيداع
        </button>
          </>
        )}
      </div>
    </main>
  );
}
