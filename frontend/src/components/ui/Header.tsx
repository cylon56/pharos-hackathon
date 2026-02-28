"use client";

import Link from "next/link";
import { WalletButton } from "@/components/auth/WalletButton";
import { PharosLogo } from "@/components/ui/PharosLogo";

export function Header() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[#0f0d1a]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <PharosLogo className="w-7 h-7 text-[var(--color-beacon)]" />
              <span className="text-xl font-bold text-[var(--color-ocean)]">
                Pharos
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-sm text-[var(--color-muted)] hover:text-violet-400 transition-colors"
              >
                Discover
              </Link>
              <Link
                href="/create"
                className="text-sm text-[var(--color-muted)] hover:text-violet-400 transition-colors"
              >
                Create
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-[var(--color-muted)] hover:text-violet-400 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/about"
                className="text-sm text-[var(--color-muted)] hover:text-violet-400 transition-colors"
              >
                About
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-900/30 text-xs font-medium text-violet-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Monad Testnet
            </span>
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}
