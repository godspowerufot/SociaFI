import { useState, useCallback } from "react";
import { RpcProvider, CallData, cairo, byteArray } from "starknet";
import {
  CONTENT_TOKEN_CLASS_HASH,
  STRK_TOKEN_ADDRESS,
  PROTOCOL_FEE_BPS,
  PROTOCOL_FEE_RECIPIENT,
  STARKNET_RPC_URL,
  SOCIAL_POST_ADDRESS,
} from "../constants";
import { Amount } from "starkzap";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenConfig {
  name: string;
  symbol: string;
  postId: number | string;
  initialSupply: string;   // e.g. "100"
  basePriceStrk: string;   // e.g. "0.01"
  priceStepStrk: string;   // e.g. "0.001"
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  buyPrice: bigint;
  sellPrice: bigint;
}

// Universal Deployer Contract on Starknet Sepolia
const UDC_ADDRESS = "0x041a78e741e5af2fec34b695679bc6891742439f7afb8484ecd7766661ad02bf";

// ContractDeployed event selector emitted by UDC
const CONTRACT_DEPLOYED_SELECTOR =
  "0x026b160f10156dea0639bec486f1c16c8ff8b54f8a72729cca59e3a6c2c25fb5";

/** Convert human-readable STRK string to raw u256 bigint (18 decimals) */
const strkToRaw = (amount: string): bigint => {
  return Amount.parse(amount, 18, "STRK").toBase();
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContentToken() {
  const { wallet, currentUser } = useAuth();
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const getProvider = useCallback(
    () => new RpcProvider({ nodeUrl: STARKNET_RPC_URL }),
    []
  );

  // ── Deploy ─────────────────────────────────────────────────────────────────

  /**
   * Deploy a ContentToken via the Universal Deployer Contract.
   *
   * Constructor (content_token.cairo):
   *   name: ByteArray, symbol: ByteArray,
   *   post_id: u64, creator: ContractAddress,
   *   base_price: u256, price_step: u256,
   *   strk_token: ContractAddress,
   *   protocol_fee_bps: u256, protocol_fee_recipient: ContractAddress
   */
  const deployContentToken = async (config: TokenConfig): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    setIsDeploying(true);

    try {
      const basePriceRaw = strkToRaw(config.basePriceStrk);
      const priceStepRaw = strkToRaw(config.priceStepStrk);

      // Encode constructor calldata
      const constructorCalldata = CallData.compile([
        byteArray.byteArrayFromString(config.name),          // name: ByteArray
        byteArray.byteArrayFromString(config.symbol),        // symbol: ByteArray
        config.postId.toString(),                             // post_id: u64
        currentUser,                                          // creator: ContractAddress
        cairo.uint256(strkToRaw(config.initialSupply).toString()), // initial_supply: u256
        cairo.uint256(basePriceRaw.toString()),               // base_price: u256
        cairo.uint256(priceStepRaw.toString()),               // price_step: u256
        STRK_TOKEN_ADDRESS,                                   // strk_token: ContractAddress
        cairo.uint256(PROTOCOL_FEE_BPS.toString()),           // protocol_fee_bps: u256
        PROTOCOL_FEE_RECIPIENT,                               // protocol_fee_recipient: ContractAddress
      ]);

      // Use timestamp as salt — simple, unique per deploy attempt
      const salt = cairo.felt(Date.now().toString());

      // UDC.deployContract(classHash, salt, unique=0, calldataLen, ...calldata)
      const udcCalldata = CallData.compile([
        CONTENT_TOKEN_CLASS_HASH,                              // class_hash
        salt,                                                  // salt
        "0x0",                                                 // unique = false
        constructorCalldata.length.toString(),                 // constructor_calldata_len
        ...constructorCalldata,                               // ...calldata
      ]);

      console.log("Deploying ContentToken via UDC:", {
        classHash: CONTENT_TOKEN_CLASS_HASH,
        postId: config.postId,
        constructorCalldata,
      });

      const tx = await wallet.execute([
        {
          contractAddress: UDC_ADDRESS,
          entrypoint: "deployContract",
          calldata: udcCalldata,
        },
      ]);

      const txHash = tx.transaction_hash;
      console.log("Deploy tx submitted:", txHash);

      toast.promise(getProvider().waitForTransaction(txHash), {
        loading: "Deploying ContentToken on-chain…",
        success: "ContentToken deployed!",
        error: "Deployment failed — check console",
      });

      await getProvider().waitForTransaction(txHash);

      // Extract deployed address from the ERC20 Transfer (mint) event.
      // When the ContentToken constructor runs, it mints the initial supply,
      // emitting Transfer(from=0x0, to=creator, amount). The `from_address`
      // of this event IS the newly deployed token contract.
      const receipt = await getProvider().getTransactionReceipt(txHash);
      const events = (receipt as any).events ?? [];

      console.log("Deploy receipt events:", JSON.stringify(events, null, 2));

      const TRANSFER_SELECTOR = "0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9";
      const ZERO_ADDRESS = "0x0";

      let deployedAddress = "";

      // Primary: find the Transfer mint event emitted by the new token contract
      for (const e of events) {
        if (
          e.keys?.[0] === TRANSFER_SELECTOR &&
          (e.keys?.[1] === ZERO_ADDRESS || e.keys?.[1] === "0x0000000000000000000000000000000000000000000000000000000000000000")
        ) {
          // from_address is the contract that emitted the Transfer event = the new token contract
          const candidate = e.from_address ?? e.fromAddress ?? "";
          if (candidate && candidate !== ZERO_ADDRESS && candidate.length > 30) {
            deployedAddress = candidate;
            break;
          }
        }
      }

      // Fallback: look for UDC ContractDeployed event keys[1]
      if (!deployedAddress) {
        for (const e of events) {
          const fromAddr = (e.from_address ?? e.fromAddress ?? "").toLowerCase();
          const key0 = e.keys?.[0] ?? "";
          if (fromAddr === UDC_ADDRESS.toLowerCase() || key0 === CONTRACT_DEPLOYED_SELECTOR) {
            const candidate = e.keys?.[1] ?? e.data?.[0] ?? "";
            if (candidate && candidate !== ZERO_ADDRESS && candidate.length > 30) {
              deployedAddress = candidate;
              break;
            }
          }
        }
      }

      if (!deployedAddress) {
        deployedAddress = txHash;
        console.warn("⚠️ Could not extract deployed address. Using tx hash as fallback. Check Voyager.", receipt);
        toast.warning("Check Voyager for token address", {
          description: "Could not auto-detect the deployed contract address."
        });
      }

      console.log("ContentToken deployed at:", deployedAddress);
      return deployedAddress;
    } catch (error: any) {
      console.error("Error deploying ContentToken:", error);
      toast.error("Deployment failed", {
        description: error.message ?? "An unexpected error occurred",
      });
      throw error;
    } finally {
      setIsDeploying(false);
    }
  };

  // ── Link to SocialPost ──────────────────────────────────────────────────────

  /**
   * Call SocialPost.set_token_address to link the deployed token to the post.
   * Only the original post creator can call this.
   */
  const linkTokenToPost = async (
    postId: number | string,
    tokenAddress: string
  ): Promise<string> => {
    if (!wallet || !currentUser) {
      toast.error("Wallet not connected");
      throw new Error("Wallet not connected");
    }

    setIsLinking(true);
    try {
      const tx = await wallet.execute([
        {
          contractAddress: SOCIAL_POST_ADDRESS,
          entrypoint: "set_token_address",
          calldata: CallData.compile([postId.toString(), tokenAddress]),
        },
      ]);

      const txHash = tx.transaction_hash;

      toast.promise(getProvider().waitForTransaction(txHash), {
        loading: "Linking token to post…",
        success: () => (
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm">Token Linked!</p>
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
        error: "Failed to link token",
      });

      await getProvider().waitForTransaction(txHash);
      return txHash;
    } catch (error: any) {
      console.error("Error linking token:", error);
      toast.error("Failed to link token", {
        description: error.message ?? "An unexpected error occurred",
      });
      throw error;
    } finally {
      setIsLinking(false);
    }
  };

  // ── Read operations ─────────────────────────────────────────────────────────

  const readToken = useCallback(
    async (tokenAddress: string, entrypoint: string, calldata: any[] = []) => {
      const result = await getProvider().callContract({
        contractAddress: tokenAddress,
        entrypoint,
        calldata,
      });
      return Array.isArray(result) ? result : (result as any).result;
    },
    [getProvider]
  );

  const getTokenInfo = useCallback(
    async (tokenAddress: string, previewAmount = 1n): Promise<TokenInfo> => {
      setIsFetching(true);
      try {
        const [supplyRaw, buyRaw, sellRaw] = await Promise.all([
          readToken(tokenAddress, "total_supply"),
          readToken(tokenAddress, "get_buy_price", [
            cairo.uint256(previewAmount.toString()),
          ]),
          readToken(tokenAddress, "get_sell_price", [
            cairo.uint256(previewAmount.toString()),
          ]),
        ]);

        const fromU256 = (raw: string[]) => {
          const low = BigInt(raw[0] ?? "0");
          const high = BigInt(raw[1] ?? "0");
          return high * 2n ** 128n + low;
        };

        return {
          address: tokenAddress,
          name: "ContentToken",
          symbol: "CT",
          totalSupply: fromU256(supplyRaw),
          buyPrice: fromU256(buyRaw),
          sellPrice: fromU256(sellRaw),
        };
      } finally {
        setIsFetching(false);
      }
    },
    [readToken]
  );

  // ── Trade ───────────────────────────────────────────────────────────────────

  const buyTokens = useCallback(
    async (tokenAddress: string, amount: bigint, maxCostRaw: bigint) => {
      if (!wallet || !currentUser) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      const tx = await wallet.execute([
        {
          contractAddress: STRK_TOKEN_ADDRESS,
          entrypoint: "approve",
          calldata: CallData.compile([
            tokenAddress,
            cairo.uint256(maxCostRaw.toString()),
          ]),
        },
        {
          contractAddress: tokenAddress,
          entrypoint: "buy",
          calldata: CallData.compile([cairo.uint256(amount.toString())]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getProvider().waitForTransaction(txHash), {
        loading: "Buying tokens…",
        success: "Tokens purchased!",
        error: "Buy failed",
      });
      return txHash;
    },
    [wallet, currentUser, getProvider]
  );

  const sellTokens = useCallback(
    async (tokenAddress: string, amount: bigint) => {
      if (!wallet || !currentUser) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      const tx = await wallet.execute([
        {
          contractAddress: tokenAddress,
          entrypoint: "sell",
          calldata: CallData.compile([cairo.uint256(amount.toString())]),
        },
      ]);

      const txHash = tx.transaction_hash;
      toast.promise(getProvider().waitForTransaction(txHash), {
        loading: "Selling tokens…",
        success: "Tokens sold!",
        error: "Sell failed",
      });
      return txHash;
    },
    [wallet, currentUser, getProvider]
  );

  return {
    deployContentToken,
    linkTokenToPost,
    isDeploying,
    isLinking,
    getTokenInfo,
    isFetching,
    buyTokens,
    sellTokens,
  };
}
