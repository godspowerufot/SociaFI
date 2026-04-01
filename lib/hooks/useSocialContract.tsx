import { useState, useCallback } from "react";
import { Call, RpcProvider, CallData, byteArray, cairo, num } from "starknet";
import {
  SOCIAL_POST_ADDRESS,
  STRK_TOKEN_ADDRESS,
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

export function useSocialContract() {
  const { wallet, swo, currentUser } = useAuth();
  const [isTxPending, setIsTxPending] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Always use a fresh RpcProvider for READ operations.
   * This avoids picking up the wallet's internal provider which may be
   * pointed at a different network or have stale state.
   */
  const getReadProvider = useCallback((): RpcProvider => {
    return new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
  }, []);

  /**
   * Ensure the wallet is on Sepolia before any write.
   *
   * Instead of a fixed setTimeout we poll until the chain ID matches,
   * which avoids race conditions where the wallet hasn't finished
   * switching before execute() fires.
   */
  const ensureSepolia = useCallback(async (): Promise<void> => {
    if (!swo) return;

    // 1. Read current chain ID from the extension
    let currentChainId: string | null = null;
    try {
      currentChainId = await swo.request({ type: "wallet_getChainId" });
    } catch {
      currentChainId = swo.chainId ?? (swo as any).currentChainId ?? null;
    }

    if (!currentChainId || currentChainId === SEPOLIA_CHAIN_ID) return;

    // 2. Request the switch
    console.log("Network mismatch — switching to Sepolia...");
    try {
      await swo.request({
        type: "wallet_switchStarknetChain",
        params: { chainId: SEPOLIA_CHAIN_ID },
      });
    } catch (switchError) {
      console.warn("Switch request failed or was rejected:", switchError);
      return;
    }

    // 3. Poll until the extension confirms the new chain — no blind setTimeout
    for (let i = 0; i < CHAIN_SYNC_RETRIES; i++) {
      await new Promise((r) => setTimeout(r, CHAIN_SYNC_INTERVAL_MS));
      try {
        const confirmedId = await swo.request({ type: "wallet_getChainId" });
        if (confirmedId === SEPOLIA_CHAIN_ID) {
          console.log("Sepolia confirmed after", i + 1, "poll(s).");
          return;
        }
      } catch {
        // Extension may be briefly unresponsive during switch — keep polling
      }
    }

    console.warn(
      "Chain ID did not confirm as Sepolia after polling. Proceeding anyway."
    );
  }, [swo]);

  /**
   * Verify the SocialPost contract is reachable.
   * Network errors are treated as non-blocking — a CORS issue with the RPC
   * should not silently block every write operation.
   */
  const validateContract = useCallback(async (): Promise<boolean> => {
    const provider = getReadProvider();
    try {
      const classHash = await provider.getClassHashAt(SOCIAL_POST_ADDRESS);
      console.log(
        "SocialPost verified at",
        SOCIAL_POST_ADDRESS,
        "→",
        classHash
      );
      return true;
    } catch (e: any) {
      const isCors =
        e.message?.includes("CORS") ||
        e.message?.includes("fetch") ||
        e.message?.includes("Failed to load");

      if (isCors) {
        console.warn(
          "RPC network error during validation — proceeding without verification."
        );
        return true;
      }

      console.error(
        "CRITICAL: SocialPost contract not found at",
        SOCIAL_POST_ADDRESS,
        "via RPC",
        STARKNET_RPC_URL
      );
      return false;
    }
  }, [getReadProvider]);

  /**
   * Low-level read helper — always uses a fresh provider so wallet state
   * can never pollute view calls.
   */
  const readContract = useCallback(
    async (entrypoint: string, calldata: any[] = []): Promise<string[]> => {
      const provider = getReadProvider();
      try {
        const result = await provider.callContract({
          contractAddress: SOCIAL_POST_ADDRESS,
          entrypoint,
          calldata,
        });
        // starknet.js v6 returns the array directly; v5 wraps in .result
        return Array.isArray(result) ? result : (result as any).result;
      } catch (error) {
        console.error(`Error reading ${entrypoint}:`, error);
        throw error;
      }
    },
    [getReadProvider]
  );

  // ── ByteArray / Post decoding ─────────────────────────────────────────────

  /**
   * Decode a Cairo ByteArray from a flat felt array starting at `start`.
   * Layout: [data_len, ...data_felts (31 bytes each), pending_word, pending_word_len]
   */
  const decodeByteArray = (
    felts: string[],
    start: number
  ): { value: string; next: number } => {
    const dataLen = Number(BigInt(felts[start]));
    let result = "";

    for (let i = 0; i < dataLen; i++) {
      const felt = felts[start + 1 + i];
      const hex = (felt.startsWith("0x") ? felt.slice(2) : felt).padStart(
        62,
        "0"
      );
      for (let j = 0; j < 62; j += 2) {
        result += String.fromCharCode(parseInt(hex.slice(j, j + 2), 16));
      }
    }

    const pendingWord = felts[start + 1 + dataLen];
    const pendingWordLen = Number(BigInt(felts[start + 2 + dataLen]));
    if (pendingWordLen > 0) {
      const hex = (
        pendingWord.startsWith("0x") ? pendingWord.slice(2) : pendingWord
      ).padStart(pendingWordLen * 2, "0");
      for (let j = 0; j < pendingWordLen * 2; j += 2) {
        result += String.fromCharCode(parseInt(hex.slice(j, j + 2), 16));
      }
    }

    return { value: result, next: start + 3 + dataLen };
  };

  const decodePost = (
    felts: string[],
    start: number
  ): { post: any; next: number } => {
    let current = start;

    const postId = felts[current++];
    const creator = normalizeAddress(felts[current++]);

    const { value: title, next: nextAfterTitle } = decodeByteArray(
      felts,
      current
    );
    current = nextAfterTitle;

    const { value: contentCid, next: nextAfterContent } = decodeByteArray(
      felts,
      current
    );
    current = nextAfterContent;

    const timestamp = felts[current++];
    const tokenAddress = felts[current++];

    // u256 is stored as two felts: low 128 bits, high 128 bits
    const tipLow = BigInt(felts[current++]);
    const tipHigh = BigInt(felts[current++]);
    const tipTotal = tipHigh * BigInt(2) ** BigInt(128) + tipLow;

    return {
      post: {
        post_id: postId,
        id: parseInt(postId, 16).toString(),
        creator,
        title,
        content_cid: contentCid,
        contentCid,
        timestamp,
        token_address: tokenAddress,
        tokenAddress,
        tip_total: tipTotal.toString(),
        tipTotal: tipTotal.toString(),
      },
      next: current,
    };
  };

  // ── Write operations ──────────────────────────────────────────────────────

  /**
   * Shared pre-flight guard for all write operations.
   * Ensures Sepolia network + contract reachable before building any call.
   */
  const guardWrite = useCallback(async () => {
    if (!wallet || !currentUser) throw new Error("Wallet not connected");
    await ensureSepolia();
    const valid = await validateContract();
    if (!valid)
      throw new Error("SocialPost contract not reachable on current RPC");
  }, [wallet, currentUser, ensureSepolia, validateContract]);

  /**
   * Broadcast a new post on-chain.
   * contentCid: IPFS CID string of the post body
   * title: plain-text post title
   */
  const createPost = async (
    contentCid: string,
    title: string
  ): Promise<string> => {
    await guardWrite();
    setIsTxPending(true);

    try {
      let tx: any;
      if (typeof wallet!.tx === "function") {
        tx = await wallet!.tx().add({
          contractAddress: SOCIAL_POST_ADDRESS,
          entrypoint: "create_post",
          calldata: CallData.compile([
            byteArray.byteArrayFromString(contentCid),
            byteArray.byteArrayFromString(title),
          ]),
        }).send({ feeMode: "sponsored" });
      } else {
        const call: Call = {
          contractAddress: SOCIAL_POST_ADDRESS,
          entrypoint: "create_post",
          calldata: CallData.compile([
            byteArray.byteArrayFromString(contentCid),
            byteArray.byteArrayFromString(title),
          ]),
        };
        tx = await wallet!.execute([call]);
      }

      const txHash = tx.hash || tx.transaction_hash;
      const waitPromise = typeof tx.wait === "function" 
        ? tx.wait() 
        : getReadProvider().waitForTransaction(txHash);

      toast.promise(waitPromise, {
        loading: "Creating your post...",
        success: () => (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">Post Created Successfully!</p>
            <a
              href={`https://sepolia.voyager.online/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              View on Explorer
            </a>
          </div>
        ),
        error: "Failed to confirm transaction",
      });

      return txHash;
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post", {
        description: error.message ?? "An unexpected error occurred",
      });
      throw error;
    } finally {
      setIsTxPending(false);
    }
  };

  /**
   * Tip a post creator.
   * Executes approve + tip_creator atomically in a single multicall so the
   * user signs once and the two operations cannot be split.
   *
   * amount: raw u256 string (e.g. "1000000000000000000" for 1 STRK)
   */
  const tipCreator = async (
    postId: number | string,
    amount: string
  ): Promise<string> => {
    await guardWrite();
    setIsTxPending(true);

    try {
      let tx: any;
      if (typeof wallet!.tx === "function") {
        const { Amount } = await import("starkzap");
        const parsedAmount = Amount.parse(amount, 18, "STRK");

        tx = await wallet!.tx()
          .approve(STRK_TOKEN_ADDRESS, SOCIAL_POST_ADDRESS, parsedAmount)
          .add({
            contractAddress: SOCIAL_POST_ADDRESS,
            entrypoint: "tip_creator",
            calldata: CallData.compile([postId.toString(), parsedAmount.toBase()]),
          })
          .send({ feeMode: "sponsored" });
      } else {
        const u256Amount = cairo.uint256(amount);

        const approveCall: Call = {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: "approve",
          calldata: CallData.compile([SOCIAL_POST_ADDRESS, u256Amount]),
        };

        const tipCall: Call = {
          contractAddress: SOCIAL_POST_ADDRESS,
          entrypoint: "tip_creator",
          calldata: CallData.compile([postId.toString(), u256Amount]),
        };

        tx = await wallet!.execute([approveCall, tipCall]);
      }

      const txHash = tx.hash || tx.transaction_hash;
      const waitPromise = typeof tx.wait === "function" 
        ? tx.wait() 
        : getReadProvider().waitForTransaction(txHash);

      toast.promise(waitPromise, {
        loading: "Tipping creator...",
        success: () => (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">Tip Sent Successfully!</p>
            <a
              href={`https://sepolia.voyager.online/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              View on Explorer
            </a>
          </div>
        ),
        error: "Failed to confirm tip transaction",
      });

      return txHash;
    } catch (error: any) {
      console.error("Error tipping creator:", error);
      toast.error("Failed to tip creator", {
        description: error.message ?? "An unexpected error occurred",
      });
      throw error;
    } finally {
      setIsTxPending(false);
    }
  };

  /**
   * Update the token address linked to a post.
   */
  const setTokenAddress = async (
    postId: number | string,
    tokenAddress: string
  ): Promise<string> => {
    await guardWrite();
    setIsTxPending(true);

    try {
      let tx: any;
      if (typeof wallet!.tx === "function") {
        tx = await wallet!.tx().add({
          contractAddress: SOCIAL_POST_ADDRESS,
          entrypoint: "set_token_address",
          calldata: CallData.compile([postId.toString(), tokenAddress]),
        }).send({ feeMode: "sponsored" });
      } else {
        const call: Call = {
          contractAddress: SOCIAL_POST_ADDRESS,
          entrypoint: "set_token_address",
          calldata: CallData.compile([postId.toString(), tokenAddress]),
        };
        tx = await wallet!.execute([call]);
      }

      const txHash = tx.hash || tx.transaction_hash;
      const waitPromise = typeof tx.wait === "function" 
        ? tx.wait() 
        : getReadProvider().waitForTransaction(txHash);

      toast.promise(waitPromise, {
        loading: "Updating token address...",
        success: () => (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">Token Address Updated!</p>
            <a
              href={`https://sepolia.voyager.online/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              View on Explorer
            </a>
          </div>
        ),
        error: "Failed to confirm update",
      });

      return txHash;
    } catch (error: any) {
      console.error("Error setting token address:", error);
      toast.error("Failed to set token address", {
        description: error.message ?? "An unexpected error occurred",
      });
      throw error;
    } finally {
      setIsTxPending(false);
    }
  };

  // ── Read operations ───────────────────────────────────────────────────────

  const getPost = useCallback(
    async (postId: number | string) => {
      const felts = await readContract("get_post", [postId.toString()]);
      return decodePost(felts, 0).post;
    },
    [readContract]
  );

  const getAllPosts = useCallback(async () => {
    const felts = await readContract("get_all_posts");
    if (!felts || felts.length === 0) return [];

    const count = Number(BigInt(felts[0]));
    const posts: any[] = [];
    let current = 1;

    for (let i = 0; i < count; i++) {
      const { post, next } = decodePost(felts, current);
      posts.push(post);
      current = next;
    }

    return posts.reverse(); // Newest first
  }, [readContract]);

  const getPostsByCreator = useCallback(
    async (creatorAddress: string) => {
      const felts = await readContract("get_posts_by_creator", [
        creatorAddress,
      ]);
      if (!felts || felts.length === 0) return [];

      const count = Number(BigInt(felts[0]));
      const posts: any[] = [];
      let current = 1;

      for (let i = 0; i < count; i++) {
        const { post, next } = decodePost(felts, current);
        posts.push(post);
        current = next;
      }

      return posts.reverse();
    },
    [readContract]
  );

  const getPostCount = useCallback(async () => {
    return readContract("get_post_count");
  }, [readContract]);

  const getTipsReceived = useCallback(
    async (postId: number | string) => {
      return readContract("get_tips_received", [postId.toString()]);
    },
    [readContract]
  );

  // ── Public API ────────────────────────────────────────────────────────────

  return {
    // Writes
    createPost,
    tipCreator,
    setTokenAddress,
    // Reads
    getPost,
    getAllPosts,
    getPostsByCreator,
    getPostCount,
    getTipsReceived,
    // State
    isTxPending,
  };
}