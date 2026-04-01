import { useState, useCallback, useMemo } from "react";

import { RpcProvider, CallData, cairo, Contract } from "starknet";
import {
  MARKETPLACE_ADDRESS,
  STRK_TOKEN_ADDRESS,
  STARKNET_RPC_URL,
  SAVINGS_VAULT_ADDRESS,
} from "../constants";

import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { normalizeAddress } from "../utils/starknet";
import React from "react";
import { Amount } from "starkzap";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Listing {
  listing_id: string;
  seller: string;
  content_token: string;
  amount: string;
  price_per_token: string;
  auto_save_pct: number;
  active: boolean;
  created_at: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMarketplaceContract() {
  const { wallet, currentUser } = useAuth();
  const [isListing, setIsListing] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const getReadProvider = useCallback(
    () => new RpcProvider({ nodeUrl: STARKNET_RPC_URL }),
    []
  );

  const readContract = useCallback(
    async (entrypoint: string, calldata: any[] = []): Promise<string[]> => {
      const provider = getReadProvider();
      try {
        const result = await provider.callContract({
          contractAddress: MARKETPLACE_ADDRESS,
          entrypoint,
          calldata,
        });
        return Array.isArray(result) ? result : (result as any).result;
      } catch (error) {
        console.error(`Error reading ${entrypoint}:`, error);
        throw error;
      }
    },
    [getReadProvider]
  );

  const decodeListing = (
    felts: string[],
    start: number
  ): { listing: Listing; next: number } => {
    let current = start;

    const listing_id = BigInt(felts[current++]).toString();
    const seller = normalizeAddress(felts[current++]);
    const content_token = normalizeAddress(felts[current++]);

    const amountLow = BigInt(felts[current++]);
    const amountHigh = BigInt(felts[current++]);
    const amount = (amountHigh * 2n ** 128n + amountLow).toString();

    const priceLow = BigInt(felts[current++]);
    const priceHigh = BigInt(felts[current++]);
    const price_per_token = (priceHigh * 2n ** 128n + priceLow).toString();

    const auto_save_pct = Number(BigInt(felts[current++]));
    const active = BigInt(felts[current++]) === 1n;
    const created_at = Number(BigInt(felts[current++]));

    return {
      listing: {
        listing_id,
        seller,
        content_token,
        amount,
        price_per_token,
        auto_save_pct,
        active,
        created_at,
      },
      next: current,
    };
  };

  const strkToRaw = (amount: string): bigint => {
    try {
      return Amount.parse(amount, 18, "STRK").toBase();
    } catch {
      return BigInt(amount);
    }
  };

  // ── List Token ─────────────────────────────────────────────────────────────

  const listToken = async (
    tokenAddress: string,
    amount: string,
    pricePerToken: string,
    autoSavePct: number
  ): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    setIsListing(true);
    try {
      const amountRaw = cairo.uint256(strkToRaw(amount).toString());
      const priceRaw = cairo.uint256(strkToRaw(pricePerToken).toString());

      // 1. Approve Marketplace to take the tokens
      // 2. Call list_token
      const tx = await wallet.execute([
        {
          contractAddress: tokenAddress,
          entrypoint: "approve",
          calldata: CallData.compile([MARKETPLACE_ADDRESS, amountRaw]),
        },
        {
          contractAddress: MARKETPLACE_ADDRESS,
          entrypoint: "list_token",
          calldata: CallData.compile([
            tokenAddress,
            amountRaw,
            priceRaw,
            autoSavePct.toString(),
          ]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getReadProvider().waitForTransaction(txHash), {
        loading: "Listing tokens on marketplace...",
        success: "Tokens listed!",
        error: "Listing failed",
      });

      await getReadProvider().waitForTransaction(txHash);
      return txHash;
    } catch (error: any) {
      console.error("Error listing token:", error);
      toast.error("Listing failed", {
        description: error.message ?? "An unexpected error occurred",
      });
      throw error;
    } finally {
      setIsListing(false);
    }
  };

  // ── Buy from Listing ───────────────────────────────────────────────────────

  const buyFromListing = async (
    listingId: string,
    amount: string,
    totalCostStrk: string
  ): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    setIsBuying(true);
    try {
      const amountRaw = cairo.uint256(strkToRaw(amount).toString());
      const costRaw = cairo.uint256(strkToRaw(totalCostStrk).toString());

      // 1. Approve Marketplace to take STRK
      // 2. Call buy
      const tx = await wallet.execute([
        {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: "approve",
          calldata: CallData.compile([MARKETPLACE_ADDRESS, costRaw]),
        },
        {
          contractAddress: MARKETPLACE_ADDRESS,
          entrypoint: "buy",
          calldata: CallData.compile([listingId, amountRaw]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getReadProvider().waitForTransaction(txHash), {
        loading: "Purchasing from marketplace...",
        success: "Purchase complete!",
        error: "Purchase failed",
      });

      await getReadProvider().waitForTransaction(txHash);
      return txHash;
    } catch (error: any) {
      console.error("Error buying from listing:", error);
      toast.error("Purchase failed", {
        description: error.message ?? "An unexpected error occurred",
      });
      throw error;
    } finally {
      setIsBuying(false);
    }
  };

  // ── Cancel Listing ─────────────────────────────────────────────────────────

  const cancelListing = async (listingId: string): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      const tx = await wallet.execute([
        {
          contractAddress: MARKETPLACE_ADDRESS,
          entrypoint: "cancel_listing",
          calldata: CallData.compile([listingId]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getReadProvider().waitForTransaction(txHash), {
        loading: "Cancelling listing...",
        success: "Listing cancelled!",
        error: "Cancellation failed",
      });

      await getReadProvider().waitForTransaction(txHash);
      return txHash;
    } catch (error: any) {
      console.error("Error cancelling listing:", error);
      toast.error("Cancellation failed");
      throw error;
    }
  };

  // ── Update Price ───────────────────────────────────────────────────────────

  const updatePrice = async (listingId: string, newPrice: string): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      const priceRaw = cairo.uint256(strkToRaw(newPrice).toString());

      const tx = await wallet.execute([
        {
          contractAddress: MARKETPLACE_ADDRESS,
          entrypoint: "update_price",
          calldata: CallData.compile([listingId, priceRaw]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getReadProvider().waitForTransaction(txHash), {
        loading: "Updating price...",
        success: "Price updated!",
        error: "Update failed",
      });

      await getReadProvider().waitForTransaction(txHash);
      return txHash;
    } catch (error: any) {
      console.error("Error updating price:", error);
      toast.error("Update failed");
      throw error;
    }
  };

  // ── Fetch Listings ─────────────────────────────────────────────────────────

  const getActiveListings = useCallback(async (): Promise<Listing[]> => {
    setIsFetching(true);
    try {
      const felts = await readContract("get_all_active_listings");
      if (!felts || felts.length === 0) return [];

      const count = Number(BigInt(felts[0]));
      const listings: Listing[] = [];
      let current = 1;

      for (let i = 0; i < count; i++) {
        const { listing, next } = decodeListing(felts, current);
        listings.push(listing);
        current = next;
      }

      return listings.reverse(); // Newest first
    } catch (error) {
      console.error("Error fetching listings:", error);
      return [];
    } finally {
      setIsFetching(false);
    }
  }, [readContract, decodeListing]);

  // ── Vault Operations ──────────────────────────────────────────────────────
 
  const depositToVault = async (token: string, amount: string): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      const amountRaw = cairo.uint256(strkToRaw(amount).toString());

      // 1. Approve Vault to take tokens
      // 2. Call deposit
      const tx = await wallet.execute([
        {
          contractAddress: token,
          entrypoint: "approve",
          calldata: CallData.compile([SAVINGS_VAULT_ADDRESS, amountRaw]),
        },
        {
          contractAddress: SAVINGS_VAULT_ADDRESS,
          entrypoint: "deposit",
          calldata: CallData.compile([token, amountRaw]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getReadProvider().waitForTransaction(txHash), {
        loading: "Depositing to vault...",
        success: "Deposit complete!",
        error: "Deposit failed",
      });

      await getReadProvider().waitForTransaction(txHash);
      return txHash;
    } catch (error: any) {
      console.error("Error depositing to vault:", error);
      toast.error("Deposit failed");
      throw error;
    }
  };

  const withdrawFromVault = async (token: string, amount: string): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    try {
      const amountRaw = cairo.uint256(strkToRaw(amount).toString());

      const tx = await wallet.execute([
        {
          contractAddress: SAVINGS_VAULT_ADDRESS,
          entrypoint: "withdraw",
          calldata: CallData.compile([token, amountRaw]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getReadProvider().waitForTransaction(txHash), {
        loading: "Withdrawing from vault...",
        success: "Withdrawal complete!",
        error: "Withdrawal failed",
      });

      await getReadProvider().waitForTransaction(txHash);
      return txHash;
    } catch (error: any) {
      console.error("Error withdrawing from vault:", error);
      toast.error("Withdrawal failed");
      throw error;
    }
  };

  const getVaultBalance = useCallback(async (user: string, token: string): Promise<string> => {
    try {
      const provider = getReadProvider();
      const result = await provider.callContract({
        contractAddress: SAVINGS_VAULT_ADDRESS,
        entrypoint: "get_balance",
        calldata: CallData.compile([user, token]),
      });
      const felts = Array.isArray(result) ? result : (result as any).result;
      const low = BigInt(felts[0]);
      const high = BigInt(felts[1] ?? "0");
      const raw = (high * 2n ** 128n + low).toString();
      // Manual formatting for now to match context
      return (Number(BigInt(raw)) / 1e18).toString();
    } catch (error) {
      console.error("Error fetching vault balance:", error);
      return "0";
    }
  }, [getReadProvider]);

  const getVaultLifetimeEarnings = useCallback(async (user: string, token: string): Promise<string> => {
    try {
      const provider = getReadProvider();
      const result = await provider.callContract({
        contractAddress: SAVINGS_VAULT_ADDRESS,
        entrypoint: "get_total_earned",
        calldata: CallData.compile([user, token]),
      });
      const felts = Array.isArray(result) ? result : (result as any).result;
      const low = BigInt(felts[0]);
      const high = BigInt(felts[1] ?? "0");
      const raw = (high * 2n ** 128n + low).toString();
      return (Number(BigInt(raw)) / 1e18).toString();
    } catch (error) {
      console.error("Error fetching vault earnings:", error);
      return "0";
    }
  }, [getReadProvider]);

  return useMemo(() => ({
    listToken,
    buyFromListing,
    cancelListing,
    updatePrice,
    getActiveListings,
    depositToVault,
    withdrawFromVault,
    getVaultBalance,
    getVaultLifetimeEarnings,
    isListing,
    isBuying,
    isFetching,
  }), [
    listToken,
    buyFromListing,
    cancelListing,
    updatePrice,
    getActiveListings,
    depositToVault,
    withdrawFromVault,
    getVaultBalance,
    getVaultLifetimeEarnings,
    isListing,
    isBuying,
    isFetching
  ]);
}

