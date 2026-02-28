"use client";

import Link from "next/link";
import { Shield, Clock, Target, Users } from "lucide-react";
import {
  type CampaignInfo,
  type CampaignMetadata,
  CampaignStatus,
  parseMetadataURI,
} from "@/lib/contracts/pharos";
import { formatMON, formatPercentage } from "@/lib/utils/formatting";
import { timeRemaining } from "@/lib/utils/time";

interface CampaignCardProps {
  campaign: CampaignInfo;
}

const statusLabels: Record<CampaignStatus, string> = {
  [CampaignStatus.Active]: "Active",
  [CampaignStatus.Successful]: "Funded",
  [CampaignStatus.Failed]: "Ended",
};

const statusColors: Record<CampaignStatus, string> = {
  [CampaignStatus.Active]: "bg-emerald-50 text-emerald-700",
  [CampaignStatus.Successful]: "bg-blue-50 text-blue-700",
  [CampaignStatus.Failed]: "bg-gray-100 text-gray-600",
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const metadata = parseMetadataURI(campaign.metadataURI);
  const percentage = formatPercentage(campaign.totalRaised, campaign.fundingGoal);
  const hasShielded = campaign.donorCount > 0n;

  return (
    <Link href={`/campaign/${campaign.address}`}>
      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] hover:shadow-md transition-all duration-200 overflow-hidden group cursor-pointer">
        {/* Category + Privacy Badge */}
        <div className="px-5 pt-5 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--color-teal)] uppercase tracking-wider">
            {metadata.category || "General"}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}
          >
            {statusLabels[campaign.status]}
          </span>
        </div>

        {/* Title + Description */}
        <div className="px-5 pt-3 pb-4">
          <h3 className="text-lg font-semibold text-[var(--color-navy)] group-hover:text-[var(--color-teal)] transition-colors line-clamp-2">
            {metadata.title || "Untitled Campaign"}
          </h3>
          <p className="mt-1.5 text-sm text-[var(--color-muted)] line-clamp-2">
            {metadata.description || "No description provided."}
          </p>
        </div>

        {/* Progress */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--color-navy)]">
              {formatMON(campaign.totalRaised)} MON
            </span>
            <span className="text-xs text-[var(--color-muted)]">
              {Math.min(percentage, 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-teal)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-[var(--color-muted)]">
            Goal: {formatMON(campaign.fundingGoal)} MON
          </p>
        </div>

        {/* Stats Row */}
        <div className="px-5 pb-5 flex items-center gap-4 text-xs text-[var(--color-muted)]">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {timeRemaining(campaign.endTime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {campaign.donorCount.toString()} donors
          </span>
          {campaign.milestoneCount > 0n && (
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              {campaign.milestoneCount.toString()} matches
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
