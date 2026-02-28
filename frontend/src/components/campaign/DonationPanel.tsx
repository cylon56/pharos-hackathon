"use client";

import { useState } from "react";
import { parseEther } from "viem";
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
  const { authState, wallets, handleLogin, httpClient } = useTurnkey();
  const [amount, setAmount] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const presets = ["0.1", "1", "5", "10"];

  async function getWalletClient() {
    if (!httpClient || !wallets?.[0]?.accounts?.[0]?.address) return null;

    const walletAddress = wallets[0].accounts[0].address;
    const account = await createAccount({
      client: httpClient,
      organizationId: httpClient.config.organizationId,
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

      const value = parseEther(amount);

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
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-4">
        Make a Donation
      </h3>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="text-sm text-[var(--color-muted)] mb-2 block">
          Amount (MON)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          min="0"
          step="0.01"
          className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
          disabled={!isActive}
        />
        <div className="flex gap-2 mt-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className="px-3 py-1 rounded-md bg-gray-50 border border-[var(--color-border)] text-sm hover:bg-gray-100 transition-colors"
            >
              {p} MON
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
            isPrivate
              ? "border-[var(--color-teal)] bg-emerald-50"
              : "border-[var(--color-border)] bg-gray-50"
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield
              className={`w-4 h-4 ${isPrivate ? "text-[var(--color-teal)]" : "text-[var(--color-muted)]"}`}
            />
            <span className="text-sm font-medium">Donate Privately</span>
          </div>
          <div
            className={`w-10 h-6 rounded-full transition-colors ${isPrivate ? "bg-[var(--color-teal)]" : "bg-gray-300"}`}
          >
            <div
              className={`w-5 h-5 mt-0.5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-[18px]" : "translate-x-0.5"}`}
            />
          </div>
        </button>
        {isPrivate && (
          <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Download className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
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
        className="w-full py-3 rounded-lg bg-[var(--color-teal)] text-white font-semibold hover:bg-[var(--color-teal-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
