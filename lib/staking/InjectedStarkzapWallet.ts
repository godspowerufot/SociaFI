import { WalletAccount, Call, RpcProvider, CallData, cairo } from "starknet";
import { Amount, ChainId, fromAddress } from "starkzap";

const getExplorerUrl = (hash: string) => `https://sepolia.voyager.online/tx/${hash}`;

export interface Tx {
  hash: string;
  explorerUrl: string;
  wait: () => Promise<any>;
  receipt: () => Promise<any>;
}

/**
 * InjectedStarkzapWallet
 *
 * Wraps a starknet.js WalletAccount (which delegates signing to the browser
 * extension) and exposes a Starkzap-compatible interface.
 *
 * KEY RULE: NEVER use swo.account for write operations.
 * swo.account is a raw AccountInterface — it attempts to run a deploy_account
 * preflight on every execute() call. If the account is already deployed on-chain
 * this causes: "Deployment failed: contract already deployed at address 0x..."
 *
 * this.account (WalletAccount) routes through the wallet extension which handles
 * deployment state internally. Always use this.account for execute().
 */
export class InjectedStarkzapWallet {
  private account: WalletAccount;
  private swo: any;

  constructor(account: WalletAccount, swo?: any) {
    this.account = account;
    this.swo = swo || null;
  }

  static async fromAccount(
    account: WalletAccount,
    swo?: any
  ): Promise<InjectedStarkzapWallet> {
    return new InjectedStarkzapWallet(account, swo);
  }

  getChainId(): string {
    return (this.account as any).chainId || "0x534e5f5345504f4c4941";
  }

  getAddress(): string {
    return this.account.address;
  }

  /**
   * Execute one or more contract calls atomically.
   *
   * Always uses this.account (WalletAccount) — never swo.account.
   * WalletAccount delegates to the browser extension which:
   *   1. Already knows the account is deployed.
   *   2. Does NOT inject a spurious deploy_account transaction.
   *   3. Handles fee estimation and signing natively.
   */
  async execute(calls: Call[]): Promise<Tx> {
    const response = await this.account.execute(calls);
    const hash = response.transaction_hash;

    return {
      hash,
      explorerUrl: getExplorerUrl(hash),
      wait: async () => {
        return this.account.waitForTransaction(hash);
      },
      receipt: async () => {
        return (this.account as any).provider.getTransactionReceipt(hash);
      },
    };
  }

  /**
   * ERC20 transfer helper — builds the calldata and delegates to execute().
   */
  async transfer(
    token: { address: string; symbol?: string },
    recipients: { to: string; amount: bigint | string }[]
  ): Promise<Tx> {
    const calls: Call[] = recipients.map((r) => ({
      contractAddress: token.address,
      entrypoint: "transfer",
      calldata: [r.to, r.amount.toString(), "0"],
    }));

    return this.execute(calls);
  }

  /**
   * Read the ERC20 balance of the connected account for any asset.
   * Uses this.account.callContract — a pure read, no signing needed.
   */
  async balanceOf(asset: {
    address: string;
    symbol?: string;
  }): Promise<{
    toUnit: () => string;
    toFormatted: () => string;
    toBase: () => bigint;
  }> {
    try {
      const result = await this.account.callContract({
        contractAddress: asset.address,
        entrypoint: "balanceOf",
        calldata: [this.getAddress()],
      });

      const balanceLow = BigInt(result[0]);
      const balanceHigh = BigInt(result[1]);
      const total = (balanceHigh << BigInt(128)) + balanceLow;

      return {
        toUnit: () => (Number(total) / 1e18).toString(),
        toFormatted: () =>
          `${(Number(total) / 1e18).toFixed(4)} ${asset.symbol ?? "STRK"}`,
        toBase: () => total,
      };
    } catch {
      return {
        toUnit: () => "0.0",
        toFormatted: () => `0.0000 ${asset.symbol ?? "STRK"}`,
        toBase: () => BigInt(0),
      };
    }
  }

