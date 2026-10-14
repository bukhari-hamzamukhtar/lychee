import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "LastBuy — component obsolescence, before the window shuts",
  description:
    "A supplier discontinues a component and gives you weeks. LastBuy reads the notice in any language, propagates it through the bill of materials, and tells you what breaks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-bg font-sans antialiased">
        <Providers>
          <Nav />
          {/* Pages carry their own container: the landing runs edge to edge. */}
          {children}
          <footer className="border-t border-line">
            <div className="mx-auto max-w-6xl px-6 py-10">
              <p className="max-w-3xl text-[11.5px] leading-relaxed text-dim">
                Impact figures are computed from the bill of materials by graph traversal,
                not generated. Documents are read and memos written by open models served on
                AMD GPUs, orchestrated through Evolus. Nothing is dispatched without a named
                approver. Data is synthetic.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
