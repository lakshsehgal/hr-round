import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neuroid Media — Careers",
  description: "Open roles at Neuroid Media. AI-assisted candidate screening.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between border-b border-border bg-bg/85 px-8 py-4 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-base font-bold tracking-tight">
              Neuroid<span className="text-accent">.</span>
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-xs font-medium uppercase tracking-widest text-muted">
            <Link href="/" className="transition-colors hover:text-fg">
              Careers
            </Link>
            <Link href="/admin" className="transition-colors hover:text-fg">
              Admin
            </Link>
          </nav>
        </header>
        <main className="pt-20">{children}</main>
        <footer className="mx-auto max-w-3xl px-8 py-10 text-xs text-muted">
          AI screening results are recommendations only — never final hiring decisions.
        </footer>
      </body>
    </html>
  );
}
