export function timeRemaining(endTimestamp: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const end = Number(endTimestamp);
  const diff = end - now;

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function isActive(startTime: bigint, endTime: bigint): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= Number(startTime) && now <= Number(endTime);
}

export function hasEnded(endTime: bigint): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now > Number(endTime);
}

export function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
