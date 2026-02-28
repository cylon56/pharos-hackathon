"use client";

import { useQuery } from "@tanstack/react-query";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import {
  getAllCampaignAddresses,
  getCampaignInfo,
  getDonationAmount,
  CampaignStatus,
  parseMetadataURI,
} from "@/lib/contracts/pharos";
import { formatMON, truncateAddress } from "@/lib/utils/formatting";
import { timeRemaining, formatDate } from "@/lib/utils/time";
import {
  Wallet,
  ArrowRight,
  Gift,
  FolderOpen,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { authState, wallets, handleLogin } = useTurnkey();
  const userAddress = wallets?.[0]?.accounts?.[0]?.address as
    | `0x${string}`
    | undefined;

  const { data: allCampaigns, isLoading } = useQuery({
    queryKey: ["dashboard-campaigns", userAddress],
    queryFn: async () => {
      if (!userAddress) return { donated: [], created: [] };
      const addresses = await getAllCampaignAddresses();
      const campaigns = await Promise.all(addresses.map(getCampaignInfo));

      const donated: Array<{
        campaign: (typeof campaigns)[0];
        amount: bigint;
      }> = [];
      const created: typeof campaigns = [];

      for (const c of campaigns) {
        const donAmount = await getDonationAmount(c.address, userAddress);
        if (donAmount > 0n) {
          donated.push({ campaign: c, amount: donAmount });
        }
        if (c.recipient.toLowerCase() === userAddress.toLowerCase()) {
          created.push(c);
        }
      }

      return { donated, created };
    },
    enabled: !!userAddress,
  });

  if (authState !== "authenticated") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Wallet className="w-16 h-16 text-[var(--color-muted)] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-2">
          Your Dashboard
        </h1>
        <p className="text-[var(--color-muted)] mb-6">
          Sign in to view your campaigns and donations.
        </p>
        <button
          onClick={() => handleLogin()}
          className="btn-primary px-6 py-3 rounded-xl font-semibold"
        >
          Sign In
        </button>
      </div>
    );
  }

  const statusIcons = {
    [CampaignStatus.Active]: <Clock className="w-4 h-4 text-emerald-400" />,
    [CampaignStatus.Successful]: (
      <CheckCircle className="w-4 h-4 text-blue-400" />
    ),
    [CampaignStatus.Failed]: <XCircle className="w-4 h-4 text-red-400" />,
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-navy)]">
          Dashboard
        </h1>
        <p className="mt-1 text-[var(--color-muted)]">
          Welcome back,{" "}
          <span className="font-mono">
            {userAddress ? truncateAddress(userAddress) : ""}
          </span>
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 animate-pulse"
            >
              <div className="h-6 bg-white/10 rounded w-40 mb-4" />
              <div className="h-16 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* My Donations */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-violet-400" />
              My Donations
            </h2>

            {allCampaigns?.donated.length === 0 ? (
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 text-center">
                <p className="text-[var(--color-muted)]">
                  No donations yet.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Explore campaigns <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {allCampaigns?.donated.map(({ campaign, amount }) => {
                  const meta = parseMetadataURI(campaign.metadataURI);
                  return (
                    <Link
                      key={campaign.address}
                      href={`/campaign/${campaign.address}`}
                    >
                      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-900/20 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcons[campaign.status]}
                          <div>
                            <p className="font-medium text-[var(--color-navy)]">
                              {meta.title}
                            </p>
                            <p className="text-xs text-[var(--color-muted)]">
                              {timeRemaining(campaign.endTime)}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold text-[var(--color-navy)]">
                          {formatMON(amount)} USDC
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* My Campaigns */}
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-navy)] flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-violet-400" />
              My Campaigns
            </h2>

            {allCampaigns?.created.length === 0 ? (
              <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-8 text-center">
                <p className="text-[var(--color-muted)]">
                  No campaigns created yet.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Create a campaign <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {allCampaigns?.created.map((campaign) => {
                  const meta = parseMetadataURI(campaign.metadataURI);
                  return (
                    <Link
                      key={campaign.address}
                      href={`/campaign/${campaign.address}`}
                    >
                      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-900/20 transition-all flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcons[campaign.status]}
                          <div>
                            <p className="font-medium text-[var(--color-navy)]">
                              {meta.title}
                            </p>
                            <p className="text-xs text-[var(--color-muted)]">
                              {formatMON(campaign.totalRaised)} /{" "}
                              {formatMON(campaign.fundingGoal)} USDC
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-[var(--color-muted)]">
                          {campaign.donorCount.toString()} donors
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
