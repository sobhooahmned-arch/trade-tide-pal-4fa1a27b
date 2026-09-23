export type StoredUser = {
  identifier: string;
  method: "email" | "phone";
  name: string;
  createdAt: string;
  isAdmin?: boolean;
};

const KEY = "wafr_user";

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: StoredUser) {
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  window.localStorage.removeItem(KEY);
}

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const phonePattern = /^[+]?[0-9]{8,15}$/;
