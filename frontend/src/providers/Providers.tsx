"use client";

import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useMemo, useState, type ReactNode } from "react";
import { UnlinkWrapper } from "./UnlinkWrapper";

const ethereumWalletAccount = {
  curve: "CURVE_SECP256K1",
  pathFormat: "PATH_FORMAT_BIP32",
  path: "m/44'/60'/0'/0/0",
  addressFormat: "ADDRESS_FORMAT_ETHEREUM",
} as const;

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

  const turnkeyConfig = useMemo(() => {
    const ts = Date.now();
    const suborgParams = {
      userName: `User-${ts}`,
      customWallet: {
        walletName: `Wallet-${ts}`,
        walletAccounts: [ethereumWalletAccount],
      },
    };

    return {
      apiBaseUrl: "https://api.turnkey.com",
      organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID || "",
      authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID || "",

      auth: {
        oauthConfig: {
          oauthRedirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || "",
          googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
        },
        methods: {
          emailOtpAuthEnabled: true,
          passkeyAuthEnabled: true,
          googleOauthEnabled: true,
          walletAuthEnabled: false,
        },
        methodOrder: ["email", "socials", "passkey"] as Array<
          "socials" | "email" | "sms" | "passkey" | "wallet"
        >,
        createSuborgParams: {
          emailOtpAuth: suborgParams,
          oauth: suborgParams,
          passkeyAuth: { ...suborgParams, passkeyName: "Pharos Passkey" },
        },
      },

      ui: {
        darkMode: true,
        borderRadius: "12",
        colors: {
          dark: {
            primary: "#8b5cf6",
            primaryText: "#ffffff",
            button: "#1a1726",
            modalBackground: "#1a1726",
            modalText: "#e5e7eb",
            iconBackground: "#1e1b2e",
            iconText: "#9ca3af",
            success: "#34d399",
            danger: "#f87171",
          },
        },
      },
    };
  }, []);

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
