"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ContentToken, Listing, ContractAddress } from '../mock/types';
import { useAuth } from './AuthContext';
import { useSocial } from './SocialContext';
import { useMarketplaceContract } from '../hooks/useMarketplace';

interface MarketplaceContextType {
  tokens: Record<ContractAddress, ContentToken>;
  listings: Listing[];
  vaultBalances: Record<ContractAddress, Record<ContractAddress, string>>;
  createContentToken: (postId: string, name: string, symbol: string, basePrice: string, priceStep: string) => ContractAddress;
  buyToken: (tokenAddress: ContractAddress, amount: string) => void;
  sellToken: (tokenAddress: ContractAddress, amount: string) => void;
  listToken: (tokenAddress: ContractAddress, amount: string, pricePerToken: string, autoSavePct: number) => Promise<void>;
  buyFromListing: (listingId: string, amount: string) => Promise<void>;
  updatePrice: (listingId: string, newPrice: string) => Promise<void>;
  cancelListing: (listingId: string) => Promise<void>;
  depositToVault: (token: ContractAddress, amount: string) => void;
  withdrawFromVault: (token: ContractAddress, amount: string) => Promise<void>;
  vaultEarnings: Record<ContractAddress, Record<ContractAddress, string>>;
  getPrice: (tokenAddress: ContractAddress, amount: string, isBuy: boolean) => [string, string];

  tipCreator: (postId: string, amount: string) => void;
  addToken: (token: ContentToken) => void;
  fetchListings: () => Promise<void>;
}

