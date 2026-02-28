"use client";

import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState, type ReactNode } from "react";
import { UnlinkWrapper } from "./UnlinkWrapper";

const turnkeyConfig = {
  apiBaseUrl: "https://api.turnkey.com",
  organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || "",

  auth: {
    methods: {
      emailOtpAuthEnabled: true,
      passkeyAuthEnabled: true,
      googleOauthEnabled: true,
      walletAuthEnabled: true,
    },
    methodOrder: ["email", "socials", "passkey", "wallet"] as Array<
      "socials" | "email" | "sms" | "passkey" | "wallet"
    >,
  },

  ui: {
    darkMode: false,
    borderRadius: "8",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <TurnkeyProvider config={turnkeyConfig}>
      <QueryClientProvider client={queryClient}>
        <UnlinkWrapper>
          {children}
        </UnlinkWrapper>
        <Toaster position="bottom-right" richColors />
      </QueryClientProvider>
    </TurnkeyProvider>
  );
}
