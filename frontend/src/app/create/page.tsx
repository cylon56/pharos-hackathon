"use client";

import { useState } from "react";
import { parseUnits } from "viem";
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

  // durationSeconds: "300" = 5 min, "259200" = 3d, "604800" = 7d, "1209600" = 14d, "2592000" = 30d
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "General",
    recipient: "",
    fundingGoal: "",
    durationSeconds: "604800",
  });

  const durations = [
    { label: "5 min", value: "300" },
    { label: "3 days", value: "259200" },
    { label: "7 days", value: "604800" },
    { label: "14 days", value: "1209600" },
    { label: "30 days", value: "2592000" },
  ];

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
      const endTime = BigInt(now + parseInt(form.durationSeconds));

      const metadataURI = JSON.stringify({
        title: form.title,
        description: form.description,
        category: form.category,
      });

      const hash = await createCampaign(wc, {
        recipient: form.recipient as `0x${string}`,
        fundingGoal: parseUnits(form.fundingGoal, 6),
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
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-violet-400 transition-colors mb-8"
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

      <div className="bg-[#1A1726] rounded-2xl border border-[rgba(139,92,246,0.15)] p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">
              Campaign Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Coin Center Legal Defense Fund"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-ocean)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">
              Description *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Tell people what this campaign is about..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-ocean)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-navy)] mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => update("category", cat)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    form.category === cat
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-[#1E1B2E] text-gray-400 border-violet-500/10 hover:border-violet-500/40 hover:text-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">
              Recipient Address *
            </label>
            <input
              type="text"
              value={form.recipient}
              onChange={(e) => update("recipient", e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] font-mono text-sm text-[var(--color-ocean)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              The address that will receive funds if the goal is met.
            </p>
            {authState === "authenticated" &&
              wallets?.[0]?.accounts?.[0]?.address && (
                <button
                  type="button"
                  onClick={() =>
                    update("recipient", wallets[0].accounts[0].address)
                  }
                  className="mt-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Use my wallet address
                </button>
              )}
          </div>

          {/* Funding Goal */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-navy)] mb-1.5">
              Funding Goal (USDC) *
            </label>
            <input
              type="number"
              value={form.fundingGoal}
              onChange={(e) => update("fundingGoal", e.target.value)}
              placeholder="100"
              min="0.01"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-lg text-[var(--color-ocean)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-navy)] mb-2">
              Campaign Duration
            </label>
            <div className="grid grid-cols-5 gap-2">
              {durations.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("durationSeconds", value)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    form.durationSeconds === value
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-[#1E1B2E] text-gray-400 border-violet-500/10 hover:border-violet-500/40 hover:text-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
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
    </div>
  );
}
