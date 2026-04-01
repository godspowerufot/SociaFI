"use client";

import React, { createContext, useContext, useCallback } from "react";
import { ContractAddress } from "../mock/types";
import { useWallet } from "@/store/useWallet";

interface AuthContextType {
  currentUser: ContractAddress | null;
  wallet: any | null;   // WalletAccount instance — use this for execute()
  swo: any | null;      // StarknetWindowObject — use this for wallet_* RPC calls
  strkBalance: Record<ContractAddress, string>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  setStrkBalance: (balance: Record<ContractAddress, string>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Pull EVERYTHING directly from the Zustand store.
  // walletAccount is the WalletAccount built with WalletAccount.connect(provider, swo)
  // — it delegates signing to the browser extension and never triggers a
  // spurious deploy_account call on an already-deployed account.
  const {
    starknetAddress,
    walletAccount,
    swo,
    balances,
    connectStarknet,
    disconnectStarknet,
  } = useWallet();

  const currentUser = starknetAddress as ContractAddress | null;

  // wallet === walletAccount. Exposed as `wallet` to keep the rest of the
  // codebase (useSocialContract, etc.) unchanged.
  const wallet = walletAccount;

  const strkBalance: Record<ContractAddress, string> = {};
  if (currentUser && balances.starknet) {
    strkBalance[currentUser] = balances.starknet;
  }

  const connectWallet = useCallback(async () => {
    await connectStarknet();
  }, [connectStarknet]);

  const disconnectWallet = useCallback(async () => {
    await disconnectStarknet();
  }, [disconnectStarknet]);

  const refreshBalance = useCallback(async () => {
    // Balance refresh is handled by ChainDataProvider's polling interval
    // which calls useWallet.setStarknetBalance on each tick.
  }, []);

  const setStrkBalance = useCallback(
    (newBalance: Record<ContractAddress, string>) => {
      if (currentUser && newBalance[currentUser]) {
        useWallet.getState().setStarknetBalance(newBalance[currentUser]);
      }
    },
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        wallet,
        swo,
        strkBalance,
        connectWallet,
        disconnectWallet,
        refreshBalance,
        setStrkBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