  /**
   * Simulate calls before submitting — surface errors cheaply before hitting
   * the sequencer. Returns { ok: true } on success or { ok: false, reason } on failure.
   */
  async preflight(
    calls: Call[]
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      // Use the account's provider to simulate
      const provider: RpcProvider = (this.account as any).provider;
      await provider.getSimulateTransaction(
        // simulateTransaction expects an invocation array
        [
          {
            type: "INVOKE",
            sender_address: this.account.address,
            calldata: await (this.account as any).buildCalldata(calls),
            // Nonce and fee can be omitted for simulation
          },
        ] as any,
        { skipValidate: true }
      );
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? "Simulation failed" };
    }
  }

  // ── Staking Methods ─────────────────────────────────────────────────────────

  private async getStakingContract(): Promise<string> {
    const chainId = this.getChainId();
    const isSepolia = chainId === "0x534e5f5345504f4c4941" || chainId.includes("SN_SEPOLIA");
    
    // In Starkzap SDK, the staking contract is often managed via internal presets
    // or passed to the StarkSDK. For this wrapper, we can fetch it from presets
    // if available, or use a known default for the network.
    const { getPresets } = await import("starkzap");
    const presets = getPresets(isSepolia ? ChainId.SEPOLIA : ChainId.MAINNET) as any;
    return presets.staking?.address || presets.staking || ""; 
  }

  async enterPool(poolAddress: string, amount: Amount): Promise<Tx> {
    const stakingContract = await this.getStakingContract();
    const { sepoliaTokens, mainnetTokens } = await import("starkzap");
    const isSepolia = this.getChainId().includes("SEPOLIA");
    const tokens = isSepolia ? sepoliaTokens : mainnetTokens;
    const strkAddress = (tokens.STRK as any).address || tokens.STRK;

    const amountU256 = cairo.uint256(amount.toBase());
    const calls: Call[] = [
      {
        contractAddress: strkAddress,
        entrypoint: "approve",
        calldata: CallData.compile([poolAddress, amountU256]),
      },
      {
        contractAddress: poolAddress,
        entrypoint: "enter_delegation_pool",
        calldata: CallData.compile([this.getAddress(), amountU256]),
      }
    ];

    return this.execute(calls);
  }

  async addToPool(poolAddress: string, amount: Amount): Promise<Tx> {
    const { sepoliaTokens, mainnetTokens } = await import("starkzap");
    const isSepolia = this.getChainId().includes("SEPOLIA");
    const tokens = isSepolia ? sepoliaTokens : mainnetTokens;
    const strkAddress = (tokens.STRK as any).address || tokens.STRK;

    const amountU256 = cairo.uint256(amount.toBase());
    const calls: Call[] = [
      {
        contractAddress: strkAddress,
        entrypoint: "approve",
        calldata: CallData.compile([poolAddress, amountU256]),
      },
      {
        contractAddress: poolAddress,
        entrypoint: "add_to_delegation_pool",
        calldata: CallData.compile([amountU256]),
      }
    ];

    return this.execute(calls);
  }

  async stake(poolAddress: string, amount: Amount): Promise<Tx> {
    const isMember = await this.isPoolMember(poolAddress);
    if (isMember) {
      return this.addToPool(poolAddress, amount);
    } else {
      return this.enterPool(poolAddress, amount);
    }
  }

  async claimPoolRewards(poolAddress: string): Promise<Tx> {
    const calls: Call[] = [
      {
        contractAddress: poolAddress,
        entrypoint: "claim_rewards",
        calldata: CallData.compile([this.getAddress()]),
      }
    ];

    return this.execute(calls);
  }

  async exitPoolIntent(poolAddress: string, amount: Amount): Promise<Tx> {
    const amountU256 = cairo.uint256(amount.toBase());
    const calls: Call[] = [
      {
        contractAddress: poolAddress,
        entrypoint: "exit_delegation_pool_intent",
        calldata: CallData.compile([amountU256]),
      }
    ];

    return this.execute(calls);
  }

  async exitPool(poolAddress: string): Promise<Tx> {
    const calls: Call[] = [
      {
        contractAddress: poolAddress,
        entrypoint: "exit_delegation_pool",
        calldata: CallData.compile([]),
      }
    ];

    return this.execute(calls);
  }

  async getPoolPosition(poolAddress: string): Promise<any> {
    try {
      const result = await this.account.callContract({
        contractAddress: poolAddress,
        entrypoint: "get_pool_member_info",
        calldata: [this.getAddress()],
      });

      // result format depends on contract, but according to Starkzap docs:
      // staked, rewards, total, unpooling, unpoolTime, commission
      
      const stakedLow = BigInt(result[0]);
      const stakedHigh = BigInt(result[1]);
      const rewardLow = BigInt(result[2]);
      const rewardHigh = BigInt(result[3]);
      
      const stakedRaw = (stakedHigh << 128n) + stakedLow;
      const rewardsRaw = (rewardHigh << 128n) + rewardLow;

      const { sepoliaTokens, mainnetTokens } = await import("starkzap");
      const chainId = this.getChainId();
      const isSepolia = chainId === "0x534e5f5345504f4c4941" || chainId.includes("SN_SEPOLIA");
      const tokens = isSepolia ? sepoliaTokens : mainnetTokens;

      return {
        staked: Amount.fromRaw(stakedRaw, tokens.STRK),
        rewards: Amount.fromRaw(rewardsRaw, tokens.STRK),
        total: Amount.fromRaw(stakedRaw + rewardsRaw, tokens.STRK),
        unpooling: Amount.fromRaw(0n, tokens.STRK), // Placeholder
        unpoolTime: null, // Placeholder
        commissionPercent: 0, // Placeholder
      };
    } catch {
      return null;
    }
  }

  async isPoolMember(poolAddress: string): Promise<boolean> {
    const pos = await this.getPoolPosition(poolAddress);
    return !!pos && !pos.staked.isZero();
  }

  async getPoolCommission(poolAddress: string): Promise<number> {
    try {
      const result = await this.account.callContract({
        contractAddress: poolAddress,
        entrypoint: "get_commission",
        calldata: [],
      });
      return Number(BigInt(result[0])) / 100;
    } catch {
      return 0;
    }
  }
}