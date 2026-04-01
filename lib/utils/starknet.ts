import { num } from "starknet";

/**
 * Normalizes a Starknet address to a standard format:
 * - Leading 0x
 * - Lowcase
 * - Padded to 64 hex characters (total 66 including 0x)
 */
export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return "0x0";
  try {
    return num.toHex(num.toBigInt(address)).toLowerCase();
  } catch {
    return address.toLowerCase();
  }
}

/**
 * Safely compares two Starknet addresses regardless of padding or case.
 */
export function compareAddresses(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeAddress(a) === normalizeAddress(b);
}

/**
 * Generates a Voyager explorer URL for a transaction or contract.
 */
export function getVoyagerUrl(identifier: string, type: 'tx' | 'contract' = 'tx'): string {
  if (!identifier) return "https://sepolia.voyager.online";
  
  // If the identifier is very short or 0x0, it's likely invalid
  if (identifier === "0x0" || identifier.length < 5) return "https://sepolia.voyager.online";

  const cleanId = normalizeAddress(identifier);
  return `https://sepolia.voyager.online/${type}/${cleanId}`;
}
