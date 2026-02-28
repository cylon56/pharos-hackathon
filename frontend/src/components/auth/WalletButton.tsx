"use client";

import { useTurnkey } from "@turnkey/react-wallet-kit";
import { truncateAddress } from "@/lib/utils/formatting";
import { LogOut, Wallet } from "lucide-react";

export function WalletButton() {
  const { handleLogin, authState, clientState, wallets, user } = useTurnkey();

  if (clientState === "loading") {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-gray-100 text-sm text-[var(--color-muted)] animate-pulse"
      >
        Loading...
      </button>
    );
  }

  if (authState !== "authenticated") {
    return (
      <button
        onClick={() => handleLogin()}
        className="px-4 py-2 rounded-lg bg-[var(--color-navy)] text-white text-sm font-medium hover:bg-[var(--color-navy-light)] transition-colors flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        Sign In
      </button>
    );
  }

  const address =
    wallets?.[0]?.accounts?.[0]?.address || user?.userName || "Connected";

  return (
    <div className="flex items-center gap-2">
      <span className="px-3 py-2 rounded-lg bg-gray-50 border border-[var(--color-border)] text-sm font-mono">
        {address.startsWith("0x") ? truncateAddress(address) : address}
      </span>
    </div>
  );
}
