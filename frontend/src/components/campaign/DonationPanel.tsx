"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { activeChain } from "@/config/chains";
import { donate, donateShielded } from "@/lib/contracts/pharos";
import {
  generateCommitment,
  downloadRefundReceipt,
} from "@/lib/privacy/commitment";
import { Shield, Send, Download } from "lucide-react";
import { toast } from "sonner";

interface DonationPanelProps {
  campaignAddress: `0x${string}`;
  isActive: boolean;
  onDonated?: () => void;
}

export function DonationPanel({
  campaignAddress,
  isActive,
  onDonated,
}: DonationPanelProps) {
  const { authState, wallets, handleLogin, httpClient, session } = useTurnkey();
  const [amount, setAmount] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const presets = ["1", "10", "50", "100"];

  async function getWalletClient() {
    const walletAddress = wallets?.flatMap(w => w.accounts || [])
      .find(a => a.address?.startsWith("0x"))?.address;
    if (!httpClient || !walletAddress || !session?.organizationId) return null;

    const account = await createAccount({
      client: httpClient,
      organizationId: session.organizationId,
      signWith: walletAddress,
    });

    return createWalletClient({
      account,
      chain: activeChain,
      transport: http(),
    });
  }

  async function handleDonate() {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (authState !== "authenticated") {
      handleLogin();
      return;
    }

    setLoading(true);
    try {
      const wc = await getWalletClient();
      if (!wc) {
        toast.error("Wallet not ready");
        return;
      }

      const value = parseUnits(amount, 6);

      if (isPrivate) {
        const commitment = generateCommitment(value);
        downloadRefundReceipt(commitment, "donation", campaignAddress);

        const hash = await donateShielded(
          wc,
          campaignAddress,
          value,
          commitment.commitmentHash
        );
        toast.success("Private donation submitted!", {
          description: `Tx: ${hash.slice(0, 10)}...`,
        });
      } else {
        const hash = await donate(wc, campaignAddress, value);
        toast.success("Donation submitted!", {
          description: `Tx: ${hash.slice(0, 10)}...`,
        });
      }

      setAmount("");
      onDonated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-semibold text-[var(--color-ocean)] mb-4">
        Make a Donation
      </h3>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="text-sm text-[var(--color-muted)] mb-2 block">
          Amount (USDC)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          min="0"
          step="0.01"
          className="w-full px-4 py-3 rounded-xl border border-[var(--color-input-border)] text-lg font-mono focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
          disabled={!isActive}
        />
        <div className="flex gap-2 mt-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className="px-3 py-1 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:border-violet-500/40 hover:text-violet-300 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
            isPrivate
              ? "border-violet-500/50 bg-violet-900/20"
              : "border-[var(--color-border)] bg-[var(--color-surface-hover)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield
              className={`w-4 h-4 ${isPrivate ? "text-violet-400" : "text-[var(--color-muted)]"}`}
            />
            <span className="text-sm font-medium">Donate Privately</span>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-all ${isPrivate ? "bg-gradient-to-r from-violet-500 to-purple-500" : "bg-white/15"}`}
          >
            <div
              className={`w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-[18px]" : "translate-x-0.5"}`}
            />
          </div>
        </button>
        {isPrivate && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-yellow-900/20 border border-yellow-700/30">
            <Download className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300">
              A refund receipt will be downloaded. Keep it safe &mdash; you need
              it to claim a refund if the campaign fails.
            </p>
          </div>
        )}
      </div>

      {/* Donate Button */}
      <button
        onClick={handleDonate}
        disabled={loading || !isActive}
        className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <>
            <Send className="w-4 h-4" />
            {authState !== "authenticated"
              ? "Sign In to Donate"
              : isPrivate
                ? "Donate Privately"
                : "Donate"}
          </>
        )}
      </button>
    </div>
  );
}
