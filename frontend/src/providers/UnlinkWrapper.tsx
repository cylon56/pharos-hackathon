"use client";

import { useEffect, useState, createElement, type ReactNode } from "react";

interface UnlinkWrapperProps {
  children: ReactNode;
}

export function UnlinkWrapper({ children }: UnlinkWrapperProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mod, setMod] = useState<any>(null);

  useEffect(() => {
    import("@unlink-xyz/react")
      .then((m) => setMod(m))
      .catch(() => {
        // Unlink SDK unavailable - graceful fallback
      });
  }, []);

  if (!mod?.UnlinkProvider) {
    return <>{children}</>;
  }

  return createElement(
    mod.UnlinkProvider,
    { chain: "monad-testnet" },
    children
  );
}
