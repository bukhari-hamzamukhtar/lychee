import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { ThemeToggle, THEME_SCRIPT } from "@/components/ThemeToggle";
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
          {children}
          <footer className="border-t border-line">
            <div className="mx-auto max-w-[1320px] px-8 py-12">
              <div className="flex flex-wrap items-start justify-between gap-8">
                <div className="flex items-center gap-2.5 text-dim">
                  <Logo size={22} />
                  <span className="text-[13px] font-medium">LastBuy</span>
                </div>
                <p className="max-w-2xl text-[12.5px] leading-relaxed text-dim">
                  Impact figures are computed from the bill of materials by graph traversal,
                  not generated. Documents are read and memos written by open models served
                  on AMD GPUs, orchestrated through Evolus. Nothing is dispatched without a
                  named approver. All data shown is synthetic.
                </p>
              </div>
            </div>
          </footer>
          <ThemeToggle />
        </Providers>
      </body>
    </html>
  );
}
