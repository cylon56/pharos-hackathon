import { defineChain } from "viem";

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        alchemyKey
          ? `https://monad-testnet.g.alchemy.com/v2/${alchemyKey}`
          : "https://testnet-rpc.monad.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://monad-testnet.socialscan.io",
    },
  },
  testnet: true,
});

export const activeChain = monadTestnet;
