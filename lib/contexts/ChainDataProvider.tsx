"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { ChainDataContext } from "./ChainDataContext";
import {
  connect,
  disconnect,
  StarknetWindowObject,
} from "@starknet-io/get-starknet";
import { RpcProvider, WalletAccount } from "starknet";
import { useWallet } from "@/store/useWallet";
import { getPresets } from "starkzap";
import { InjectedStarkzapWallet } from "@/lib/staking/InjectedStarkzapWallet";
import { STARKNET_RPC_URL, NETWORK } from "../constants";

const STARKNET_AUTO_RECONNECT_KEY = "social_dapp:starknet:auto-reconnect";

function setStarknetAutoReconnectEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(STARKNET_AUTO_RECONNECT_KEY, "1");
    } else {
      window.localStorage.removeItem(STARKNET_AUTO_RECONNECT_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function isStarknetAutoReconnectEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STARKNET_AUTO_RECONNECT_KEY) === "1";
  } catch {
    return false;
  }
}

export function ChainDataProvider({ children }: { children: React.ReactNode }) {
  const { setStarknetBalance, setStarknetAddress } = useWallet();

  const [starknetAccount, setStarknetAccount] = useState<WalletAccount | null>(
    null,
  );
  const [starknetWalletData, setStarknetWalletData] =
    useState<StarknetWindowObject | null>(null);
  const hasAttemptedStarknetAutoReconnect = useRef(false);

  const establishStarknetConnection = useCallback(
    async (swo: StarknetWindowObject) => {
      const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
      const walletAccount = await WalletAccount.connect(provider, swo);

      // Wait for address to be populated
      const maxAttempts = 50;
      for (let i = 0; i < maxAttempts; i++) {
        if (
          walletAccount.address !==
            "0x0000000000000000000000000000000000000000000000000000000000000000" &&
          walletAccount.address !== ""
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setStarknetAccount(walletAccount);
      setStarknetWalletData(swo);
      setStarknetAddress(walletAccount.address, swo.name, walletAccount, swo);

      swo.on("accountsChanged", (accounts: string[] | undefined) => {
        if (accounts && accounts.length > 0) {
          setStarknetAccount(walletAccount);
        } else {
          setStarknetAccount(null);
          setStarknetWalletData(null);
          setStarknetBalance(null);
          setStarknetAddress(null);
        }
      });
    },
    [setStarknetBalance, setStarknetAddress],
  );

  const connectStarknetWallet = useCallback(async () => {
    try {
      const swo = await connect({ modalMode: "alwaysAsk", modalTheme: "dark" });

      if (!swo) {
        throw new Error("Failed to connect Starknet wallet");
      }
      await establishStarknetConnection(swo);
      setStarknetAutoReconnectEnabled(true);
    } catch (error) {
      console.error("Failed to connect Starknet wallet:", error);
      throw error;
    }
  }, [establishStarknetConnection]);

  const disconnectStarknetWallet = useCallback(async () => {
    try {
      await disconnect({ clearLastWallet: true });
      setStarknetAccount(null);
      setStarknetWalletData(null);
      setStarknetBalance(null);
      setStarknetAddress(null);
      setStarknetAutoReconnectEnabled(false);
    } catch (error) {
      console.error("Failed to disconnect Starknet wallet:", error);
    }
  }, [setStarknetBalance, setStarknetAddress]);

  const refreshStrkBalance = useCallback(async () => {
    if (!starknetAccount) {
      setStarknetBalance(null);
      return;
    }

    try {
      const wallet = await InjectedStarkzapWallet.fromAccount(
        starknetAccount as never,
      );
      
      const { sepoliaTokens, mainnetTokens } = await import("starkzap");
      const tokens = NETWORK === "sepolia" ? sepoliaTokens : mainnetTokens;
      const strk = tokens.STRK;
      
      if (!strk) {
        setStarknetBalance(null);
        return;
      }
      const balance = await wallet.balanceOf(strk);
      setStarknetBalance(balance.toUnit());
    } catch (error) {
      console.error("Failed to refresh STRK balance:", error);
    }
  }, [setStarknetBalance, starknetAccount]);


  useEffect(() => {
    refreshStrkBalance();
    if (!starknetAccount) return;

    const id = setInterval(refreshStrkBalance, 30000);
    return () => clearInterval(id);
  }, [refreshStrkBalance, starknetAccount]);

  const contextValue = useMemo(() => {
    const wrappedWallet = starknetAccount ? new InjectedStarkzapWallet(starknetAccount, starknetWalletData) : null;
    
    return {
      STARKNET: {
        chain: {
          name: "Starknet",
          icon: "/icons/starknet.svg",
        },
        wallet: starknetAccount
          ? {
              name: starknetWalletData?.name || "Starknet Wallet",
              icon:
                typeof starknetWalletData?.icon !== "string"
                  ? (starknetWalletData?.icon as any)?.dark || "/icons/starknet.svg"
                  : starknetWalletData?.icon,
              address: starknetAccount.address,
              instance: wrappedWallet,
              swo: starknetWalletData,
            }
          : null,
        id: "STARKNET",
        connect: connectStarknetWallet,
        disconnect: starknetAccount ? disconnectStarknetWallet : undefined,
      },
    };
  }, [
    starknetAccount,
    starknetWalletData,
    connectStarknetWallet,
    disconnectStarknetWallet,
  ]);

  return (
    <ChainDataContext.Provider value={contextValue as any}>
      {children}
    </ChainDataContext.Provider>
  );
}
