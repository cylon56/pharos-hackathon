"use client";

import { formatMON, formatPercentage } from "@/lib/utils/formatting";

interface ProgressBarProps {
  raised: bigint;
  goal: bigint;
  className?: string;
}

export function ProgressBar({ raised, goal, className = "" }: ProgressBarProps) {
  const percentage = formatPercentage(raised, goal);

  return (
    <div className={className}>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-3xl font-bold text-[var(--color-ocean)]">
            {formatMON(raised)} <span className="text-lg font-normal">USDC</span>
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            raised of {formatMON(goal)} USDC goal
          </p>
        </div>
        <p className="text-2xl font-bold text-[var(--color-beacon)]">
          {Math.min(percentage, 100).toFixed(1)}%
        </p>
      </div>
      <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-beacon)] to-[var(--color-beacon-light)] rounded-full transition-all duration-700"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
