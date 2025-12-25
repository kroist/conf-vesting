# Confidential Vesting Frontend 🎨

A modern React 19 web application for privacy-first token vesting, built with fhevm (Fully Homomorphic Encryption). The smart contracts are based on OpenZeppelin's [VestingWallet](https://docs.openzeppelin.com/contracts/5.x/api/finance#VestingWallet) pattern, adapted for FHE. Features client-side encryption/decryption, dual role perspectives (Employer/Employee), and a token-centric user experience.

> **Encryption happens before the transaction. Decryption happens only in the browser.**

## 🚀 Tech Stack

### Core Framework

- **React 19** - Latest React with improved performance and new features
- **TypeScript** - Strict type safety throughout the application
- **Vite (Rolldown)** - Next-generation build tool with blazing-fast HMR

### Blockchain Integration

- **Wagmi v2** - React hooks for Ethereum
- **Viem** - TypeScript-first Ethereum library
- **ConnectKit** - Beautiful wallet connection UI
- **Zama Relayer SDK** - FHE-aware transaction execution and decryption

### State Management

- **TanStack Query (React Query)** - Async state management and caching
- **Zustand** - Lightweight global state (navigation, decryption cache)

### UI/Styling

- **Tailwind CSS v4** - Token-driven utility-first CSS
- **shadcn/ui** - Composable component system built on:
  - **Radix UI** - Accessible, unstyled primitives
  - **CVA** - Type-safe variant management
  - **Lucide React** - Beautiful icon system

### Architecture Patterns

- **Strict TypeScript** - Build-time type enforcement
- **Deterministic rendering** - Predictable UI behavior
- **Agent-friendly code** - Clear separation of concerns
- **Side-effect boundaries** - Explicit async operations with TanStack Query

## 📦 Prerequisites

- **Node.js**: v20 or higher
- **pnpm**: v8 or higher (recommended package manager)
- **Wallet**: MetaMask or ConnectKit-compatible wallet
- **Network**: Sepolia testnet with test ETH

## 🛠️ Installation

```bash
cd frontend
pnpm install
```

## ⚙️ Configuration

### Environment Variables

Create `.env.local` for custom configuration:

```bash

# WalletConnect Project ID
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
# First token address
VITE_ACME_TOKEN_ADDRESS=0xE9DBCcBC3B68F5f39321791c0eFD3ead31416390
# Second token address
VITE_GLOBEX_TOKEN_ADDRESS=0x83487c665F5cC5D4E58229BB4650abD0a164E9C5
# Third token address
VITE_PEPE_TOKEN_ADDRESS=0x9803648B0B5C5B630DBA7390dFe69A63D09E4cE4
# ConfVestingFactory address
VITE_FACTORY_ADDRESS=0xEa1F1f22fAF78C45D48134eC8710c55151603316

```

## 🚀 Development

### Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173)

**Features:**

- ⚡ Hot Module Replacement (HMR)
- 🔄 Automatic page reload on contract changes
- 🎨 Live Tailwind CSS updates
- 📊 React Query DevTools

### Build for Production

```bash
pnpm build
```

Output directory: `dist/`

### Preview Production Build

```bash
pnpm preview
```

### Linting

