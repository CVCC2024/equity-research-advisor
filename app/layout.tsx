import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Equity Research Advisor",
  description: "Multi-agent AI equity research platform for wealth management advisors",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <nav className="border-b border-slate-800 px-6 py-3 flex items-center gap-4 shrink-0">
          <a href="/" className="text-sm font-semibold text-slate-200 tracking-wide hover:text-white">
            ERA
          </a>
          <span className="text-slate-600 text-xs">Equity Research Advisor</span>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
