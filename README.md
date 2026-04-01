# 🌐 Social DApp on Starknet

A decentralized social ecosystem built on **Starknet**, focusing on content tokenization, digital identity, and a vibrant marketplace.

## 🚀 Project Overview

This DApp allows users to interact with a decentralized social graph while managing digital assets natively on-chain. Key features include:

-   **Digital Identity**: Register and manage on-chain profiles.
-   **Content Tokenization**: Creators can mint unique content tokens for their posts via the Universal Deployer Contract (UDC).
-   **P2P Marketplace**: Buy, sell, and trade content tokens using **STRK**.
-   **Creator Tipping**: Support creators directly through atomic STRK tips.
-   **Savings Vault**: Securely deposit and manage assets with automated savings protocols.

---

## 🏗️ Deployment Status (Starknet Sepolia)

All core smart contracts are live and verified on the Sepolia testnet.

| Contract | Address | Class Hash |
| :--- | :--- | :--- |
| **Profile** | `0x060b17faa437131c7e39b1fc02ef05a6650affad32d5bcffe5c4848e69576907` | `0x06187935623ee1e28015e4b9d89b2a6ff6009dccdffbf5d16cbda2ab53fca563` |
| **SavingsVault** | `0x019a43f1a3fa4ffde33a422988144600382a32a2dd0ce6e1c46168c170905ab3` | `0x33842b2c3e0fdff9bf6fb55edc177a7059936d9aee765ca124d49647ad386f8` |
| **SocialPost** | `0x030ac37a82358774c98a7c392aadc786f9e025929f322b050405a081382fb59f` | `0x385538ad1bd4dae7067c600aff1896d50adcc6f8fa68ee70710f654af823308` |
| **Marketplace** | `0x02dc3aebfad701cb428639a3087fee30733061d8bfc8a0b4428f6b58a7d24085` | `0x47b7def21c07c01c169e2c7dd1eccfe1806d97dd31ef672790c971c7ff69aa9` |
| **ContentToken** | *Factory Deployed* | `0x04898d141b9429d1437f13b1e41fd577a2539c3b77d20e6c887b93218855d32c` |

### 🔗 Verification Links
- **SocialPost**: [View on Voyager](https://sepolia.voyager.online/contract/0x030ac37a82358774c98a7c392aadc786f9e025929f322b050405a081382fb59f)
- **Marketplace**: [View on Voyager](https://sepolia.voyager.online/contract/0x02dc3aebfad701cb428639a3087fee30733061d8bfc8a0b4428f6b58a7d24085)

---

## ⚡ Starkzap Integration

The project leverages the **Starkzap SDK** to provide a premium user experience with advanced transaction capabilities.

### 1. Onboarding with Cartridge
We use Starkzap to integrate the **Cartridge Controller**, enabling a gasless onboarding flow.
- **Provider**: Managed in `lib/starkzap.ts`.
- **Policy Management**: Automated STRK transfer/approve policies for a "one-click" experience.
- **Auto-Deployment**: Account deployment is handled transparently if needed.

### 2. Advanced Transactions
- **Sponsored Fees**: Social interactions (posting, tipping) utilize `feeMode: "sponsored"` where possible, removing the barrier of gas costs for new users.
- **Atomic Multicalls**: Commands like `tipCreator` bundle multiple contract calls (e.g., ERC20 `approve` + `tip_creator`) into single, atomic transactions.

### 3. Unified Token Architecture
- **Amount Handling**: The `Amount` class manages STRK conversions and formatting with 18-decimal precision.
- **Wallet Wrapper**: `InjectedStarkzapWallet` ensures standard wallets provide a consistent interface with built-in transaction simulation (preflight).

---

## 🛠️ Tech Stack
- **Frontend**: Next.js 15, Tailwind CSS, Heroicons.
- **Blockchain**: Starknet.js, Starkzap SDK.
- **Smart Contracts**: Cairo (OpenZeppelin components).

## 🏁 Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```

3.  **Build for production**:
    ```bash
    npm run build
    ```

---

*This project is part of the 2026 Starknet Social Mesh experiment.*
