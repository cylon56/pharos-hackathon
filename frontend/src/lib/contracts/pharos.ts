import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  maxUint256,
  type WalletClient,
  type PublicClient,
  custom,
} from "viem";
import { activeChain } from "@/config/chains";
import { FACTORY_ADDRESS, USDC_ADDRESS } from "@/config/contracts";
import { FACTORY_ABI, CAMPAIGN_ABI, ERC20_ABI } from "./abis";

export const publicClient: PublicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
});

// ——— Types ———————————————————————————————

export enum CampaignStatus {
  Active = 0,
  Successful = 1,
  Failed = 2,
}

export interface CampaignInfo {
  address: `0x${string}`;
  recipient: `0x${string}`;
  fundingGoal: bigint;
  totalRaised: bigint;
  startTime: bigint;
  endTime: bigint;
  status: CampaignStatus;
  donorCount: bigint;
  milestoneCount: bigint;
  metadataURI: string;
}

export interface CampaignMetadata {
  title: string;
  description: string;
  category: string;
  image?: string;
}

export interface MilestoneMatch {
  matcher: `0x${string}`;
  commitmentHash: `0x${string}`;
  milestoneThreshold: bigint;
  matchAmount: bigint;
  isPrivate: boolean;
  isActivated: boolean;
  isFunded: boolean;
  isRefunded: boolean;
}

// ——— Read Functions ——————————————————————

export async function getAllCampaignAddresses(): Promise<`0x${string}`[]> {
  const addresses = await publicClient.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getAllCampaigns",
  });
  return addresses as `0x${string}`[];
}

export async function getCampaignInfo(
  address: `0x${string}`
): Promise<CampaignInfo> {
  const result = await publicClient.readContract({
    address,
    abi: CAMPAIGN_ABI,
    functionName: "getCampaignInfo",
  });

  const [
    recipient,
    fundingGoal,
    totalRaised,
    startTime,
    endTime,
    status,
    donorCount,
    milestoneCount,
    metadataURI,
  ] = result as [
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    number,
    bigint,
    bigint,
    string
  ];

  return {
    address,
    recipient,
    fundingGoal,
    totalRaised,
    startTime,
    endTime,
    status: status as CampaignStatus,
    donorCount,
    milestoneCount,
    metadataURI,
  };
}

export async function getMilestoneMatches(
  address: `0x${string}`
): Promise<MilestoneMatch[]> {
  const result = await publicClient.readContract({
    address,
    abi: CAMPAIGN_ABI,
    functionName: "getMilestoneMatches",
  });
  return result as unknown as MilestoneMatch[];
}

export async function getDonors(
  address: `0x${string}`
): Promise<`0x${string}`[]> {
  const result = await publicClient.readContract({
    address,
    abi: CAMPAIGN_ABI,
    functionName: "getDonors",
  });
  return result as `0x${string}`[];
}

export async function getDonationAmount(
  campaignAddress: `0x${string}`,
  donorAddress: `0x${string}`
): Promise<bigint> {
  const result = await publicClient.readContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "donations",
    args: [donorAddress],
  });
  return result as bigint;
}

export async function getTokenAllowance(
  ownerAddress: `0x${string}`,
  spenderAddress: `0x${string}`
): Promise<bigint> {
  const result = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [ownerAddress, spenderAddress],
  });
  return result as bigint;
}

// ——— Metadata Helpers ————————————————————

export function parseMetadataURI(uri: string): CampaignMetadata {
  try {
    if (uri.startsWith("{")) {
      return JSON.parse(uri);
    }
    return {
      title: "Untitled Campaign",
      description: "",
      category: "General",
    };
  } catch {
    return {
      title: "Untitled Campaign",
      description: "",
      category: "General",
    };
  }
}

// ——— ERC20 Approval ———————————————————————

async function approveToken(
  walletClient: WalletClient,
  spenderAddress: `0x${string}`,
  amount: bigint
) {
  const ownerAddress = walletClient.account!.address;
  const allowance = await getTokenAllowance(ownerAddress, spenderAddress);
  if (allowance >= amount) return null;

  const { request } = await publicClient.simulateContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spenderAddress, maxUint256],
    account: walletClient.account!,
  });
  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ——— Write Functions (require walletClient) ——

export async function createCampaign(
  walletClient: WalletClient,
  params: {
    recipient: `0x${string}`;
    fundingGoal: bigint;
    startTime: bigint;
    endTime: bigint;
    metadataURI: string;
  }
) {
  const { request } = await publicClient.simulateContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "createCampaign",
    args: [
      params.recipient,
      params.fundingGoal,
      params.startTime,
      params.endTime,
      params.metadataURI,
    ],
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

export async function donate(
  walletClient: WalletClient,
  campaignAddress: `0x${string}`,
  amount: bigint
) {
  await approveToken(walletClient, campaignAddress, amount);

  const { request } = await publicClient.simulateContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "donate",
    args: [amount],
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

export async function donateShielded(
  walletClient: WalletClient,
  campaignAddress: `0x${string}`,
  amount: bigint,
  commitmentHash: `0x${string}`
) {
  await approveToken(walletClient, campaignAddress, amount);

  const { request } = await publicClient.simulateContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "donateShielded",
    args: [commitmentHash, amount],
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

export async function createMilestoneMatchTx(
  walletClient: WalletClient,
  campaignAddress: `0x${string}`,
  params: {
    milestoneThreshold: bigint;
    matchAmount: bigint;
    isPrivate: boolean;
    commitmentHash: `0x${string}`;
  }
) {
  await approveToken(walletClient, campaignAddress, params.matchAmount);

  const { request } = await publicClient.simulateContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "createMilestoneMatch",
    args: [
      params.milestoneThreshold,
      params.matchAmount,
      params.isPrivate,
      params.commitmentHash,
    ],
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

export async function finalizeCampaign(
  walletClient: WalletClient,
  campaignAddress: `0x${string}`
) {
  const { request } = await publicClient.simulateContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "finalize",
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

export async function claimFunds(
  walletClient: WalletClient,
  campaignAddress: `0x${string}`
) {
  const { request } = await publicClient.simulateContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "claimFunds",
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

export async function refund(
  walletClient: WalletClient,
  campaignAddress: `0x${string}`
) {
  const { request } = await publicClient.simulateContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "refund",
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

export async function refundShielded(
  walletClient: WalletClient,
  campaignAddress: `0x${string}`,
  params: {
    commitmentHash: `0x${string}`;
    secret: `0x${string}`;
    nullifier: `0x${string}`;
    refundTo: `0x${string}`;
  }
) {
  const { request } = await publicClient.simulateContract({
    address: campaignAddress,
    abi: CAMPAIGN_ABI,
    functionName: "refundShielded",
    args: [
      params.commitmentHash,
      params.secret,
      params.nullifier,
      params.refundTo,
    ],
    account: walletClient.account!,
  });
  return walletClient.writeContract(request);
}

// ——— Formatting Helpers ——————————————————

export { formatUnits, parseUnits };
