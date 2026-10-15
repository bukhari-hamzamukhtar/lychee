"use client";

/**
 * Accounts, in the browser.
 *
 * Be clear about what this is. There is no server holding these: an account
 * lives in this browser's storage and nowhere else, which means it does not
 * protect anything from anyone with access to this machine, and signing in on a
 * different device will not find your work. It is a way to keep two people's
 * workspaces apart on a shared laptop, not a security boundary.
 *
 * It is written honestly anyway — passwords are salted and hashed rather than
 * stored, because a demo that keeps plaintext passwords in localStorage teaches
 * the wrong thing to whoever reads it next, and because people reuse passwords
 * even on things they are told not to.
 *
 * Making this real means a server, a database and a session cookie. The shape
 * here is deliberately the shape that would survive that change: the workspace
 * is already keyed by account id, so the store does not care where the account
 * came from.
 */

const ACCOUNTS_KEY = "lastbuy.accounts.v1";
const SESSION_KEY = "lastbuy.session.v1";

export interface Account {
  id: string;
  email: string;
  name: string;
  /** Hex SHA-256 of salt + password. Never the password. */
  hash: string;
  salt: string;
  createdAt: string;
}

/** The account every visitor gets if they would rather not make one. */
export const GUEST: Account = {
  id: "guest",
  email: "guest@local",
  name: "Guest",
  hash: "",
  salt: "",
  createdAt: "1970-01-01T00:00:00.000Z",
};

function readAll(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Account[]) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* private mode or a full quota; the session still works in memory */
  }
}

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function hashPassword(password: string, salt: string): Promise<string> {
  // SubtleCrypto needs a secure context; localhost counts, and so does https.
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser will not hash passwords on an insecure connection.");
  }
  const data = new TextEncoder().encode(`${salt}:${password}`);
  return hex(await globalThis.crypto.subtle.digest("SHA-256", data));
}

function newSalt(): string {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return hex(b.buffer);
}

const normalise = (email: string) => email.trim().toLowerCase();

export interface AuthResult {
  account?: Account;
  error?: string;
}

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  const id = normalise(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)) return { error: "That is not an email address." };
  if (password.length < 8) return { error: "Use at least eight characters." };

  const all = readAll();
  if (all.some((a) => a.email === id)) {
    return { error: "There is already an account with that address in this browser." };
  }

  const salt = newSalt();
  const account: Account = {
    id: `U${Date.now().toString(36)}`,
    email: id,
    name: name.trim() || id.split("@")[0],
    salt,
    hash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  writeAll([...all, account]);
  return { account };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const id = normalise(email);
  const account = readAll().find((a) => a.email === id);
  // The same message either way, so this cannot be used to discover which
  // addresses have accounts.
  const wrong = { error: "That email and password do not match an account here." };
  if (!account) return wrong;
  const hash = await hashPassword(password, account.salt);
  return hash === account.hash ? { account } : wrong;
}

export function rememberSession(accountId: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, accountId);
  } catch {
    /* nothing to do; the session lasts until reload */
  }
}

export function forgetSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to do */
  }
}

/** Whoever this browser was last signed in as, if anyone. */
export function currentAccount(): Account | null {
  if (typeof window === "undefined") return null;
  let id: string | null = null;
  try {
    id = window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!id) return null;
  if (id === GUEST.id) return GUEST;
  return readAll().find((a) => a.id === id) ?? null;
}

export function accountCount(): number {
  return readAll().length;
}
