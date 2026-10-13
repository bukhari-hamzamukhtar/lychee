import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LastBuy",
  description: "Component obsolescence impact, before the last-buy date closes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-edge">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-baseline gap-3">
              <span className="text-lg font-semibold tracking-tight">LastBuy</span>
              <span className="text-xs text-white/40">obsolescence impact</span>
            </div>
            <span className="rounded border border-edge px-2 py-1 text-xs text-white/50">
              synthetic data
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
