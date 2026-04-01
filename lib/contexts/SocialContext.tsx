import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Post, ContractAddress } from '../mock/types';
import { useAuth } from './AuthContext';
import { useSocialContract } from '../hooks/useSocialContract';
import { useProfileContract } from '../hooks/useProfileContract';
import { toast } from 'sonner';

interface SocialContextType {
  profiles: Record<ContractAddress, UserProfile>;
  posts: Post[];
  registerProfile: (username: string, bio: string, avatarCid: string) => Promise<void>;
  updateProfile: (bio: string, avatarCid: string) => Promise<void>;
  follow: (target: ContractAddress) => Promise<void>;
  unfollow: (target: ContractAddress) => Promise<void>;
  createPost: (contentCid: string, title: string) => Promise<string>;
  setTokenAddress: (postId: string, tokenAddress: ContractAddress) => Promise<string>;
  refreshPosts: () => Promise<void>;
  fetchProfile: (address: string) => Promise<UserProfile | null>;
  isTxPending: boolean;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const { 
    getAllPosts, 
    createPost: createSocialPost, 
    setTokenAddress: setSocialTokenAddress,
    isTxPending: postTxPending 
  } = useSocialContract();
  
  const { 
    register, 
    updateProfile: updateOnChainProfile, 
    follow: followOnChain, 
    unfollow: unfollowOnChain,
    getProfile,
    isTxPending: profileTxPending
  } = useProfileContract();

  const [profiles, setProfiles] = useState<Record<ContractAddress, UserProfile>>({});
  const [posts, setPosts] = useState<Post[]>([]);

  const isTxPending = postTxPending || profileTxPending;

  const fetchProfile = useCallback(async (address: string) => {
    if (profiles[address] && profiles[address].registered) return profiles[address];
    
    try {
      const p = await getProfile(address);
      if (p) {
        setProfiles(prev => ({ ...prev, [address]: p }));
        return p;
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [getProfile, profiles]);

  const refreshPosts = useCallback(async () => {
    try {
      const livePosts = await getAllPosts();
      setPosts(livePosts);
      
      // Pre-fetch profiles for all creators mentioned in the feed
      const uniqueCreators = Array.from(new Set(livePosts.map(p => p.creator)));
      await Promise.all(uniqueCreators.map(addr => fetchProfile(addr)));
    } catch (e) {
      console.error("Failed to refresh posts:", e);
    }
  }, [getAllPosts, fetchProfile]);


  useEffect(() => {
    refreshPosts();
    if (currentUser) {
      fetchProfile(currentUser);
    }
  }, [refreshPosts, currentUser, fetchProfile]);

  const registerProfile = async (username: string, bio: string, avatarCid: string) => {
    if (!currentUser) return;
    try {
      await register(username, bio, avatarCid);
      await fetchProfile(currentUser);
      toast.success("Profile registered!");
    } catch (e) {
      console.error("Registration error:", e);
    }
  };

  const updateProfile = async (bio: string, avatarCid: string) => {
    if (!currentUser) return;
    try {
      await updateOnChainProfile(bio, avatarCid);
      await fetchProfile(currentUser);
      toast.success("Profile updated!");
    } catch (e) {
      console.error("Update error:", e);
    }
  };

  const follow = async (target: ContractAddress) => {
    if (!currentUser) return;
    try {
      await followOnChain(target);
      await Promise.all([fetchProfile(currentUser), fetchProfile(target)]);
      toast.success("Followed!");
    } catch (e) {
      console.error("Follow error:", e);
    }
  };

  const unfollow = async (target: ContractAddress) => {
    if (!currentUser) return;
    try {
      await unfollowOnChain(target);
      await Promise.all([fetchProfile(currentUser), fetchProfile(target)]);
      toast.success("Unfollowed!");
    } catch (e) {
      console.error("Unfollow error:", e);
    }
  };

  const createPost = async (contentCid: string, title: string): Promise<string> => {
    const txHash = await createSocialPost(contentCid, title);
    await refreshPosts();
    return txHash;
  };

  const setTokenAddress = async (postId: string, tokenAddress: ContractAddress) => {
    const txHash = await setSocialTokenAddress(postId, tokenAddress);
    await refreshPosts();
    return txHash;
  };

  return (
    <SocialContext.Provider value={{ 
      profiles, 
      posts, 
      registerProfile, 
      updateProfile, 
      follow, 
      unfollow, 
      createPost, 
      setTokenAddress,
      refreshPosts,
      fetchProfile,
      isTxPending
    }}>
      {children}
    </SocialContext.Provider>
  );
}

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (context === undefined) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
};

