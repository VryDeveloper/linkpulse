import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinkPulse — encurtador de links com analytics",
  description: "Encurte links e veja de onde, quando e como as pessoas clicam.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="inline-block size-2.5 rounded-full bg-[var(--accent)]" />
              LinkPulse
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className="rounded-md px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
                Meus links
              </Link>
              <Link href="/demo" className="rounded-md px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">
                Demo ao vivo
              </Link>
              <a
                href="https://github.com/VryDeveloper/linkpulse"
                target="_blank"
                rel="noreferrer"
                className="rounded-md px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] max-sm:hidden"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
