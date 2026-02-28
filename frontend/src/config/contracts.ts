export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// USDC on Monad testnet (6 decimals)
export const USDC_ADDRESS =
  "0x534b2f3A21130d7a60830c2Df862319e593943A3" as `0x${string}`;

export const NATIVE_MON_ADDRESS =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

export const UNLINK_POOL_ADDRESS = (process.env
  .NEXT_PUBLIC_UNLINK_POOL_ADDRESS ||
  "0x0813da0a10328e5ed617d37e514ac2f6fa49a254") as `0x${string}`;

export const UNLINK_GATEWAY_URL =
  process.env.NEXT_PUBLIC_UNLINK_GATEWAY_URL || "https://api.unlink.xyz";
