export type ContractAddress = string;

export interface UserProfile {
  owner: ContractAddress;
  username: string;
  bio: string;
  avatarCid: string;
  createdAt: number;
  followerCount: number;
  followingCount: number;
  registered: boolean;
}

export interface Post {
  id: string;
  creator: ContractAddress;
  title: string;
  contentCid: string;
  timestamp: number;
  tipTotal: string; // u256 as string
  tokenAddress?: ContractAddress;
}

export interface ContentToken {
  address: ContractAddress;
  name: string;
  symbol: string;
  postId: string;
  creator: ContractAddress;
  totalSupply: string;
  basePrice: string;
  priceStep: string;
  circulatingSold: string;
}

export interface Listing {
  id: string;
  seller: ContractAddress;
  contentToken: ContractAddress;
  amount: string;
  pricePerToken: string;
  autoSavePct: number;
  active: boolean;
  createdAt: number;
}

export interface VaultBalance {
  user: ContractAddress;
  token: ContractAddress;
  balance: string;
  totalEarned: string;
}
