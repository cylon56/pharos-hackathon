"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { formatUnits } from "viem";
import { truncateAddress } from "@/lib/utils/formatting";
import { publicClient } from "@/lib/contracts/pharos";
import { USDC_ADDRESS } from "@/config/contracts";
import { ERC20_ABI } from "@/lib/contracts/abis";
import {
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
  Check,
  Zap,
  Droplets,
} from "lucide-react";

export function WalletButton() {
  const { handleLogin, authState, clientState, wallets, createWallet } =
    useTurnkey();

  function handleLogout() {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  }

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [monBalance, setMonBalance] = useState<bigint | null>(null);
  const [isRequestingMon, setIsRequestingMon] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Derive address early so it's available in effects
  const ethAddress = wallets
    ?.flatMap((w) => w.accounts || [])
    .find((a) => a.address?.startsWith("0x"))?.address;

  const fetchBalances = useCallback(async () => {
    if (!ethAddress) return;
    try {
      const [usdc, mon] = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [ethAddress as `0x${string}`],
        }),
        publicClient.getBalance({ address: ethAddress as `0x${string}` }),
      ]);
      setUsdcBalance(usdc as bigint);
      setMonBalance(mon as bigint);
    } catch {
      /* silent */
    }
  }, [ethAddress]);

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
    const hasEthAddress = wallets?.some((w) =>
      w.accounts?.some((a) => a.address?.startsWith("0x"))
    );
    if (authState !== "authenticated" || hasEthAddress || isCreatingWallet)
      return;

    setIsCreatingWallet(true);
    createWallet({
      walletName: "Pharos Wallet",
      accounts: ["ADDRESS_FORMAT_ETHEREUM"],
    })
      .catch(() => {
        /* silent */
      })
      .finally(() => setIsCreatingWallet(false));
  }, [authState, wallets, isCreatingWallet, createWallet]);

  // Prefund wallet with MON for gas on login
  useEffect(() => {
    if (authState !== "authenticated" || !ethAddress) return;
    fetch("/api/prefund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: ethAddress }),
    }).catch(() => {
      /* silent — non-critical */
    });
  }, [authState, ethAddress]);

  // Fetch balances when address is known
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Refresh balances each time the dropdown is opened
  useEffect(() => {
    if (open) fetchBalances();
  }, [open, fetchBalances]);

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

  if (!ethAddress) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-[var(--color-surface-hover)] text-sm text-[var(--color-muted)] animate-pulse"
      >
        Creating wallet...
      </button>
    );
  }

  const address = ethAddress;
  const displayAddress = truncateAddress(address);

  const usdcFormatted =
    usdcBalance !== null
      ? parseFloat(formatUnits(usdcBalance, 6)).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  const monFormatted =
    monBalance !== null
      ? parseFloat(formatUnits(monBalance, 18)).toLocaleString("en-US", {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })
      : null;

  const hasNoUsdc = usdcBalance !== null && usdcBalance === 0n;

  function copyAddress() {
    navigator.clipboard.writeText(address!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function requestMon() {
    setIsRequestingMon(true);
    try {
      await fetch("/api/prefund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const newMon = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      setMonBalance(newMon);
    } catch {
      /* silent */
    } finally {
      setIsRequestingMon(false);
    }
  }

  async function handleGetUsdc() {
    // Auto-fund MON for gas if the wallet has very little
    const monThreshold = BigInt("50000000000000000"); // 0.05 MON
    if (monBalance !== null && monBalance < monThreshold) {
      await fetch("/api/prefund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      }).catch(() => {});
    }
    window.open("https://faucet.circle.com/", "_blank");
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
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#1A1726] border border-[var(--color-border)] rounded-xl shadow-xl shadow-black/40 z-50 overflow-hidden">
          {/* Address */}
          <div className="p-4 border-b border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-muted)] mb-1 uppercase tracking-wider">
              Connected wallet
            </p>
            <p className="text-sm font-mono text-violet-300 break-all leading-relaxed">
              {address}
            </p>
          </div>

          {/* Balances */}
          <div className="px-4 py-3 border-b border-[var(--color-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-muted)]">USDC</span>
              <span className="text-sm font-mono text-[var(--color-ocean)]">
                {usdcFormatted !== null ? `${usdcFormatted}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-muted)]">MON (gas)</span>
              <span className="text-sm font-mono text-[var(--color-ocean)]">
                {monFormatted !== null ? `${monFormatted}` : "—"}
              </span>
            </div>
          </div>

          {/* USDC faucet prompt — only shown when balance is 0 */}
          {hasNoUsdc && (
            <div className="px-4 py-3 border-b border-[var(--color-border)] bg-violet-900/10">
              <p className="text-xs text-violet-300 mb-2.5 leading-relaxed">
                You need testnet USDC to donate. Get some from Circle&apos;s
                faucet — we&apos;ll top up your MON for gas automatically.
              </p>
              <button
                onClick={handleGetUsdc}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                <Droplets className="w-4 h-4" />
                Get Testnet USDC
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={requestMon}
              disabled={isRequestingMon}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-yellow-400 hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4 shrink-0" />
              {isRequestingMon ? "Sending MON..." : "Get 0.5 MON for gas"}
            </button>

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
