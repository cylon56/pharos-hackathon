import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "@/config/chains";

const MIN_BALANCE = parseEther("0.05"); // threshold below which we top up
const TOPUP_AMOUNT = parseEther("0.5"); // amount to send

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerKey) {
      return NextResponse.json(
        { error: "Prefunding not configured" },
        { status: 503 }
      );
    }

    const publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(),
    });

    const balance = await publicClient.getBalance({
      address: address as `0x${string}`,
    });

    if (balance >= MIN_BALANCE) {
      return NextResponse.json({
        funded: false,
        message: "Balance sufficient",
        balance: formatEther(balance),
      });
    }

    const account = privateKeyToAccount(deployerKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http(),
    });

    const hash = await walletClient.sendTransaction({
      to: address as `0x${string}`,
      value: TOPUP_AMOUNT,
    });

    return NextResponse.json({
      funded: true,
      hash,
      amount: formatEther(TOPUP_AMOUNT),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Prefund failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
