# Confidential Vesting 🔒

A confidential token vesting platform built on [fhevm](https://docs.zama.ai/fhevm) (Fully Homomorphic Encryption Virtual Machine) by Zama. Based on OpenZeppelin's [VestingWallet](https://docs.openzeppelin.com/contracts/5.x/api/finance#VestingWallet) pattern, adapted for FHE to keep token amounts completely private on-chain while maintaining transparent vesting schedules.

## 🌟 Key Features

- **🔐 Private Token Amounts**: All token allocations, balances, and releases are encrypted on-chain using FHE
- **👁️ Public Schedules, Private Numbers**: Vesting timelines are transparent, but amounts stay confidential
- **🏢 Employer/Employee Flows**: Dual-perspective UX for issuers and recipients
- **⚡ Real-time Decryption**: Authorized parties decrypt values client-side in the browser
- **🎯 ERC-7984 Compatible**: Built on the confidential token standard
- **🌐 Sepolia Testnet**: Live demo environment with faucet tokens

## 📦 What's Inside

This is a full-stack monorepo containing:

```
fhevm-vesting/
├── contracts/          # Solidity smart contracts (fhevm)
│   ├── ConfVestingWallet.sol
│   ├── ConfVestingWalletFactory.sol
│   └── MockERC7984.sol
│
└── frontend/           # React 19 + TypeScript web app
    ├── Vite (Rolldown) build
    ├── Wagmi + ConnectKit wallet integration
    └── Zama Relayer SDK for FHE operations
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v20 or higher
- **Package Managers**: npm (contracts) + pnpm (frontend)
- **Wallet**: MetaMask or compatible Web3 wallet
- **Network**: Sepolia testnet with test ETH

### 1. Clone the Repository

```bash
git clone https://github.com/kroist/conf-vesting.git
cd fhevm-vesting
```

### 2. Setup Contracts

```bash
cd contracts
npm install

# Configure environment
npx hardhat vars set MNEMONIC
npx hardhat vars set RPC_URL

# Compile and test
npm run compile
npm test

# Deploy to Sepolia
npm run deploy:tokens
npm run deploy:factory
```

See [contracts/README.md](./contracts/README.md) for detailed instructions and architecture.

### 3. Setup Frontend

```bash
cd frontend
pnpm install

# Start development server
pnpm dev
```

Visit `http://localhost:5173` and connect your wallet to Sepolia.

See [frontend/README.md](./frontend/README.md) for detailed setup and tech stack.

## 🏗️ Architecture Overview

### Smart Contract Layer

```
┌─────────────────────────────────────────────────────────────┐
│                 ConfVestingWalletFactory                    │
│  • Creates vesting wallet instances                         │
│  • Indexes by owner (employer) and beneficiary (employee)   │
└────────────────────┬────────────────────────────────────────┘
                     │ createVestingWallet()
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   ConfVestingWallet                         │
│  • Stores encrypted token allocations (euint64)            │
│  • Implements linear vesting schedule                       │
│  • Releases vested tokens confidentially                    │
│  • Uses ERC-7984 confidential transfers                     │
└─────────────────────────────────────────────────────────────┘
```

**Privacy Model:**

- **Public**: Addresses, timestamps, vesting duration
- **Encrypted**: Token amounts, allocations, released balances
- **Permission-gated**: Only owner and beneficiary can decrypt amounts

### Frontend Layer

**Token-First Flow:**

1. User selects a confidential ERC-7984 token
2. Employer creates vesting schedule with encrypted allocation
3. Smart contract stores ciphertext on-chain
4. Authorized users decrypt client-side via fhevm SDK
5. Employee claims vested tokens when schedule allows

**Technology Stack:**

- React 19 + TypeScript (strict mode)
- Vite with Rolldown for blazing-fast builds
- Tailwind CSS v4 + shadcn component system
- Wagmi/Viem for Ethereum interactions
- TanStack Query for async state management
- Zustand for global app state
- Zama Relayer SDK for FHE operations

## 💼 Use Cases

### Employee Equity Vesting

A startup wants to grant tokens to an employee over a 4-year period with a 1-year cliff:

1. **Employer** creates a vesting wallet:
   - Beneficiary: `0xEmployee...`
   - Start: January 1, 2025
   - Duration: 4 years
2. **Employer** deposits encrypted tokens:
   - Amount: 100,000 tokens (encrypted client-side)
   - On-chain: Only ciphertext stored, amount stays private
3. **Employee** views their vesting:
   - Sees total allocation (decrypted in browser)
   - Monitors vesting progress
   - Observers see nothing
4. **Employee** claims periodically:
   - Releases vested tokens via confidential transfer
   - Amount remains encrypted throughout

**Result**: Full vesting functionality without revealing compensation details publicly.

## 🔐 Privacy Guarantees

### What's Hidden

✅ Token allocation amounts  
✅ Already-released balances  
✅ Remaining vested amounts  
✅ Deposit transaction values  
✅ Release transaction amounts

### What's Public

⚠️ Contract addresses  
⚠️ Beneficiary and owner addresses  
⚠️ Vesting start and end timestamps  
⚠️ Transaction existence (not amounts)

### How It Works

**Encryption**: Values are encrypted client-side before blockchain submission using Zama's fhevm library.

**Computation**: Smart contracts perform arithmetic on encrypted values (FHE operations) without decryption.

**Decryption**: Only addresses with explicit permissions can decrypt ciphertexts, done client-side.

## 📖 Documentation

- **[Contracts README](./contracts/README.md)** - Smart contract architecture, deployment, testing
- **[Frontend README](./frontend/README.md)** - React app setup, tech stack, development guide
- **[Zama fhevm Docs](https://docs.zama.ai/fhevm)** - Fully Homomorphic Encryption documentation
- **[ERC-7984 Standard](https://eips.ethereum.org/EIPS/eip-7984)** - Confidential token specification

## 🛠️ Development

### Run Local Tests

```bash
# Contracts
cd contracts && npm test

# Frontend (requires deployed contracts on Sepolia)
cd frontend && pnpm dev
```

### Deploy to Sepolia

```bash
cd contracts
npm run deploy:tokens    # Deploy mock ERC-7984 tokens
npm run deploy:factory   # Deploy vesting factory
```

Copy deployed addresses to `frontend/src/lib/consts.ts`.

### Verify Contracts

```bash
cd contracts
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

## 🧪 Testing on Sepolia

1. **Get Sepolia ETH**: [Sepolia Faucet](https://sepoliafaucet.com/)
2. **Get Demo Tokens**: Use the built-in faucet in the frontend
3. **Create Vesting**: Employer flow in the UI
4. **Deposit Tokens**: Encrypt and deposit allocation
5. **Claim Tokens**: Employee flow to release vested amounts

## 🤝 Contributing

Contributions are welcome! This project showcases:

- Advanced fhevm integration patterns
- Privacy-preserving DeFi primitives
- Modern React + Web3 architecture

## 🌟 Built With

- **[Zama fhevm](https://www.zama.ai/)** - Fully Homomorphic Encryption for Ethereum
- **[OpenZeppelin Confidential Contracts](https://github.com/openzeppelin/openzeppelin-confidential-contracts)** - ERC-7984 implementation
- **[Hardhat](https://hardhat.org/)** - Ethereum development environment
- **[React 19](https://react.dev/)** - Modern UI framework
- **[Wagmi](https://wagmi.sh/)** - React hooks for Ethereum
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
