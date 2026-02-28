"use client";

import { useState } from "react";
import { parseEther, formatEther } from "viem";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { activeChain } from "@/config/chains";
import { createMilestoneMatchTx, type MilestoneMatch } from "@/lib/contracts/pharos";
import {
  generateCommitment,
  downloadRefundReceipt,
} from "@/lib/privacy/commitment";
import { Target, Shield, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatMON, truncateAddress } from "@/lib/utils/formatting";

interface MilestoneMatchPanelProps {
  campaignAddress: `0x${string}`;
  matches: MilestoneMatch[];
  isActive: boolean;
  onCreated?: () => void;
}

export function MilestoneMatchPanel({
  campaignAddress,
  matches,
  isActive,
  onCreated,
}: MilestoneMatchPanelProps) {
  const { authState, wallets, handleLogin, httpClient } = useTurnkey();
  const [showForm, setShowForm] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [matchAmount, setMatchAmount] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!threshold || !matchAmount) {
      toast.error("Fill in all fields");
      return;
    }
    if (authState !== "authenticated") {
      handleLogin();
      return;
    }

    setLoading(true);
    try {
      if (!httpClient || !wallets?.[0]?.accounts?.[0]?.address) {
        toast.error("Wallet not ready");
        return;
      }

      const walletAddress = wallets[0].accounts[0].address;
      const account = await createAccount({
        client: httpClient,
        organizationId: httpClient.config.organizationId,
        signWith: walletAddress,
      });
      const wc = createWalletClient({
        account,
        chain: activeChain,
        transport: http(),
      });

      const amount = parseEther(matchAmount);
      let commitmentHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

      if (isPrivate) {
        const commitment = generateCommitment(amount);
        commitmentHash = commitment.commitmentHash;
        downloadRefundReceipt(commitment, "match", campaignAddress);
      }

      await createMilestoneMatchTx(wc, campaignAddress, {
        milestoneThreshold: parseEther(threshold),
        matchAmount: amount,
        isPrivate,
        commitmentHash,
      });

      toast.success("Milestone match created!");
      setShowForm(false);
      setThreshold("");
      setMatchAmount("");
      onCreated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-navy)] flex items-center gap-2">
          <Target className="w-5 h-5 text-[var(--color-teal)]" />
          Milestone Matches
        </h3>
        {isActive && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-[var(--color-teal)] hover:text-[var(--color-teal-dark)] font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Set a Match
          </button>
        )}
      </div>

      {/* Existing Matches */}
      {matches.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)] py-3">
          No milestone matches yet. Be the first to set one!
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {matches.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-[var(--color-border)]"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-navy)]">
                  {m.isPrivate ? (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[var(--color-teal)]" />
                      Anonymous Matcher
                    </span>
                  ) : (
                    truncateAddress(m.matcher)
                  )}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  +{formatMON(m.matchAmount)} MON when{" "}
                  {formatMON(m.milestoneThreshold)} MON reached
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  m.isActivated
                    ? "bg-emerald-50 text-emerald-700"
                    : m.isRefunded
                      ? "bg-gray-100 text-gray-500"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {m.isActivated ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" /> Activated
                  </span>
                ) : m.isRefunded ? (
                  <span className="flex items-center gap-1">
                    <X className="w-3 h-3" /> Refunded
                  </span>
                ) : (
                  "Pending"
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create Match Form */}
      {showForm && (
        <div className="border-t border-[var(--color-border)] pt-4 space-y-3">
          <div>
            <label className="text-sm text-[var(--color-muted)] block mb-1">
              Activate when campaign reaches (MON)
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 50"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
            />
          </div>
          <div>
            <label className="text-sm text-[var(--color-muted)] block mb-1">
              Your match amount (MON)
            </label>
            <input
              type="number"
              value={matchAmount}
              onChange={(e) => setMatchAmount(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
            />
          </div>
          <button
            onClick={() => setIsPrivate(!isPrivate)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${
              isPrivate
                ? "border-[var(--color-teal)] bg-emerald-50"
                : "border-[var(--color-border)]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Match Privately
            </span>
            <div
              className={`w-8 h-5 rounded-full ${isPrivate ? "bg-[var(--color-teal)]" : "bg-gray-300"}`}
            >
              <div
                className={`w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform ${isPrivate ? "translate-x-3.5" : "translate-x-0.5"}`}
              />
            </div>
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--color-navy)] text-white text-sm font-medium hover:bg-[var(--color-navy-light)] transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Milestone Match"}
          </button>
        </div>
      )}
    </div>
  );
}
