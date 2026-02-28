"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { activeChain } from "@/config/chains";
import { createCampaign } from "@/lib/contracts/pharos";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, Rocket } from "lucide-react";
import Link from "next/link";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { authState, wallets, handleLogin, httpClient } = useTurnkey();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    recipient: "",
    fundingGoal: "",
    durationDays: "7",
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (authState !== "authenticated") {
      handleLogin();
      return;
    }

    if (!form.title || !form.description || !form.recipient || !form.fundingGoal) {
      toast.error("Please fill in all required fields");
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

      const now = Math.floor(Date.now() / 1000);
      const startTime = BigInt(now + 60); // starts in 1 minute
      const durationSeconds = parseInt(form.durationDays) * 86400;
      const endTime = BigInt(now + durationSeconds);

      const metadataURI = JSON.stringify({
        title: form.title,
        description: form.description,
        category: form.category,
      });

      const hash = await createCampaign(wc, {
        recipient: form.recipient as `0x${string}`,
        fundingGoal: parseEther(form.fundingGoal),
        startTime,
        endTime,
        metadataURI,
      });

      toast.success("Campaign created!", {
        description: `Transaction: ${hash.slice(0, 10)}...`,
      });

      // Redirect to discovery page after creation
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create campaign";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    "General",
    "Advocacy",
    "Development",
    "Education",
    "Research",
    "Community",
    "Emergency",
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-navy)]">
          Create a Campaign
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Launch an assurance-contract campaign. Funds are only released if the
          goal is met.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-navy)] mb-1">
            Campaign Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Coin Center Legal Defense Fund"
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-navy)] mb-1">
            Description *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Tell people what this campaign is about..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-navy)] mb-1">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => update("category", cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  form.category === cat
                    ? "bg-[var(--color-teal)] text-white border-[var(--color-teal)]"
                    : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-teal)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-navy)] mb-1">
            Recipient Address *
          </label>
          <input
            type="text"
            value={form.recipient}
            onChange={(e) => update("recipient", e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            The address that will receive funds if the goal is met.
          </p>
          {authState === "authenticated" &&
            wallets?.[0]?.accounts?.[0]?.address && (
              <button
                type="button"
                onClick={() =>
                  update("recipient", wallets[0].accounts[0].address)
                }
                className="mt-1 text-xs text-[var(--color-teal)] hover:underline"
              >
                Use my wallet address
              </button>
            )}
        </div>

        {/* Funding Goal */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-navy)] mb-1">
            Funding Goal (MON) *
          </label>
          <input
            type="number"
            value={form.fundingGoal}
            onChange={(e) => update("fundingGoal", e.target.value)}
            placeholder="100"
            min="0.01"
            step="0.01"
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] focus:border-transparent"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-navy)] mb-1">
            Campaign Duration
          </label>
          <div className="flex gap-3">
            {["3", "7", "14", "30"].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => update("durationDays", days)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.durationDays === days
                    ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]"
                    : "bg-white text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-navy)]"
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-lg bg-[var(--color-teal)] text-white font-semibold text-lg hover:bg-[var(--color-teal-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              {authState !== "authenticated"
                ? "Sign In to Create"
                : "Launch Campaign"}
            </>
          )}
        </button>

        <p className="text-center text-xs text-[var(--color-muted)]">
          A 1% fee is applied to successful campaigns only. Failed campaigns are
          fully refunded.
        </p>
      </form>
    </div>
  );
}