const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const SAVINGS_VAULT_ADDRESS = "0x019a43f1a3fa4ffde33a422988144600382a32a2dd0ce6e1c46168c170905ab3";

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, strkBalance, setStrkBalance } = useAuth();
  const { posts, setPosts } = useSocial();
  const marketplaceHook = useMarketplaceContract();

  const [tokens, setTokens] = useState<Record<ContractAddress, ContentToken>>({
    "0xTOKEN1": {
      address: "0xTOKEN1",
      name: "First Post Token",
      symbol: "FPT",
      postId: "1",
      creator: "0x123",
      totalSupply: "1000",
      basePrice: "0.01",
      priceStep: "0.001",
      circulatingSold: "10"
    }
  });

  const [listings, setListings] = useState<Listing[]>([]);

  const fetchListings = useCallback(async () => {
    const rawListings = await marketplaceHook.getActiveListings();
    // Convert to mock Listing format if necessary
    const mapped: Listing[] = rawListings.map(l => ({
      id: l.listing_id,
      seller: l.seller,
      contentToken: l.content_token,
      amount: (BigInt(l.amount) / BigInt(10)**BigInt(18)).toString(), // Convert from 18 decimals
      pricePerToken: (BigInt(l.price_per_token) / BigInt(10)**BigInt(18)).toString(),
      autoSavePct: l.auto_save_pct,
      active: l.active,
      createdAt: l.created_at * 1000 // Convert from seconds to ms
    }));
    setListings(mapped);
  }, [marketplaceHook]);

  const { getVaultBalance, getVaultLifetimeEarnings } = marketplaceHook;

  const fetchVaultData = useCallback(async () => {
    if (!currentUser) return;
    
    const [balance, earnings] = await Promise.all([
      getVaultBalance(currentUser, STRK_TOKEN_ADDRESS),
      getVaultLifetimeEarnings(currentUser, STRK_TOKEN_ADDRESS)
    ]);
    
    setVaultBalances(prev => ({
      ...prev,
      [currentUser]: { ...prev[currentUser], [STRK_TOKEN_ADDRESS]: balance }
    }));
    setVaultEarnings(prev => ({
      ...prev,
      [currentUser]: { ...prev[currentUser], [STRK_TOKEN_ADDRESS]: earnings }
    }));
  }, [currentUser, getVaultBalance, getVaultLifetimeEarnings]);


  useEffect(() => {
    if (currentUser) {
      fetchVaultData();
    }
  }, [currentUser, fetchVaultData]);


  const [vaultBalances, setVaultBalances] = useState<Record<ContractAddress, Record<ContractAddress, string>>>({});
  const [vaultEarnings, setVaultEarnings] = useState<Record<ContractAddress, Record<ContractAddress, string>>>({});


  const createContentToken = (postId: string, name: string, symbol: string, basePrice: string, priceStep: string): ContractAddress => {
    if (!currentUser) return "";
    const address = `0xTOKEN_${Math.random().toString(36).substring(7)}`;
    const newToken: ContentToken = {
      address,
      name,
      symbol,
      postId,
      creator: currentUser,
      totalSupply: "0",
      basePrice,
      priceStep,
      circulatingSold: "0"
    };
    setTokens(prev => ({ ...prev, [address]: newToken }));
    return address;
  };

  const buyToken = (tokenAddress: ContractAddress, amount: string) => {
    // ... bonding curve buy logic remains (mock) ...
  };

  const sellToken = (tokenAddress: ContractAddress, amount: string) => {
    // ... bonding curve sell logic remains (mock) ...
  };

  const getPrice = (tokenAddress: ContractAddress, amount: string, isBuy: boolean): [string, string] => {
    // ... price calculation remains (mock) ...
    const token = tokens[tokenAddress];
    if (!token) return ["0", "0"];
    const amountNum = parseFloat(amount);
    const sold = parseFloat(token.circulatingSold);
    const base = parseFloat(token.basePrice);
    const step = parseFloat(token.priceStep);

    if (isBuy) {
      const cost = amountNum * base + step * (sold * amountNum + (amountNum * (amountNum - 1)) / 2);
      return [cost.toFixed(4), (cost / amountNum).toFixed(4)];
    } else {
      const price = (amountNum * base + step * (sold * amountNum - (amountNum * (amountNum + 1)) / 2)) * 0.95;
      return [price.toFixed(4), (price / amountNum).toFixed(4)];
    }
  };

  const listToken = async (tokenAddress: ContractAddress, amount: string, pricePerToken: string, autoSavePct: number) => {
    await marketplaceHook.listToken(tokenAddress, amount, pricePerToken, autoSavePct);
    await fetchListings();
  };

  const buyFromListing = async (listingId: string, amount: string) => {
    const listing = listings.find(l => l.id === listingId);
    if (!listing) return;
    const totalCost = (parseFloat(amount) * parseFloat(listing.pricePerToken)).toString();
    await marketplaceHook.buyFromListing(listingId, amount, totalCost);
    await fetchListings();
  };

  const updatePrice = async (listingId: string, newPrice: string) => {
    await marketplaceHook.updatePrice(listingId, newPrice);
    await fetchListings();
  };

  const cancelListing = async (listingId: string) => {
    await marketplaceHook.cancelListing(listingId);
    await fetchListings();
  };

  const depositToVault = async (token: ContractAddress, amount: string) => {
    if (!currentUser) return;
    await marketplaceHook.depositToVault(token, amount);
    await fetchVaultData();
  };
 
  const withdrawFromVault = async (token: ContractAddress, amount: string) => {
    if (!currentUser) return;
    await marketplaceHook.withdrawFromVault(token, amount);
    await fetchVaultData();
  };

  const tipCreator = (postId: string, amount: string) => {
    if (!currentUser) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const currentBalance = parseFloat(strkBalance[currentUser] || "0");
    const tipAmount = parseFloat(amount);
    if (currentBalance < tipAmount) return;

    const newBalances = {
      ...strkBalance,
      [currentUser]: (currentBalance - tipAmount).toString(),
      [post.creator]: (parseFloat(strkBalance[post.creator] || "0") + tipAmount).toString()
    };
    setStrkBalance(newBalances);

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, tipTotal: (parseFloat(p.tipTotal) + tipAmount).toString() } : p));
  };
  const addToken = (token: ContentToken) => {
    setTokens(prev => ({ ...prev, [token.address]: token }));
  };

  return (
    <MarketplaceContext.Provider value={{
      tokens, listings, vaultBalances, vaultEarnings, createContentToken, buyToken, sellToken,
      listToken, buyFromListing, updatePrice, cancelListing, depositToVault,
      withdrawFromVault, getPrice, tipCreator, addToken, fetchListings
    }}>

      {children}
    </MarketplaceContext.Provider>
  );
}

export const useMarketplace = () => {
  const context = useContext(MarketplaceContext);
  if (context === undefined) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
};
