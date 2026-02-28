"use client";

import { useQuery } from "@tanstack/react-query";
import { getDonors, getDonationAmount } from "@/lib/contracts/pharos";
import { truncateAddress, formatMON } from "@/lib/utils/formatting";
import { Users, Shield } from "lucide-react";
import { useEffect, useState } from "react";

interface DonorListProps {
  campaignAddress: `0x${string}`;
  shieldedCount: number;
}

interface DonorEntry {
  address: `0x${string}`;
  amount: bigint;
}

export function DonorList({ campaignAddress, shieldedCount }: DonorListProps) {
  const [donors, setDonors] = useState<DonorEntry[]>([]);

  const { data: donorAddresses } = useQuery({
    queryKey: ["donors", campaignAddress],
    queryFn: () => getDonors(campaignAddress),
  });

  useEffect(() => {
    async function fetchAmounts() {
      if (!donorAddresses?.length) return;
      const entries = await Promise.all(
        donorAddresses.map(async (addr) => ({
          address: addr,
          amount: await getDonationAmount(campaignAddress, addr),
        }))
      );
      setDonors(entries.filter((e) => e.amount > 0n));
    }
    fetchAmounts();
  }, [donorAddresses, campaignAddress]);

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-semibold text-[var(--color-ocean)] flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-violet-400" />
        Donors ({donors.length + shieldedCount})
      </h3>

      <div className="space-y-2">
        {donors.map((d) => (
          <div
            key={d.address}
            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <span className="text-sm font-mono text-[var(--color-ocean)]">
              {truncateAddress(d.address)}
            </span>
            <span className="text-sm font-medium text-[var(--color-muted)]">
              {formatMON(d.amount)} USDC
            </span>
          </div>
        ))}

        {shieldedCount > 0 && (
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-violet-900/20 border border-violet-500/20">
            <span className="text-sm text-violet-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              {shieldedCount} private donor{shieldedCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-violet-500">Identity shielded</span>
          </div>
        )}

        {donors.length === 0 && shieldedCount === 0 && (
          <p className="text-sm text-[var(--color-muted)] py-3 text-center">
            No donations yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
}
