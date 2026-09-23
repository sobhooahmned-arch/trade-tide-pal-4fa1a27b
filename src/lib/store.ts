export const ADMIN_ID = "aa";
export const ADMIN_PASSWORD = "Aa642008Aa#";
export const ADMIN_NAME = "aa";

export type Account = {
  identifier: string;
  method: "email" | "phone";
  name: string;
  password: string;
  balance: number;
  createdAt: string;
};

export type MoneyRequest = {
  id: string;
  identifier: string;
  name: string;
  kind: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  at: string;
  decidedAt?: string;
  proof?: string;
  proofName?: string;
};

const ACCOUNTS_KEY = "em_accounts";
const REQUESTS_KEY = "em_requests";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function norm(v: string) {
  return v.trim().toLowerCase();
}

export function getAccounts(): Account[] {
  return read<Account>(ACCOUNTS_KEY);
}

export function findAccount(identifier: string): Account | null {
  const id = norm(identifier);
  return getAccounts().find((a) => norm(a.identifier) === id) ?? null;
}

export function createAccount(input: {
  identifier: string;
  method: "email" | "phone";
  name: string;
  password: string;
}): Account {
  const account: Account = {
    identifier: input.identifier.trim(),
    method: input.method,
    name: input.name.trim(),
    password: input.password,
    balance: 0,
    createdAt: new Date().toISOString(),
  };
  write(ACCOUNTS_KEY, [...getAccounts(), account]);
  return account;
}

export function updateBalance(identifier: string, delta: number): number {
  const id = norm(identifier);
  const accounts = getAccounts().map((a) =>
    norm(a.identifier) === id ? { ...a, balance: Math.max(0, a.balance + delta) } : a,
  );
  write(ACCOUNTS_KEY, accounts);
  return accounts.find((a) => norm(a.identifier) === id)?.balance ?? 0;
}

export function getBalance(identifier: string): number {
  return findAccount(identifier)?.balance ?? 0;
}

export function getRequests(): MoneyRequest[] {
  return read<MoneyRequest>(REQUESTS_KEY);
}

export function addRequest(input: {
  identifier: string;
  name: string;
  kind: "deposit" | "withdraw";
  amount: number;
  proof?: string;
  proofName?: string;
}): MoneyRequest {
  const req: MoneyRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    identifier: input.identifier,
    name: input.name,
    kind: input.kind,
    amount: input.amount,
    status: "pending",
    at: new Date().toISOString(),
  };
  if (input.proof !== undefined) {
    req.proof = input.proof;
    if (input.proofName !== undefined) req.proofName = input.proofName;
  }
  write(REQUESTS_KEY, [req, ...getRequests()]);
  return req;
}

export function setRequestStatus(id: string, status: "approved" | "rejected") {
  write(
    REQUESTS_KEY,
    getRequests().map((r) =>
      r.id === id ? { ...r, status, decidedAt: new Date().toISOString() } : r,
    ),
  );
}

export const DEPOSIT_BAN_MS = 15 * 60 * 1000;

/** طلب إيداع قيد المراجعة للمستخدم (إن وجد) */
export function pendingDeposit(identifier: string): MoneyRequest | null {
  return (
    userRequests(identifier).find((r) => r.kind === "deposit" && r.status === "pending") ??
    null
  );
}

/** وقت انتهاء حظر الإيداع (timestamp) بعد رفض آخر طلب، أو null */
export function depositBanUntil(identifier: string): number | null {
  const lastRejected = userRequests(identifier)
    .filter((r) => r.kind === "deposit" && r.status === "rejected" && r.decidedAt)
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))[0];
  if (!lastRejected?.decidedAt) return null;
  const until = new Date(lastRejected.decidedAt).getTime() + DEPOSIT_BAN_MS;
  return until > Date.now() ? until : null;
}

export function userRequests(identifier: string): MoneyRequest[] {
  const id = norm(identifier);
  return getRequests().filter((r) => norm(r.identifier) === id);
}
