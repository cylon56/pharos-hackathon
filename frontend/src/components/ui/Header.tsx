"use client";

import Link from "next/link";
import { WalletButton } from "@/components/auth/WalletButton";
import { Shield } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="w-7 h-7 text-[var(--color-teal)]" />
              <span className="text-xl font-bold text-[var(--color-navy)]">
                Pharos
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] transition-colors"
              >
                Discover
              </Link>
              <Link
                href="/create"
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] transition-colors"
              >
                Create
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] transition-colors"
              >
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Monad Testnet
            </span>
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}
