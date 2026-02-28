"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { activeChain } from "@/config/chains";
import {
  getCampaignInfo,
  getMilestoneMatches,
  parseMetadataURI,
  finalizeCampaign,
  claimFunds,
  refund,
  CampaignStatus,
} from "@/lib/contracts/pharos";
import { ProgressBar } from "@/components/campaign/ProgressBar";
import { DonationPanel } from "@/components/campaign/DonationPanel";
import { MilestoneMatchPanel } from "@/components/campaign/MilestoneMatchPanel";
import { DonorList } from "@/components/campaign/DonorList";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Flag,
  Coins,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { timeRemaining, formatDate, hasEnded } from "@/lib/utils/time";
import { truncateAddress } from "@/lib/utils/formatting";
import { toast } from "sonner";
import { useState } from "react";

export default function CampaignPage() {
  const params = useParams();
  const address = params.address as `0x${string}`;
  const { authState, wallets, httpClient } = useTurnkey();
  const [actionLoading, setActionLoading] = useState("");

  const {
    data: campaign,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["campaign", address],
    queryFn: () => getCampaignInfo(address),
    refetchInterval: 10_000,
  });

  const { data: matches, refetch: refetchMatches } = useQuery({
    queryKey: ["matches", address],
    queryFn: () => getMilestoneMatches(address),
  });

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

  async function handleAction(
    action: string,
    fn: (wc: ReturnType<typeof createWalletClient> extends Promise<infer T> ? T : never) => Promise<unknown>
  ) {
    setActionLoading(action);
    try {
      const wc = await getWalletClient();
      if (!wc) {
        toast.error("Wallet not ready");
        return;
      }
      await fn(wc as Parameters<typeof fn>[0]);
      toast.success(`${action} successful!`);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setActionLoading("");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-96" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-lg text-[var(--color-muted)]">Campaign not found.</p>
        <Link href="/" className="text-[var(--color-teal)] mt-4 inline-block">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const metadata = parseMetadataURI(campaign.metadataURI);
  const isActiveStatus = campaign.status === CampaignStatus.Active;
  const ended = hasEnded(campaign.endTime);
  const canFinalize = isActiveStatus && ended;
  const canClaim =
    campaign.status === CampaignStatus.Successful && !campaign.metadataURI; // simplified
  const userAddress = wallets?.[0]?.accounts?.[0]?.address as
    | `0x${string}`
    | undefined;
  const isRecipient =
    userAddress?.toLowerCase() === campaign.recipient.toLowerCase();

  const statusConfig = {
    [CampaignStatus.Active]: {
      icon: Clock,
      label: "Active",
      color: "text-emerald-600 bg-emerald-50",
    },
    [CampaignStatus.Successful]: {
      icon: CheckCircle,
      label: "Funded",
      color: "text-blue-600 bg-blue-50",
    },
    [CampaignStatus.Failed]: {
      icon: XCircle,
      label: "Failed",
      color: "text-red-600 bg-red-50",
    },
  };

  const StatusIcon = statusConfig[campaign.status].icon;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-navy)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All Campaigns
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm font-medium text-[var(--color-teal)] uppercase tracking-wider">
              {metadata.category}
            </span>
            <h1 className="text-3xl font-bold text-[var(--color-navy)] mt-1">
              {metadata.title}
            </h1>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[campaign.status].color}`}
          >
            <StatusIcon className="w-4 h-4" />
            {statusConfig[campaign.status].label}
          </span>
        </div>

        <p className="mt-4 text-[var(--color-muted)] max-w-3xl leading-relaxed">
          {metadata.description}
        </p>

        <div className="mt-4 flex items-center gap-4 text-sm text-[var(--color-muted)]">
          <span className="flex items-center gap-1">
            Recipient:{" "}
            <a
              href={`https://monad-testnet.socialscan.io/address/${campaign.recipient}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-[var(--color-teal)] flex items-center gap-1"
            >
              {truncateAddress(campaign.recipient)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </span>
          <span>
            {formatDate(campaign.startTime)} &mdash;{" "}
            {formatDate(campaign.endTime)}
          </span>
          <span>{timeRemaining(campaign.endTime)}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Progress + Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <ProgressBar
              raised={campaign.totalRaised}
              goal={campaign.fundingGoal}
            />
          </div>

          {/* Admin Actions */}
          {(canFinalize || isRecipient) && authState === "authenticated" && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-6 space-y-3">
              <h3 className="text-lg font-semibold text-[var(--color-navy)]">
                Campaign Actions
              </h3>
              <div className="flex flex-wrap gap-3">
                {canFinalize && (
                  <button
                    onClick={() =>
                      handleAction("Finalize", (wc) =>
                        finalizeCampaign(wc, address)
                      )
                    }
                    disabled={!!actionLoading}
                    className="px-4 py-2 rounded-lg bg-[var(--color-navy)] text-white text-sm font-medium hover:bg-[var(--color-navy-light)] disabled:opacity-50 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    {actionLoading === "Finalize"
                      ? "Finalizing..."
                      : "Finalize Campaign"}
                  </button>
                )}
                {campaign.status === CampaignStatus.Successful &&
                  isRecipient && (
                    <button
                      onClick={() =>
                        handleAction("Claim", (wc) => claimFunds(wc, address))
                      }
                      disabled={!!actionLoading}
                      className="px-4 py-2 rounded-lg bg-[var(--color-teal)] text-white text-sm font-medium hover:bg-[var(--color-teal-dark)] disabled:opacity-50 flex items-center gap-2"
                    >
                      <Coins className="w-4 h-4" />
                      {actionLoading === "Claim"
                        ? "Claiming..."
                        : "Claim Funds"}
                    </button>
                  )}
                {campaign.status === CampaignStatus.Failed && (
                  <button
                    onClick={() =>
                      handleAction("Refund", (wc) => refund(wc, address))
                    }
                    disabled={!!actionLoading}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {actionLoading === "Refund"
                      ? "Refunding..."
                      : "Claim Refund"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Milestone Matches */}
          <MilestoneMatchPanel
            campaignAddress={address}
            matches={matches || []}
            isActive={isActiveStatus && !ended}
            onCreated={() => {
              refetch();
              refetchMatches();
            }}
          />

          {/* Donors */}
          <DonorList
            campaignAddress={address}
            shieldedCount={Number(campaign.donorCount) - Number(campaign.donorCount)} // Would need separate query
          />
        </div>

        {/* Right Column: Donation */}
        <div className="space-y-6">
          <DonationPanel
            campaignAddress={address}
            isActive={isActiveStatus && !ended}
            onDonated={() => refetch()}
          />

          {/* Campaign Details Card */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <h3 className="text-sm font-semibold text-[var(--color-navy)] mb-3 uppercase tracking-wider">
              Details
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Contract</dt>
                <dd>
                  <a
                    href={`https://monad-testnet.socialscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[var(--color-teal)] hover:underline"
                  >
                    {truncateAddress(address)}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Fee</dt>
                <dd>1%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Chain</dt>
                <dd>Monad Testnet</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Donors</dt>
                <dd>{campaign.donorCount.toString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted)]">Matches</dt>
                <dd>{campaign.milestoneCount.toString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
