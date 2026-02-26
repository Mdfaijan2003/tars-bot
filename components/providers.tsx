"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    return url ? new ConvexReactClient(url) : null;
  }, []);

  return (
    <ClerkProvider>
      {convex ? <ConvexProvider client={convex}>{children}</ConvexProvider> : children}
    </ClerkProvider>
  );
}
