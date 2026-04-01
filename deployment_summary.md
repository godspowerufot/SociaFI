# 🚀 Social DApp — Starknet Sepolia Deployment Summary

All core smart contracts for the Social DApp are now live on **Starknet Sepolia**.

## 🔑 Account Details
- **Account Name:** `sepolia`
- **Account Address:** `0x07d3f6828d2c80e1a97e19305266b5fb472a450f191f6e081b8451669e5e1a41`
- **Network:** `sepolia`

---

## 🏗️ Deployed Contracts

| Contract | Address | Class Hash |
|----------|---------|------------|
| **Profile** | `0x060b17faa437131c7e39b1fc02ef05a6650affad32d5bcffe5c4848e69576907` | `0x06187935623ee1e28015e4b9d89b2a6ff6009dccdffbf5d16cbda2ab53fca563` |
| **SavingsVault** | `0x019a43f1a3fa4ffde33a422988144600382a32a2dd0ce6e1c46168c170905ab3` | `0x33842b2c3e0fdff9bf6fb55edc177a7059936d9aee765ca124d49647ad386f8` |
| **SocialPost** | `0x030ac37a82358774c98a7c392aadc786f9e025929f322b050405a081382fb59f` | `0x385538ad1bd4dae7067c600aff1896d50adcc6f8fa68ee70710f654af823308` |
| **Marketplace** | `0x02dc3aebfad701cb428639a3087fee30733061d8bfc8a0b4428f6b58a7d24085` | `0x47b7def21c07c01c169e2c7dd1eccfe1806d97dd31ef672790c971c7ff69aa9` |

---

## 📦 Declared Classes (Ready for Factory Deployment)

| Contract | Class Hash |
|----------|------------|
| **ContentToken** | `0x04898d141b9429d1437f13b1e41fd577a2539c3b77d20e6c887b93218855d32c` |

---

## 🔗 Verification Links (Voyager/Starkscan)

- **Account:** [0x07d3...1a41](https://sepolia.voyager.online/contract/0x07d3f6828d2c80e1a97e19305266b5fb472a450f191f6e081b8451669e5e1a41)
- **Profile:** [0x060b...6907](https://sepolia.voyager.online/contract/0x060b17faa437131c7e39b1fc02ef05a6650affad32d5bcffe5c4848e69576907)
- **SavingsVault:** [0x019a...5ab3](https://sepolia.voyager.online/contract/0x019a43f1a3fa4ffde33a422988144600382a32a2dd0ce6e1c46168c170905ab3)
- **SocialPost:** [0x030a...b59f](https://sepolia.voyager.online/contract/0x030ac37a82358774c98a7c392aadc786f9e025929f322b050405a081382fb59f)
- **Marketplace:** [0x02dc...4085](https://sepolia.voyager.online/contract/0x02dc3aebfad701cb428639a3087fee30733061d8bfc8a0b4428f6b58a7d24085)

---

## 🛠️ Deployment Summary
1. Created new Sepolia account.
2. Compiled and declared all 5 contract classes sequentially.
3. Deployed core contracts in dependency order.
4. Corrected Marketplace arguments (`u256` passed as 1 felt in `sncast`).
5. Recorded all addresses and hashes for project frontend integration.
