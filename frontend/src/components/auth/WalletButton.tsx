"use client";

import { useState, useRef, useEffect } from "react";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { truncateAddress } from "@/lib/utils/formatting";
import { Wallet, Copy, ExternalLink, LogOut, Check } from "lucide-react";

export function WalletButton() {
  const { handleLogin, authState, clientState, wallets, createWallet } = useTurnkey();

  function handleLogout() {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {/* ignore */}
    window.location.reload();
  }
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-create an Ethereum wallet for users who logged in before wallet creation was configured
  useEffect(() => {
    const hasEthAddress = wallets?.some(w =>
      w.accounts?.some(a => a.address?.startsWith("0x"))
    );
    if (authState !== "authenticated" || hasEthAddress || isCreatingWallet) return;

    setIsCreatingWallet(true);
    createWallet({
      walletName: "Pharos Wallet",
      accounts: ["ADDRESS_FORMAT_ETHEREUM"],
    }).catch(() => {/* silent */}).finally(() => setIsCreatingWallet(false));
  }, [authState, wallets, isCreatingWallet, createWallet]);

  // Prefund wallet with MON for gas on login
  useEffect(() => {
    const walletAddress = wallets?.flatMap(w => w.accounts || [])
      .find(a => a.address?.startsWith("0x"))?.address;
    if (authState !== "authenticated" || !walletAddress) return;

    fetch("/api/prefund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: walletAddress }),
    }).catch(() => {/* silent — non-critical */});
  }, [authState, wallets]);

  if (clientState === "loading") {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-[var(--color-surface-hover)] text-sm text-[var(--color-muted)] animate-pulse"
      >
        Loading...
      </button>
    );
  }

  if (authState !== "authenticated") {
    return (
      <button
        onClick={() => handleLogin()}
        className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        Sign In
      </button>
    );
  }

  const address = wallets?.flatMap(w => w.accounts || [])
    .find(a => a.address?.startsWith("0x"))?.address;

  if (!address) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-[var(--color-surface-hover)] text-sm text-[var(--color-muted)] animate-pulse"
      >
        Creating wallet...
      </button>
    );
  }

  const displayAddress = truncateAddress(address);

  function copyAddress() {
    navigator.clipboard.writeText(address!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-sm font-mono text-violet-300 hover:border-violet-500/40 transition-colors"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        {displayAddress}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#1A1726] border border-[var(--color-border)] rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden">
          {/* Address card */}
          <div className="p-4 border-b border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-muted)] mb-1 uppercase tracking-wider">
              Connected wallet
            </p>
            <p className="text-sm font-mono text-violet-300 break-all leading-relaxed">
              {address}
            </p>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={copyAddress}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-ocean)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
              )}
              {copied ? "Copied!" : "Copy address"}
            </button>

            <a
              href={`https://monad-testnet.socialscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-ocean)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
              View on explorer
            </a>

            <div className="my-1 border-t border-[var(--color-border)]" />

            <button
              onClick={() => {
                handleLogout?.();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
