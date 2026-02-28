import { formatUnits } from "viem";

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format USDC amount (6 decimals) with commas and abbreviations
export function formatUSDC(amount: bigint): string {
  const num = parseFloat(formatUnits(amount, 6));
  if (num === 0) return "0";
  if (num < 0.01) return "< 0.01";

  const abbrev = (n: number, suffix: string) => {
    const val = n % 1 === 0 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, "");
    return val + suffix;
  };

  if (num >= 1e15) return abbrev(num / 1e15, "Q");
  if (num >= 1e12) return abbrev(num / 1e12, "T");
  if (num >= 1e9)  return abbrev(num / 1e9,  "B");
  if (num >= 1e6)  return abbrev(num / 1e6,  "M");

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// Keep formatMON as alias so existing code doesn't break
export const formatMON = formatUSDC;

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
