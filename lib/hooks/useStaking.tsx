"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { getSDK } from "../starkzap";
import { useAuth } from "../contexts/AuthContext";
import { InjectedStarkzapWallet } from "../staking/InjectedStarkzapWallet";
import { Amount } from "starkzap";
import { toast } from "sonner";
import { NETWORK } from "../constants";

export function useStaking() {
  const { wallet: account, currentUser } = useAuth();
  
  const wallet = useMemo(() => {
    if (!account) return null;
    return new InjectedStarkzapWallet(account);
  }, [account]);

  const [pools, setPools] = useState<any[]>([]);
  const [position, setPosition] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    try {
      const { mainnetValidators, sepoliaValidators } = await import("starkzap");
      
      const networks: ("sepolia" | "mainnet")[] = ["sepolia", "mainnet"];
      const allPools: any[] = [];
      
      for (const net of networks) {
        const sdk = await getSDK(net);
        if (!sdk) continue;
        
        const validators = net === "mainnet" ? Object.values(mainnetValidators) : Object.values(sepoliaValidators);
        
        for (const v of validators) {
          try {
            const vPools = await sdk.getStakerPools((v as any).stakerAddress);
            allPools.push(...vPools.map((p: any) => ({ 
              ...p, 
              validatorName: (v as any).name,
              network: net 
            })));
          } catch (err: any) {
            // Silence "Staker does not exist" errors as they are common for inactive validators
            if (!err?.message?.includes("Staker does not exist")) {
              console.error(`Failed to fetch pools for ${v.name} (${net}):`, err);
            }
          }
        }
      }
      
      setPools(allPools);
      // Auto-select first pool if none selected
      if (allPools.length > 0 && !selectedPool) {
        setSelectedPool(allPools[0].poolContract);
      }
    } catch (err) {
      console.error("Failed to fetch pools:", err);
    }
  }, [selectedPool]);

  const fetchPosition = useCallback(async () => {
    if (!wallet || !selectedPool) return;

    try {
      const pos = await (wallet as any).getPoolPosition(selectedPool);
      setPosition(pos);
    } catch (err) {
      console.error("Failed to fetch position:", err);
      setPosition(null);
    }
  }, [wallet, selectedPool]);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  useEffect(() => {
    fetchPosition();
    const id = setInterval(fetchPosition, 10000);
    return () => clearInterval(id);
  }, [fetchPosition]);

  // Handle network switch when pool changes
  useEffect(() => {
    if (selectedPool) {
      const pool = pools.find(p => p.poolContract === selectedPool);
      if (pool) {
        getSDK(pool.network); // Trigger re-init
      }
    }
  }, [selectedPool, pools]);

  const stake = useCallback(async (amountStr: string) => {
    if (!wallet || !selectedPool) return;
    setIsLoading(true);
    try {
      const { sepoliaTokens, mainnetTokens } = await import("starkzap");
      const pool = pools.find(p => p.poolContract === selectedPool);
      const tokens = pool?.network === "mainnet" ? mainnetTokens : sepoliaTokens;
      const amount = Amount.parse(amountStr, tokens.STRK);
      
      const tx = await (wallet as any).stake(selectedPool, amount);
      toast.info("Staking transaction submitted...");
      await tx.wait();
      toast.success("Staked successfully!");
      fetchPosition();
    } catch (err: any) {
      toast.error("Staking failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, selectedPool, pools, fetchPosition]);

  const claimRewards = useCallback(async () => {
    if (!wallet || !selectedPool) return;
    setIsLoading(true);
    try {
      const tx = await (wallet as any).claimPoolRewards(selectedPool);
      toast.info("Claiming rewards...");
      await tx.wait();
      toast.success("Rewards claimed!");
      fetchPosition();
    } catch (err: any) {
      toast.error("Claim failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, selectedPool, fetchPosition]);

  const exitIntent = useCallback(async (amountStr: string) => {
    if (!wallet || !selectedPool) return;
    setIsLoading(true);
    try {
      const { sepoliaTokens, mainnetTokens } = await import("starkzap");
      const pool = pools.find(p => p.poolContract === selectedPool);
      const tokens = pool?.network === "mainnet" ? mainnetTokens : sepoliaTokens;
      const amount = Amount.parse(amountStr, tokens.STRK);

      const tx = await (wallet as any).exitPoolIntent(selectedPool, amount);
      toast.info("Exit intent submitted...");
      await tx.wait();
      toast.success("Exit intent declared!");
      fetchPosition();
    } catch (err: any) {
      toast.error("Exit intent failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, selectedPool, pools, fetchPosition]);

  const exitComplete = useCallback(async () => {
    if (!wallet || !selectedPool) return;
    setIsLoading(true);
    try {
      const tx = await (wallet as any).exitPool(selectedPool);
      toast.info("Completing withdrawal...");
      await tx.wait();
      toast.success("Withdrawal complete!");
      fetchPosition();
    } catch (err: any) {
      toast.error("Withdrawal failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, selectedPool, fetchPosition]);

  return {
    pools,
    selectedPool,
    setSelectedPool,
    position,
    isLoading,
    stake,
    claimRewards,
    exitIntent,
    exitComplete,
    refresh: fetchPosition
  };
}
