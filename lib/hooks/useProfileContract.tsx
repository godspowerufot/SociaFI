import { useState, useCallback } from "react";
import { Call, RpcProvider, CallData, byteArray, cairo } from "starknet";
import {
  PROFILE_ADDRESS,
  STARKNET_RPC_URL,
} from "../constants";
import { useAuth } from "../contexts/AuthContext";
import { normalizeAddress } from "../utils/starknet";
import { toast } from "sonner";
import React from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const SEPOLIA_CHAIN_ID = "0x534e5f5345504f4c4941";
const CHAIN_SYNC_RETRIES = 6;
const CHAIN_SYNC_INTERVAL_MS = 800;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfileContract() {
  const { wallet, swo, currentUser } = useAuth();
  const [isTxPending, setIsTxPending] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getReadProvider = useCallback((): RpcProvider => {
    return new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  }, []);

  const ensureSepolia = useCallback(async (): Promise<void> => {
    if (!swo) return;
    let currentChainId: string | null = null;
    try {
      currentChainId = await swo.request({ type: "wallet_getChainId" });
    } catch {
      currentChainId = swo.chainId ?? (swo as any).currentChainId ?? null;
    }
    if (!currentChainId || currentChainId === SEPOLIA_CHAIN_ID) return;

    try {
      await swo.request({
        type: "wallet_switchStarknetChain",
        params: { chainId: SEPOLIA_CHAIN_ID },
      });
    } catch (switchError) {
      return;
    }

    for (let i = 0; i < CHAIN_SYNC_RETRIES; i++) {
        await new Promise((r) => setTimeout(r, CHAIN_SYNC_INTERVAL_MS));
        try {
          const confirmedId = await swo.request({ type: "wallet_getChainId" });
          if (confirmedId === SEPOLIA_CHAIN_ID) return;
        } catch {}
      }
  }, [swo]);

  const readContract = useCallback(
    async (entrypoint: string, calldata: any[] = []): Promise<string[]> => {
      const provider = getReadProvider();
      try {
        const result = await provider.callContract({
          contractAddress: PROFILE_ADDRESS,
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

  const decodeByteArray = (
    felts: string[],
    start: number
  ): { value: string; next: number } => {
    const dataLen = Number(BigInt(felts[start]));
    let result = "";

    for (let i = 0; i < dataLen; i++) {
      const felt = felts[start + 1 + i];
      const hex = (felt.startsWith("0x") ? felt.slice(2) : felt).padStart(62, "0");
      for (let j = 0; j < 62; j += 2) {
        result += String.fromCharCode(parseInt(hex.slice(j, j + 2), 16));
      }
    }

    const pendingWord = felts[start + 1 + dataLen];
    const pendingWordLen = Number(BigInt(felts[start + 2 + dataLen]));
    if (pendingWordLen > 0) {
      const hex = (pendingWord.startsWith("0x") ? pendingWord.slice(2) : pendingWord).padStart(pendingWordLen * 2, "0");
      for (let j = 0; j < pendingWordLen * 2; j += 2) {
        result += String.fromCharCode(parseInt(hex.slice(j, j + 2), 16));
      }
    }

    return { value: result, next: start + 3 + dataLen };
  };

  // ── Write operations ──────────────────────────────────────────────────────

  const register = async (username: string, bio: string, avatarCid: string) => {
    if (!wallet || !currentUser) throw new Error("Wallet not connected");
    await ensureSepolia();
    setIsTxPending(true);

    try {
      const call: Call = {
        contractAddress: PROFILE_ADDRESS,
        entrypoint: "register",
        calldata: CallData.compile([
          byteArray.byteArrayFromString(username),
          byteArray.byteArrayFromString(bio),
          byteArray.byteArrayFromString(avatarCid),
        ]),
      };

      const tx = await wallet.execute([call]);
      const txHash = tx.transaction_hash;
      
      toast.promise(getReadProvider().waitForTransaction(txHash), {
        loading: "Registering Identity...",
        success: "Identity Registered!",
        error: "Registration failed",
      });

      return txHash;
    } finally {
      setIsTxPending(false);
    }
  };

  const updateProfile = async (bio: string, avatarCid: string) => {
    if (!wallet || !currentUser) throw new Error("Wallet not connected");
    await ensureSepolia();
    setIsTxPending(true);

    try {
      const call: Call = {
        contractAddress: PROFILE_ADDRESS,
        entrypoint: "update_profile",
        calldata: CallData.compile([
          byteArray.byteArrayFromString(bio),
          byteArray.byteArrayFromString(avatarCid),
        ]),
      };

      const tx = await wallet.execute([call]);
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  };

  const follow = async (target: string) => {
    if (!wallet || !currentUser) throw new Error("Wallet not connected");
    await ensureSepolia();
    setIsTxPending(true);

    try {
      const call: Call = {
        contractAddress: PROFILE_ADDRESS,
        entrypoint: "follow",
        calldata: CallData.compile([target]),
      };

      const tx = await wallet.execute([call]);
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  };

  const unfollow = async (target: string) => {
    if (!wallet || !currentUser) throw new Error("Wallet not connected");
    await ensureSepolia();
    setIsTxPending(true);

    try {
      const call: Call = {
        contractAddress: PROFILE_ADDRESS,
        entrypoint: "unfollow",
        calldata: CallData.compile([target]),
      };

      const tx = await wallet.execute([call]);
      return tx.transaction_hash;
    } finally {
      setIsTxPending(false);
    }
  };

  // ── Read operations ───────────────────────────────────────────────────────

  const getProfile = useCallback(async (user: string) => {
    try {
      const felts = await readContract("get_profile", [user]);
      if (!felts || felts.length === 0) return null;

      let current = 0;
      const owner = normalizeAddress(felts[current++]);
      
      const { value: username, next: nextAfterUsername } = decodeByteArray(felts, current);
      current = nextAfterUsername;

      const { value: bio, next: nextAfterBio } = decodeByteArray(felts, current);
      current = nextAfterBio;

      const { value: avatarCid, next: nextAfterAvatar } = decodeByteArray(felts, current);
      current = nextAfterAvatar;

      const createdAt = Number(BigInt(felts[current++]));
      const followerCount = Number(BigInt(felts[current++]));
      const followingCount = Number(BigInt(felts[current++]));
      const registered = felts[current++] !== "0";

      return {
        owner,
        username,
        bio,
        avatarCid,
        createdAt,
        followerCount,
        followingCount,
        registered
      };
    } catch (e) {
      return null;
    }
  }, [readContract, decodeByteArray]);

  const isRegistered = useCallback(async (user: string) => {
    const res = await readContract("is_registered", [user]);
    return res[0] !== "0";
  }, [readContract]);

  const getFollowers = useCallback(async (user: string) => {
    const res = await readContract("get_followers", [user]);
    const count = Number(BigInt(res[0]));
    const followers = [];
    for (let i = 0; i < count; i++) {
        followers.push(normalizeAddress(res[i+1]));
    }
    return followers;
  }, [readContract]);

  const getFollowing = useCallback(async (user: string) => {
    const res = await readContract("get_following", [user]);
    const count = Number(BigInt(res[0]));
    const following = [];
    for (let i = 0; i < count; i++) {
        following.push(normalizeAddress(res[i+1]));
    }
    return following;
  }, [readContract]);

  return {
    register,
    updateProfile,
    follow,
    unfollow,
    getProfile,
    isRegistered,
    getFollowers,
    getFollowing,
    isTxPending
  };
}
