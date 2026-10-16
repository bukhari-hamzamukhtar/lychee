import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { ExampleBanner } from "@/components/ExampleBanner";
import { NoDataNotice } from "@/components/NoDataNotice";
import { ThemeToggle, THEME_SCRIPT } from "@/components/ThemeToggle";
import { Assistant } from "@/components/Assistant";
import { Logo } from "@/components/Logo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "LastBuy — know what a discontinued part breaks",
  description:
    "Suppliers discontinue components with weeks of notice. LastBuy reads the notice in any language, traces the part through your bill of materials, and tells you what it costs to keep building.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Applied before first paint, so the page never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-bg font-sans text-[16.5px] leading-relaxed antialiased">
        <Providers>
          <Nav />
          <ExampleBanner />
          <NoDataNotice />
          {children}
          <footer className="border-t border-line">
            <div className="mx-auto max-w-[1320px] px-8 py-12">
              <div className="flex flex-wrap items-start justify-between gap-8">
                <div className="flex items-center gap-2.5 text-dim">
                  <Logo size={22} />
                  <span className="text-[13px] font-medium">LastBuy</span>
                </div>
                <p className="max-w-2xl text-[12.5px] leading-relaxed text-dim">
                  Impact figures are computed from the bill of materials by graph
                  traversal, not generated. Nothing is dispatched without a named approver.
                  The workspace starts empty; the example factory is synthetic and is
                  labelled wherever it appears.
                </p>
              </div>
              <dl className="grid gap-x-8 gap-y-2 border-t border-line pt-6 text-[12px] sm:grid-cols-3">
                <div>
                  <dt className="text-dim">Inference</dt>
                  <dd className="mt-0.5 font-mono text-mid">developer.amd.com.cn/radeon</dd>
                  <dd className="text-dim">MinerU2.5-Pro · Gemma-4-31B-IT on AMD Instinct</dd>
                </div>
                <div>
                  <dt className="text-dim">Evolus workspace</dt>
                  <dd className="mt-0.5 font-mono text-mid">lychee</dd>
                  <dd className="text-dim">agent, AI Tools, knowledge library</dd>
                </div>
                <div>
                  <dt className="text-dim">Impact engine</dt>
                  <dd className="mt-0.5 font-mono text-mid">lib/graph.ts</dd>
                  <dd className="text-dim">deterministic, no model involved</dd>
                </div>
              </dl>
            </div>
          </footer>
          <ThemeToggle />
          <Assistant />
        </Providers>
      </body>
    </html>
  );
}
