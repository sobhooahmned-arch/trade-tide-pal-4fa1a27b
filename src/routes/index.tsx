import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  emailPattern,
  getStoredUser,
  phonePattern,
  storeUser,
  type StoredUser,
} from "@/lib/auth";
import {
  ADMIN_ID,
  ADMIN_NAME,
  ADMIN_PASSWORD,
  createAccount,
  findAccount,
  norm,
} from "@/lib/store";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Easy Money | منصة استثمار وتداول" },
      {
        name: "description",
        content:
          "سجّل دخولك بالبريد الإلكتروني أو رقم الموبايل وابدأ متابعة أسهمك وأرباحك لحظة بلحظة على منصة Easy Money.",
      },
      { property: "og:title", content: "Easy Money | منصة استثمار وتداول" },
      {
        property: "og:description",
        content: "دخول سريع، محفظة واضحة، وأسعار أسهم تتحرك لحظة بلحظة.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"loading" | "welcome" | "login">("loading");
  const [progress, setProgress] = useState(6);

  useEffect(() => {
    const existing = getStoredUser();
    if (existing) {
      navigate({ to: existing.isAdmin ? "/admin" : "/market", replace: true });
      return;
    }

    const int = window.setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : p + Math.random() * 14));
    }, 160);
    const to = window.setTimeout(() => setPhase("welcome"), 1800);
    return () => {
      window.clearInterval(int);
      window.clearTimeout(to);
    };
  }, [navigate]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card/90 p-7 shadow-2xl backdrop-blur">
        {phase === "loading" && <LoadingPanel progress={Math.min(progress, 100)} />}
        {phase === "welcome" && <WelcomePanel onStart={() => setPhase("login")} />}
        {phase === "login" && (
          <LoginPanel
            onDone={(user) => {
              storeUser(user);
              navigate({ to: user.isAdmin ? "/admin" : "/market", replace: true });
            }}
          />
        )}

      </div>
    </main>
  );
}

function Logo() {
  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
      $
    </div>
  );
}

function LoadingPanel({ progress }: { progress: number }) {
  return (
    <div className="py-6 text-center">
      <Logo />
      <h1 className="mt-5 text-2xl font-bold">Easy Money</h1>
      <p className="mt-2 text-sm text-muted-foreground">جارٍ تحضير منصة الاستثمار…</p>
      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{Math.round(progress)}%</p>
    </div>
  );
}

function WelcomePanel({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center">
      <Logo />
      <h1 className="mt-5 text-2xl font-bold">أهلاً بك في Easy Money 👋</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        منصة استثمار بسيطة وواضحة: تابع حركة الأسهم وأرباح المستثمرين لحظة بلحظة، وادِر
        عمليات الإيداع والسحب من مكان واحد.
      </p>
      <ul className="mt-5 space-y-2 text-right text-sm">
        {["متابعة مباشرة لأسعار الأسهم", "إيداع وسحب سريع", "ملخص واضح لأرباح محفظتك"].map(
          (t) => (
            <li key={t} className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
              <span className="text-primary">✓</span>
              {t}
            </li>
          ),
        )}
      </ul>
      <button
        onClick={onStart}
        className="mt-6 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition hover:opacity-90"
      >
        متابعة إلى تسجيل الدخول
      </button>
    </div>
  );
}

function LoginPanel({ onDone }: { onDone: (user: StoredUser) => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [value, setValue] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function login(v: string) {
    const account = findAccount(v);
    if (!account) return setError("لا يوجد حساب بهذا البيان. أنشئ حسابًا أولاً.");
    if (account.password !== password)
      return setError("كلمة المرور غير صحيحة لهذا الحساب.");
    setError(null);
    setBusy(true);
    window.setTimeout(
      () =>
        onDone({
          identifier: account.identifier,
          method: account.method,
          name: account.name,
          createdAt: account.createdAt,
        }),
      700,
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();

    // دخول الأدمن
    if (norm(v) === ADMIN_ID && password === ADMIN_PASSWORD && norm(name) === ADMIN_NAME) {
      setError(null);
      setBusy(true);
      window.setTimeout(
        () =>
          onDone({
            identifier: ADMIN_ID,
            method: "email",
            name: "الإدارة",
            createdAt: new Date().toISOString(),
            isAdmin: true,
          }),
        500,
      );
      return;
    }

    if (mode === "signup" && name.trim().length < 2)
      return setError("اكتب اسمك من فضلك.");
    if (method === "email" && !emailPattern.test(v))
      return setError("البريد الإلكتروني غير صحيح.");
    if (method === "phone" && !phonePattern.test(v.replace(/\s/g, "")))
      return setError("رقم الموبايل غير صحيح.");
    if (password.length < 4) return setError("كلمة المرور 4 أحرف على الأقل.");

    if (mode === "signup") {
      if (findAccount(v))
        return setError("يوجد حساب بهذا البيان بالفعل. سجّل دخولك بدلًا من ذلك.");
      createAccount({ identifier: v, method, name: name.trim(), password });
      setError(null);
      setInfo("تم إنشاء حسابك بنجاح. سجّل دخولك الآن.");
      setMode("login");
      setPassword("");
      return;
    }

    setInfo(null);
    login(v);
  }


  return (
    <form onSubmit={submit} className="text-right">
      <h1 className="text-xl font-bold">
        {mode === "signup" ? "إنشاء حساب" : "تسجيل الدخول"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mode === "signup"
          ? "أنشئ حسابك الجديد، وبعدها سجّل دخولك من خانة تسجيل الدخول."
          : "سيتم حفظ دخولك على هذا الجهاز، فلن نطلبه مرة أخرى."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {(
          [
            ["signup", "إنشاء حساب"],
            ["login", "تسجيل دخول"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key);
              setError(null);
              setInfo(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        {(
          [
            ["email", "البريد الإلكتروني"],
            ["phone", "رقم الموبايل"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMethod(key);
              setValue("");
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              method === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-sm font-medium">الاسم</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسمك بالكامل"
        className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-3 text-sm outline-none focus:border-primary"
      />

      <label className="mt-4 block text-sm font-medium">
        {method === "email" ? "البريد الإلكتروني" : "رقم الموبايل"}
      </label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode={method === "phone" ? "tel" : "email"}
        dir="ltr"
        placeholder={method === "email" ? "name@mail.com" : "+201234567890"}
        className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-3 text-sm outline-none focus:border-primary"
      />

      <label className="mt-4 block text-sm font-medium">كلمة المرور</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        dir="ltr"
        placeholder="••••••"
        className="mt-1 w-full rounded-xl border border-input bg-background/60 px-3 py-3 text-sm outline-none focus:border-primary"
      />

      {info && (
        <p className="mt-3 rounded-lg bg-primary/15 px-3 py-2 text-sm text-primary">
          {info}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {busy
          ? mode === "signup"
            ? "جارٍ إنشاء الحساب…"
            : "جارٍ الدخول…"
          : mode === "signup"
            ? "إنشاء الحساب"
            : "دخول"}
      </button>
    </form>
  );
}
