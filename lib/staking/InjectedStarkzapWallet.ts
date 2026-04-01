import { WalletAccount, Call, RpcProvider } from "starknet";

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
}