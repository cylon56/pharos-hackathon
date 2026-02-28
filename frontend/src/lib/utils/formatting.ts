import { formatEther } from "viem";

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatMON(wei: bigint, decimals = 4): string {
  const formatted = formatEther(wei);
  const num = parseFloat(formatted);
  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  return num.toFixed(decimals).replace(/\.?0+$/, "");
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(raised: bigint, goal: bigint): number {
  if (goal === 0n) return 0;
  return Number((raised * 10000n) / goal) / 100;
}