```bash
pnpm lint
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/                # App shell components
│   │   │   ├── Header.tsx         # Navigation + wallet connect
│   │   │   └── NetworkGuard.tsx   # Enforce Sepolia network
│   │   ├── privacy/               # FHE-specific components
│   │   │   ├── EncryptedValue.tsx # Display encrypted/decrypted values
│   │   │   ├── PrivacyBadge.tsx   # Show encryption status
│   │   │   ├── PrivacyBanner.tsx  # Education banner
│   │   │   └── VestedAmountCalculator.tsx # Client-side vesting math
│   │   ├── tokens/                # Token management
│   │   │   ├── TokenBalance.tsx   # Display confidential balances
│   │   │   ├── TokenFaucet.tsx    # Mint demo tokens
│   │   │   └── TokenTable.tsx     # Token overview
│   │   ├── ui/                    # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   └── ... (other shadcn components)
│   │   ├── vesting/               # Vesting-specific components
│   │   │   ├── ClaimTokens.tsx    # Release vested tokens
│   │   │   ├── DepositTokens.tsx  # Deposit encrypted tokens
│   │   │   ├── VestingCard.tsx    # Individual vesting display
│   │   │   └── VestingTable.tsx   # List of vestings
│   │   └── views/                 # Page-level components
│   │       ├── CreateVesting.tsx  # Employer: create vesting flow
│   │       ├── EmployeeDashboard.tsx # Employee perspective
│   │       ├── EmployerDashboard.tsx # Employer perspective
│   │       └── VestingDetail.tsx  # Detail view (shared)
│   ├── hooks/                     # Custom React hooks
│   │   ├── useEmployeeVestings.ts # Fetch beneficiary vestings
│   │   ├── useEmployeeVestingsAddress.ts # Get vesting addresses
│   │   ├── useEncryptedTokenBalances.ts # Decrypt token balances
│   │   ├── useFhevm.ts            # Initialize FHE instance
│   │   ├── useVestings.ts         # Fetch owner vestings
│   │   └── useVestingsAddreses.ts # Get owner vesting addresses
│   ├── lib/                       # Utilities and configuration
│   │   ├── abis/                  # Contract ABIs
│   │   │   ├── confVestingAbi.ts
│   │   │   ├── confVestingAbiFactoryAbi.ts
│   │   │   └── erc7984MintableTokenAbi.ts
│   │   ├── chainPublicActions.ts  # Viem public client
│   │   ├── consts.ts              # Contract addresses & config
│   │   ├── mockData.ts            # Development data
│   │   ├── utils.ts               # Helper functions
│   │   └── wagmiConfig.ts         # Wagmi/wallet configuration
│   ├── store/                     # Zustand stores
│   │   ├── decryptionStore.ts     # Cache decrypted values
│   │   └── navigationStore.ts     # Role selection & routing
│   ├── App.tsx                    # Root component
│   ├── Providers.tsx              # Context providers wrapper
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles + Tailwind imports
├── public/                        # Static assets
├── components.json                # shadcn configuration
├── package.json                   # Dependencies
├── pnpm-lock.yaml                 # Lock file
├── tsconfig.json                  # TypeScript config (app)
├── tsconfig.app.json              # App-specific TS config
├── tsconfig.node.json             # Node/Vite TS config
└── vite.config.ts                 # Vite configuration
```

## 🎨 Key Features

### 1. Employer/Employee Role Toggle

Global role switcher that changes the perspective without changing wallet:

```typescript
// navigationStore.ts
type Role = "employer" | "employee";

// UI updates based on role
{
  role === "employer" ? <EmployerDashboard /> : <EmployeeDashboard />;
}
```

**Why**: A single address may create vestings (employer) and receive them (employee).

### 2. Token-Centric Flow

All vesting operations start by selecting a confidential ERC-7984 token:

1. **Home Page**: Display token balances with decryption status
2. **Select Token**: Choose which token to use for vesting
3. **Create/Deposit**: Use the selected token in operations
4. **Claim**: Release vested amounts of specific tokens

### 3. Client-Side Encryption/Decryption

**Encryption Flow** (before transaction):

```typescript
import { useFhevm } from "@/hooks/useFhevm";

const { instance } = useFhevm();

// Encrypt amount client-side
const encryptedAmount = await instance.createEncryptedInput(
  contractAddress,
  userAddress
);
encryptedAmount.add64(amount); // Add plaintext amount
const { handles, inputProof } = encryptedAmount.encrypt();

// Submit encrypted data to contract
await contract.depositTokens(handles[0], inputProof);
```
