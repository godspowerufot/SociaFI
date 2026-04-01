"use client";

import { AuthProvider } from "@/lib/contexts/AuthContext";
import { SocialProvider } from "@/lib/contexts/SocialContext";
import { MarketplaceProvider } from "@/lib/contexts/MarketplaceContext";
import { ChainDataProvider } from "@/lib/contexts/ChainDataProvider";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChainDataProvider>
      <AuthProvider>
        <SocialProvider>
          <MarketplaceProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </MarketplaceProvider>
        </SocialProvider>
      </AuthProvider>
    </ChainDataProvider>
  );
}
