/**
 * Unlink Privacy Adapter
 *
 * Wraps the Unlink SDK to provide a simple interface for:
 * 1. Depositing MON into the shielded pool (shields donor identity)
 * 2. Withdrawing from the pool to a campaign address (breaks the on-chain link)
 *
 * The Unlink React SDK provides hooks via useUnlink() from @unlink-xyz/react.
 * The flow is:
 *   deposit(token, amount, depositor) -> withdraw(token, amount, recipient=campaignAddress)
 */

export const NATIVE_MON_TOKEN =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export interface ShieldedDonationParams {
  amount: bigint;
  campaignAddress: string;
  depositorAddress: string;
}

export interface ShieldedDonationResult {
  depositRelayId: string;
  withdrawRelayId: string;
}

/**
 * Execute a shielded donation flow via Unlink:
 * Step 1: Deposit MON from donor wallet into Unlink shielded pool
 * Step 2: Withdraw from pool to campaign address
 *
 * This function is called from within a component that has access to useUnlink().
 * It expects the deposit and withdraw functions from the Unlink hook.
 */
export async function executeShieldedDonation(
  deposit: (
    params: Array<{ token: string; amount: bigint; depositor: string }>
  ) => Promise<{ relayId: string }>,
  withdraw: (
    params: Array<{ token: string; amount: bigint; recipient: string }>
  ) => Promise<{ relayId: string }>,
  params: ShieldedDonationParams
): Promise<ShieldedDonationResult> {
  // Step 1: Deposit into shielded pool
  const depositResult = await deposit([
    {
      token: NATIVE_MON_TOKEN,
      amount: params.amount,
      depositor: params.depositorAddress,
    },
  ]);

  // Step 2: Withdraw to campaign contract
  const withdrawResult = await withdraw([
    {
      token: NATIVE_MON_TOKEN,
      amount: params.amount,
      recipient: params.campaignAddress,
    },
  ]);

  return {
    depositRelayId: depositResult.relayId,
    withdrawRelayId: withdrawResult.relayId,
  };
}

/**
 * Check if Unlink SDK is available and the user has a wallet.
 */
export function isUnlinkAvailable(unlinkState: {
  ready: boolean;
  walletExists: boolean;
}): boolean {
  return unlinkState.ready && unlinkState.walletExists;
}
