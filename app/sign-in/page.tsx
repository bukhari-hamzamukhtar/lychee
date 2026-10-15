"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/store";
import { signIn, signUp, GUEST } from "@/lib/auth";
import { Button, PageHead } from "@/components/ui";

/**
 * Signing in, with the limitation said out loud.
 *
 * It would be easy to render this page exactly as a real product does and let
 * people assume there is a server behind it. There is not, and someone trying
 * this on one machine and then opening it on another would find their work
 * missing with no explanation. So the page says where accounts live before
 * anyone types a password into it.
 */
export default function SignInPage() {
  const router = useRouter();
  const { adopt, account } = useWorkspace();

  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = mode === "in" ? await signIn(email, password) : await signUp(email, password, name);
      if (r.error || !r.account) {
        setError(r.error ?? "That did not work.");
        return;
      }
      adopt(r.account);
      router.push("/notices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full border border-line bg-transparent px-4 py-2.5 text-[14.5px] outline-none transition-colors placeholder:text-dim focus:border-line-bright";

  return (
    <div className="mx-auto max-w-[1320px] px-8 pb-28 pt-12">
      <PageHead
        title={mode === "in" ? "Sign in" : "Create an account"}
        meta="Keeps one person's bill of materials separate from another's on a shared machine."
      />

      <div className="grid gap-14 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-dim">Name</span>
              <input
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Procurement lead"
                autoComplete="name"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[13px] text-dim">Email</span>
            <input
              className={field}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] text-dim">Password</span>
            <input
              className={field}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "up" ? "at least eight characters" : ""}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
          </label>

          {error && (
            <p className="border border-crit/50 px-4 py-3 text-[13px] text-crit">{error}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button tone="accent" type="submit" disabled={busy}>
              {busy ? "Working" : mode === "in" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError(null);
              }}
              className="text-[13.5px] text-dim underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              {mode === "in" ? "Create one instead" : "I already have one"}
            </button>
          </div>

          <div className="border-t border-line pt-4">
            <button
              type="button"
              onClick={() => {
                adopt(GUEST);
                router.push("/notices");
              }}
              className="text-[13.5px] text-dim underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              Carry on without an account
            </button>
            <p className="mt-1.5 text-[12px] text-dim">
              Everything works. The workspace is just shared with anyone else using this
              browser.
            </p>
          </div>
        </form>

        <aside className="max-w-[56ch] space-y-4 border-l border-line pl-8 text-[13.5px] leading-relaxed text-mid">
          <p className="text-fg">Where these accounts live</p>
          <p>
            In this browser, and nowhere else. There is no server behind this screen, so an
            account made here will not be found on another machine, and signing out does not
            put your bill of materials beyond the reach of anyone who can open this laptop.
          </p>
          <p>
            Passwords are salted and hashed rather than stored, which is the right habit
            even when the thing being protected is a demo — people reuse passwords on
            things they are told not to.
          </p>
          <p className="text-dim">
            Making it real means a server, a database and a session cookie. The workspace is
            already filed under an account id, so that change would not disturb anything
            above it.
          </p>
          {account && account.id !== GUEST.id && (
            <p className="border-t border-line pt-4 text-fg">
              You are already signed in as {account.email}.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
