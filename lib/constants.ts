export const NETWORK = "sepolia";

export const STRK_TOKEN_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const SOCIAL_POST_ADDRESS = "0x030ac37a82358774c98a7c392aadc786f9e025929f322b050405a081382fb59f";

// ContentToken class hash — declared on Sepolia, deployed via deploy_from_zero
export const CONTENT_TOKEN_CLASS_HASH = "0x04898d141b9429d1437f13b1e41fd577a2539c3b77d20e6c887b93218855d32c";

// Post tokenization fees/defaults
export const PROTOCOL_FEE_BPS = 250; // 2.5%
export const CREATOR_FEE_BPS = 500; // 5%

// Social Post contract receives protocol fee
export const PROTOCOL_FEE_RECIPIENT = SOCIAL_POST_ADDRESS;

// Marketplace contract
export const MARKETPLACE_ADDRESS = "0x02dc3aebfad701cb428639a3087fee30733061d8bfc8a0b4428f6b58a7d24085";
export const MARKETPLACE_CLASS_HASH = "0x47b7def21c07c01c169e2c7dd1eccfe1806d97dd31ef672790c971c7ff69aa9";

// Proxy via Next.js API route to avoid browser CORS issues
export const STARKNET_RPC_URL = "/api/rpc";

// Savings Vault contract
export const SAVINGS_VAULT_ADDRESS = "0x019a43f1a3fa4ffde33a422988144600382a32a2dd0ce6e1c46168c170905ab3";
export const SAVINGS_VAULT_CLASS_HASH = "0x33842b2c3e0fdff9bf6fb55edc177a7059936d9aee765ca124d49647ad386f8";

// Profile contract
export const PROFILE_ADDRESS = "0x060b17faa437131c7e39b1fc02ef05a6650affad32d5bcffe5c4848e69576907";
export const PROFILE_CLASS_HASH = "0x06187935623ee1e28015e4b9d89b2a6ff6009dccdffbf5d16cbda2ab53fca563";

