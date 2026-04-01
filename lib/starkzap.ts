import { NETWORK, STARKNET_RPC_URL, STRK_TOKEN_ADDRESS } from "./constants";

// Singleton SDK instance (client-only)
let sdkInstance: any = null;

export async function getSDK() {
  if (typeof window === "undefined") return null;
  if (sdkInstance) return sdkInstance;
  
  const { StarkZap } = await import("starkzap");
  sdkInstance = new StarkZap({
    network: "sepolia"
  });
  return sdkInstance;
}

export async function connectWallet() {
  const sdk = await getSDK();
  if (!sdk) return null;

  const onboard = () =>
    sdk.onboard({
      strategy: "cartridge",
      cartridge: {
        policies: [
          { target: STRK_TOKEN_ADDRESS, method: "transfer" },
          { target: STRK_TOKEN_ADDRESS, method: "approve" },
        ],
      },
      deploy: "if_needed",
    });

  try {
    const { wallet } = await onboard();
    return wallet;
  } catch (err) {
    console.error("Connection failed:", err);
    throw err;
  }
}

export async function getWalletBalance(wallet: any) {
  const { sepoliaTokens, mainnetTokens } = await import("starkzap");
  const tokens = NETWORK === "sepolia" ? sepoliaTokens : mainnetTokens;

  try {
    const balanceResult = await wallet.balanceOf(tokens.STRK);
    return balanceResult.toFormatted();
  } catch (err) {
    console.error("Failed to fetch balance:", err);
    return "0";
  }
}
