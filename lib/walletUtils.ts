import { NETWORK, STARKNET_RPC_URL } from "./constants";

async function isStarknetAutoReconnectEnabled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("starknet_auto_reconnect") === "1";
  } catch {
    return false;
  }
}

export function setStarknetAutoReconnectEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem("starknet_auto_reconnect", "1");
    } else {
      window.localStorage.removeItem("starknet_auto_reconnect");
    }
  } catch {
    // Ignore storage errors
  }
}
