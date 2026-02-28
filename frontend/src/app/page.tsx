"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAllCampaignAddresses,
  getCampaignInfo,
  type CampaignInfo,
} from "@/lib/contracts/pharos";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Shield, Zap, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

// Demo campaigns shown when no factory is deployed
const DEMO_CAMPAIGNS: CampaignInfo[] = [
  {
    address: "0x0000000000000000000000000000000000000001" as `0x${string}`,
    recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f7F001" as `0x${string}`,
    fundingGoal: 100000000000000000000n,
    totalRaised: 67500000000000000000n,
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 12),
    status: 0,
    donorCount: 42n,
    milestoneCount: 2n,
    metadataURI: JSON.stringify({
      title: "Coin Center Legal Defense Fund",
      description:
        "Support Coin Center's legal advocacy for sensible cryptocurrency regulation. Funds will be used to file amicus briefs and support litigation defending digital asset users' rights.",
      category: "Advocacy",
    }),
  },
  {
    address: "0x0000000000000000000000000000000000000002" as `0x${string}`,
    recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f7F002" as `0x${string}`,
    fundingGoal: 50000000000000000000n,
    totalRaised: 50000000000000000000n,
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 14),
    endTime: BigInt(Math.floor(Date.now() / 1000) - 86400),
    status: 1,
    donorCount: 28n,
    milestoneCount: 1n,
    metadataURI: JSON.stringify({
      title: "Open Source Privacy Tools Grant",
      description:
        "Fund development of open-source privacy tools for the Monad ecosystem. Goal: build a Monad-native mixer and encrypted memo system.",
      category: "Development",
    }),
  },
  {
    address: "0x0000000000000000000000000000000000000003" as `0x${string}`,
    recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f7F003" as `0x${string}`,
    fundingGoal: 25000000000000000000n,
    totalRaised: 8200000000000000000n,
    startTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 2),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 5),
    status: 0,
    donorCount: 15n,
    milestoneCount: 0n,
    metadataURI: JSON.stringify({
      title: "Monad Developer Education Hub",
      description:
        "Create comprehensive educational resources for developers building on Monad. Includes tutorials, workshops, and documentation.",
      category: "Education",
    }),
  },
];

export default function DiscoveryPage() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      try {
        const addresses = await getAllCampaignAddresses();
        if (addresses.length === 0) return DEMO_CAMPAIGNS;
        const infos = await Promise.all(addresses.map(getCampaignInfo));
        return infos;
      } catch {
        return DEMO_CAMPAIGNS;
      }
    },
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0f0d1a] via-[#1a0a2e] to-[#2d1b4e] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Privacy-preserving
              <br />
              crowdfunding on{" "}
              <span className="text-[var(--color-teal)]">Monad</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300 max-w-2xl">
              Fund causes you believe in. Your identity stays private, your
              funds are protected by assurance contracts. If the goal isn&apos;t
              met, you get a full refund.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/create"
                className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
              >
                Create Campaign
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#campaigns"
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 border border-white/10 hover:border-violet-400/30 transition-all"
              >
                Explore Campaigns
              </a>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            {[
              { icon: Shield, label: "Shielded Donations" },
              { icon: Lock, label: "Assurance Contracts" },
              { icon: Zap, label: "Sub-second Finality" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-900/30 border border-violet-500/20 text-sm"
              >
                <Icon className="w-4 h-4 text-[var(--color-teal)]" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campaign Grid */}
      <section
        id="campaigns"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <h2 className="text-2xl font-bold text-[var(--color-navy)] mb-8">
          Active Campaigns
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 animate-pulse"
              >
                <div className="h-4 bg-white/10 rounded w-20 mb-4" />
                <div className="h-6 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-4 bg-white/10 rounded w-full mb-6" />
                <div className="h-3 bg-white/10 rounded-full w-full mb-4" />
                <div className="h-4 bg-white/10 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns?.map((campaign) => (
              <CampaignCard key={campaign.address} campaign={campaign} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-[var(--color-navy)] text-center mb-12">
            How Pharos Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Campaign Created",
                desc: "Anyone can create a campaign with a funding goal and deadline. Funds are held in a smart contract.",
              },
              {
                step: "2",
                title: "Private or Public Donations",
                desc: "Donate publicly or shield your identity with Unlink. Your funds are safe either way.",
              },
              {
                step: "3",
                title: "All-or-Nothing Resolution",
                desc: "If the goal is met, funds go to the recipient. If not, every donor gets a full refund.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white text-lg font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-900/40">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-navy)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
