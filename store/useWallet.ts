"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { connect, disconnect } from "@starknet-io/get-starknet";
import { RpcProvider, WalletAccount } from "starknet";
import { STARKNET_RPC_URL } from "@/lib/constants";

type NumericString = string;

type Balances = {
  starknet?: NumericString | null;
};

export interface StakeHistoryItem {
  id: string;
  txHash: string;
  explorerUrl: string;
  poolAddress: string;
  tokenSymbol: string;
  amount: string;
  createdAt: string;
}

type WalletState = {
  isConnecting: boolean;
  connected: boolean;
  hasStarknetConnected: boolean;
  starknetAddress: string | null;
  starknetWalletName: string | null;
  balances: Balances;
  stakeHistory: StakeHistoryItem[];

  // ── Live instances (never persisted) ──────────────────────────────────────
  // walletAccount: the WalletAccount that delegates signing to the browser
  //   extension. This is what must be passed to wallet.execute() — never
  //   swo.account, which is a raw AccountInterface that triggers spurious
  //   deploy_account calls on already-deployed accounts.
  // swo: the raw StarknetWindowObject from get-starknet, needed for chain
  //   switching and other wallet_* RPC methods.
  walletAccount: WalletAccount | null;
  swo: any | null;

  detectProviders: () => void;
  connectStarknet: () => Promise<void>;
  disconnectStarknet: () => Promise<void>;
  reconnectWallets: () => Promise<void>;
  setStarknetBalance: (balance: NumericString | null) => void;
  setStarknetAddress: (
    address: string | null,
    walletName?: string | null,
    walletAccount?: WalletAccount | null,
    swo?: any | null
  ) => void;
  addStakeHistory: (item: StakeHistoryItem) => void;
  clearStakeHistory: () => void;
};

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      isConnecting: false,
      connected: false,
      hasStarknetConnected: false,
      starknetAddress: null,
      starknetWalletName: null,
      balances: {},
      stakeHistory: [],

      // Live instances — start null, populated on connect
      walletAccount: null,
      swo: null,

      detectProviders: () => {
        // No-op; kept for API compatibility
      },

      setStarknetAddress: (address, walletName, walletAccount, swo) => {
        set({
          starknetAddress: address,
          starknetWalletName: walletName ?? null,
          hasStarknetConnected: Boolean(address),
          connected: Boolean(address),
          walletAccount: walletAccount ?? null,
          swo: swo ?? null,
        });
      },

      connectStarknet: async () => {
        const currentState = get();
        if (currentState.isConnecting || currentState.starknetAddress) {
          return;
        }

        try {
          set({ isConnecting: true });

          const swo = await connect({
            modalMode: "alwaysAsk",
            modalTheme: "dark",
          });

          if (!swo) {
            throw new Error("Failed to connect Starknet wallet");
          }

          // Build a WalletAccount using our own RPC provider.
          // WalletAccount.connect() wires the account to the browser extension
          // for signing while using our provider for reads — this is the ONLY
          // correct way to get an account that:
          //   1. Does not inject a deploy_account call for already-deployed accounts
          //   2. Routes execute() through the extension (user sees the approval popup)
          //   3. Uses our reliable RPC for fee estimation and receipt polling
          const provider = new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
          const walletAccount = await WalletAccount.connect(provider, swo);

          // Wait until the address propagates from the extension
          const maxAttempts = 50;
          for (let i = 0; i < maxAttempts; i++) {
            if (
              walletAccount.address !== "" &&
              walletAccount.address !==
              "0x0000000000000000000000000000000000000000000000000000000000000000"
            ) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          if (!walletAccount.address || walletAccount.address === "0x0000000000000000000000000000000000000000000000000000000000000000") {
            throw new Error("Wallet address did not resolve after connection");
          }

          // Store BOTH the live instances AND the derived metadata.
          // walletAccount and swo are intentionally not persisted (see partialize)
          // because class instances cannot survive serialization.
          set({
            walletAccount,
            swo,
            starknetAddress: walletAccount.address,
            starknetWalletName: swo.name,
            hasStarknetConnected: true,
            connected: true,
          });
        } catch (error) {
          console.error("Failed to connect Starknet wallet:", error);
          // Clear any partial state on failure
          set({ walletAccount: null, swo: null });
          throw error;
        } finally {
          set({ isConnecting: false });
        }
      },

      disconnectStarknet: async () => {
        try {
          await disconnect({ clearLastWallet: true });
        } catch {
          // ignore disconnect errors
        }
        set({
          walletAccount: null,
          swo: null,
          starknetAddress: null,
          starknetWalletName: null,
          hasStarknetConnected: false,
          connected: false,
          balances: { ...get().balances, starknet: null },
        });
      },

      reconnectWallets: async () => {
        const { starknetWalletName, starknetAddress } = get();
        // Only attempt reconnect if we previously connected but lost the session
        if (starknetWalletName && !starknetAddress) {
          try {
            await get().connectStarknet();
          } catch (error) {
            console.error("Failed to reconnect Starknet wallet:", error);
          }
        }
      },

      setStarknetBalance: (balance: NumericString | null) => {
        set((state) => ({
          balances: { ...state.balances, starknet: balance },
        }));
      },

      addStakeHistory: (item: StakeHistoryItem) => {
        set((state) => ({
          stakeHistory: [item, ...state.stakeHistory].slice(0, 100),
        }));
      },

      clearStakeHistory: () => {
        set({ stakeHistory: [] });
      },
    }),
    {
      name: "wallet-store",
      // IMPORTANT: never persist live instances — WalletAccount and swo are
      // class instances that cannot be JSON-serialized. They must be
      // re-created on each page load via reconnectWallets().
      partialize: (state) => ({
        balances: state.balances,
        stakeHistory: state.stakeHistory,
        starknetWalletName: state.starknetWalletName,
        hasStarknetConnected: state.hasStarknetConnected,
      }),
    },
  ),
);