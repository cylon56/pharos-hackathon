import { keccak256, encodePacked, toHex } from "viem";

export interface CommitmentData {
  commitmentHash: `0x${string}`;
  secret: `0x${string}`;
  nullifier: `0x${string}`;
  amount: string;
}

export function generateCommitment(amount: bigint): CommitmentData {
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const nullifierBytes = crypto.getRandomValues(new Uint8Array(32));

  const secret = toHex(secretBytes) as `0x${string}`;
  const nullifier = toHex(nullifierBytes) as `0x${string}`;

  const commitmentHash = keccak256(
    encodePacked(["uint256", "bytes32", "bytes32"], [amount, secret, nullifier])
  );

  return {
    commitmentHash,
    secret,
    nullifier,
    amount: amount.toString(),
  };
}

export function downloadRefundReceipt(
  commitment: CommitmentData,
  type: "donation" | "match",
  campaignAddress: string
) {
  const receipt = {
    type,
    campaignAddress,
    ...commitment,
    createdAt: new Date().toISOString(),
    instructions:
      "Keep this file safe. You will need it to claim a refund if the campaign fails.",
  };

  const blob = new Blob([JSON.stringify(receipt, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pharos-${type}-receipt-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
