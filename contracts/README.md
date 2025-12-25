# Confidential Vesting Contracts 🔐

Smart contracts for privacy-preserving token vesting built with [Zama's fhevm](https://docs.zama.ai/fhevm) (Fully
Homomorphic Encryption Virtual Machine). Based on OpenZeppelin's proven
[VestingWallet](https://docs.openzeppelin.com/contracts/5.x/api/finance#VestingWallet) design pattern, adapted for FHE
to enable confidential ERC-7984 token vesting where all amounts remain encrypted on-chain.

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    User (Employer/Employee)                       │
└─────────────┬────────────────────────────────────────────────────┘
              │
              │ 1. createVestingWallet()
              ↓
┌──────────────────────────────────────────────────────────────────┐
│               ConfVestingWalletFactory                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Deploys new ConfVestingWallet instances                  │ │
│  │ • Indexes wallets by owner (employer)                      │ │
│  │ • Indexes wallets by beneficiary (employee)                │ │
│  │ • Emits VestingWalletCreated events                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────┬────────────────────────────────────────────────────┘
              │
              │ 2. new ConfVestingWallet(...)
              ↓
┌──────────────────────────────────────────────────────────────────┐
│                    ConfVestingWallet                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Immutable State (Public):                                  │ │
│  │  • owner: Address of the grant creator                     │ │
│  │  • beneficiary: Address of the token recipient             │ │
│  │  • start: Vesting start timestamp                          │ │
│  │  • duration: Vesting duration in seconds                   │ │
│  │  • token: ERC-7984 token address                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Encrypted State (Private):                                 │ │
│  │  • _totalAllocation[token]: euint64                        │ │
│  │  • _erc7984Released[token]: euint64                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Operations:                                                     │
│  3. depositTokens(encryptedAmount, proof) → ERC7984Transfer     │
│  4. release(token) → Compute vested → ERC7984Transfer           │
└─────────────┬────────────────────────────────────────────────────┘
              │
              │ confidentialTransferFrom() / confidentialTransfer()
              ↓
┌──────────────────────────────────────────────────────────────────┐
│                 MockERC7984 (Confidential Token)                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ • Encrypted balances: mapping(address => euint64)          │ │
│  │ • FHE arithmetic operations                                │ │
│  │ • Permission-gated decryption                              │ │
│  │ • Faucet for demo tokens                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Core Contracts

#### 1. ConfVestingWallet

**Purpose**: Individual vesting contract based on OpenZeppelin's
[VestingWallet](https://docs.openzeppelin.com/contracts/5.x/api/finance#VestingWallet), adapted to hold encrypted token
allocations and enforce a linear vesting schedule using FHE.

**Key Features**:

- **Encrypted State Management**: All token amounts stored as `euint64` ciphertexts
- **Linear Vesting**: Default implementation with customizable start/duration
- **Permission System**: Only owner and beneficiary can decrypt amounts
- **ERC-7984 Integration**: Uses confidential transfers throughout

**State Variables**:

```solidity
// Encrypted state (private amounts)
mapping(address token => euint64) private _totalAllocation;
mapping(address token => euint64) private _erc7984Released;

// Public state (immutable)
address private immutable _beneficiary;
address private immutable _token;
uint64 private immutable _start;
uint64 private immutable _duration;
```

**Main Functions**:

| Function                                      | Caller | Description                                   |
| --------------------------------------------- | ------ | --------------------------------------------- |
| `depositTokens(externalEuint64, proof)`       | Anyone | Deposit encrypted tokens, updates allocation  |
| `release(token)`                              | Anyone | Release vested tokens to beneficiary          |
| `totalAllocation(token) → euint64`            | Anyone | View total allocation (decrypt if authorized) |
| `released(token) → euint64`                   | Anyone | View released amount (decrypt if authorized)  |
| `beneficiary() → address`                     | Public | Get beneficiary address                       |
| `start(), duration(), end() → uint256/uint64` | Public | Get vesting schedule parameters               |

**Vesting Schedule Implementation**:

```
Linear Vesting Formula:
─────────────────────────────────────────────────────────
│ Time              │ Vested Amount                     │
├───────────────────┼───────────────────────────────────┤
│ Before start      │ 0                                 │
│ During vesting    │ total × (elapsed / duration)      │
│ After end         │ total (100%)                      │
└───────────────────┴───────────────────────────────────┘

Where:
• total = current balance + already released
• elapsed = current timestamp - start
• All arithmetic performed on encrypted values (FHE)
```

**Deposit Flow**:

```
User encrypts amount client-side
        ↓
FHE.fromExternal(encryptedAmount, proof)
        ↓
IERC7984.confidentialTransferFrom(sender → this)
        ↓
_totalAllocation = balance + released
        ↓
FHE.allow(amount, owner)
FHE.allow(amount, beneficiary)
        ↓
emit TokensDeposited(token, depositor, encryptedAmount)
```

**Release Flow**:

```
Anyone calls release(token)
        ↓
Calculate: releasable = vestedAmount - alreadyReleased
        ↓
Update: _erc7984Released += releasable
        ↓
Grant permissions: FHE.allow(...)
        ↓
emit ERC7984Released(token, encryptedAmount)
        ↓
IERC7984.confidentialTransfer(beneficiary, releasable)
```

#### 2. ConfVestingWalletFactory

**Purpose**: Factory pattern for deploying and indexing vesting wallets.

**Key Features**:

- **Deterministic Deployment**: Creates new `ConfVestingWallet` instances
- **Dual Indexing**: Tracks wallets by both owner and beneficiary
- **Event Emission**: Enables off-chain indexing and UI integration

**State Variables**:

```solidity
// Owner (employer) tracking
mapping(address => uint256) public ownerWalletsCount;
mapping(address => mapping(uint256 => address)) public ownerWalletAddressByIndex;

// Beneficiary (employee) tracking
mapping(address => uint256) public beneficiaryWalletsCount;
mapping(address => mapping(uint256 => address)) public beneficiaryWalletAddressByIndex;
```

**Main Functions**:

| Function                                                   | Returns     | Description                      |
| ---------------------------------------------------------- | ----------- | -------------------------------- |
| `createVestingWallet(token, beneficiary, start, duration)` | `address`   | Deploy new vesting wallet        |
| `getOwnerWallets(owner)`                                   | `address[]` | Get all wallets created by owner |
| `getBeneficiaryWallets(beneficiary)`                       | `address[]` | Get all wallets for beneficiary  |

**Creation Flow**:

```
User calls createVestingWallet(...)
        ↓
Deploy: new ConfVestingWallet(
    token,
    msg.sender,      // owner
    beneficiary,
    startTimestamp,
    durationSeconds
)
        ↓
Index in ownerWalletAddressByIndex[msg.sender][n]
        ↓
Index in beneficiaryWalletAddressByIndex[beneficiary][m]
        ↓
emit VestingWalletCreated(...)
        ↓
return vestingWallet address
```

#### 3. MockERC7984

**Purpose**: Demo implementation of the ERC-7984 confidential token standard for testing.

**Key Features**:

- **Encrypted Balances**: All balances stored as `euint64`
- **Faucet Function**: Mint demo tokens for testing
- **FHE Operations**: Add/subtract encrypted values
- **ERC-7984 Compliant**: Implements confidential transfers

### Privacy Model

#### What's Public (On-Chain)

| Data                  | Visibility | Reason                       |
| --------------------- | ---------- | ---------------------------- |
| Contract addresses    | ✅ Public  | Required for interactions    |
| Owner address         | ✅ Public  | Governance/admin control     |
| Beneficiary address   | ✅ Public  | Recipient identity           |
| Vesting start         | ✅ Public  | Schedule transparency        |
| Vesting duration      | ✅ Public  | Schedule transparency        |
| Token address         | ✅ Public  | Asset identification         |
| Transaction existence | ✅ Public  | Blockchain inherent property |

#### What's Encrypted (Private)

| Data                      | Type      | Decryptable By     |
| ------------------------- | --------- | ------------------ |
| Token amounts (deposits)  | `euint64` | Owner, Beneficiary |
| Total allocation          | `euint64` | Owner, Beneficiary |
| Released amounts          | `euint64` | Owner, Beneficiary |
| Vested amounts (computed) | `euint64` | Owner, Beneficiary |
| Transfer amounts          | `euint64` | Sender, Recipient  |
| Token balances            | `euint64` | Token holder       |

#### FHE Permission System

Zama's fhevm uses a capability-based permission system:

```solidity
// Grant permanent permission
FHE.allow(encryptedValue, authorizedAddress);

// Grant one-time permission (for current transaction)
FHE.allowTransient(encryptedValue, contractAddress);

// Grant permission to contract itself
FHE.allowThis(encryptedValue);
```

**Permission Flow in Vesting**:

```
depositTokens():
    FHE.allowTransient(amount, tokenAddress)    // For transfer
    FHE.allowThis(amount)                        // For storage
    FHE.allow(amount, owner)                     // Decrypt rights
    FHE.allow(amount, beneficiary)               // Decrypt rights

release():
    FHE.allowTransient(amount, tokenAddress)    // For transfer
    FHE.allow(_erc7984Released[token], owner)   // Decrypt rights
    FHE.allow(_erc7984Released[token], beneficiary) // Decrypt rights
```

### FHE Operations

#### Encrypted Arithmetic

All vesting calculations happen on encrypted values:

```solidity
// Addition (encrypted + encrypted)
euint64 total = FHE.add(balance, released);

// Subtraction (encrypted - encrypted)
euint64 releasable = FHE.sub(vested, released);

// Multiplication (encrypted × plaintext → encrypted)
// Used for: vestedAmount = total × elapsedTime / duration
euint128 numerator = FHE.mul(
    FHE.asEuint128(totalAllocation),
    FHE.asEuint128(elapsedTime)
);
euint128 result = FHE.div(numerator, duration);
euint64 vestedAmount = FHE.asEuint64(result);
```

#### Type Widening

For multiplication/division to prevent overflow:

```
euint64 (64-bit)
    ↓ FHE.asEuint128()
euint128 (128-bit)
    ↓ Multiply / Divide
euint128 (result)
    ↓ FHE.asEuint64()
euint64 (64-bit)
```

### Security Considerations

#### Access Control

- **Ownable Pattern**: Owner can manage vesting wallet
- **Immutable Beneficiary**: Cannot be changed after deployment
- **Anyone Can Deposit**: But amounts go to immutable beneficiary
- **Anyone Can Release**: But vested tokens go to immutable beneficiary

#### Encryption Security

- **Client-Side Encryption**: Values encrypted before blockchain submission
- **No Plaintext Leakage**: Contracts never access plaintext amounts
- **Permission-Gated Decryption**: Only authorized addresses can decrypt
- **FHE Coprocessor**: Computation happens in Zama's encrypted environment

#### Timing Attacks

- **Public Timestamps**: Vesting schedule is public by design
- **Encrypted Amounts**: Observers can't correlate timing with amounts
- **No Balance Leakage**: Transaction existence doesn't reveal amounts

## 📁 Project Structure

```
contracts/
├── contracts/
│   ├── ConfVestingWallet.sol         # Main vesting logic
│   ├── ConfVestingWalletFactory.sol  # Deployment factory
│   └── MockERC7984.sol                # Demo confidential token
├── deploy/
│   ├── deploy-tokens.ts               # Deploy ERC-7984 tokens
│   └── deploy-factory.ts              # Deploy factory
├── tasks/
│   └── accounts.ts                    # Hardhat task utilities
├── test/
│   └── ConfVestingWallet.ts          # Comprehensive test suite
├── hardhat.config.ts                  # Hardhat configuration
└── package.json                       # Dependencies & scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager
- **Wallet**: Private key or mnemonic for deployment

### Installation

```bash
cd contracts
npm install
```

### Environment Configuration

```bash
# Set your mnemonic (12/24 word seed phrase)
npx hardhat vars set MNEMONIC

# Set RPC URL for Sepolia
npx hardhat vars set RPC_URL

# Optional: Etherscan API key for verification
npx hardhat vars set ETHERSCAN_API_KEY
```

**Example RPC URLs**:

- Alchemy: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
- Infura: `https://sepolia.infura.io/v3/YOUR_API_KEY`
- Public: `https://rpc.sepolia.org`

### Compile Contracts

```bash
npm run compile
```

This will:

1. Compile Solidity contracts
2. Generate TypeScript types (TypeChain)
3. Create artifacts in `./artifacts`

### Run Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm test -- --grep "Deployment"
npm test -- --grep "Token Deposits"
npm test -- --grep "Vesting Schedule"
```

**Test Coverage**:

- ✅ Contract deployment and initialization
- ✅ Token deposits with encryption
- ✅ Access control (owner/beneficiary permissions)
- ✅ Vesting schedule calculations
- ✅ Token release mechanisms
- ✅ Event emissions
- ✅ Edge cases and error handling

### Deploy to Sepolia

**Step 1: Deploy Mock Tokens**

```bash
npm run deploy:tokens
```

This deploys mock ERC-7984 confidential tokens for testing.

**Expected Output**:

```
MockERC7984 Token A deployed to: 0x1234...
MockERC7984 Token B deployed to: 0x5678...
```

**Step 2: Deploy Factory**

```bash
npm run deploy:factory
```

This deploys the `ConfVestingWalletFactory` contract.

**Expected Output**:

```
ConfVestingWalletFactory deployed to: 0xABCD...
```

**Step 3: Copy Addresses**

Update `frontend/src/lib/consts.ts` with deployed addresses:

```typescript
export const FACTORY_ADDRESS = "0xABCD...";
export const TOKEN_ADDRESSES = {
  TokenA: "0x1234...",
  TokenB: "0x5678...",
};
```

### Verify Contracts

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

# With constructor arguments
npx hardhat verify --network sepolia <ADDRESS> "arg1" "arg2"
```

## 📜 Available Scripts

| Script                   | Description                         |
| ------------------------ | ----------------------------------- |
| `npm run compile`        | Compile contracts + generate types  |
| `npm run test`           | Run full test suite                 |
| `npm test -- --grep`     | Run specific test categories        |
| `npm run clean`          | Clean artifacts and cache           |
| `npm run lint`           | Run Solidity and TypeScript linters |
| `npm run lint:sol`       | Lint Solidity files                 |
| `npm run lint:ts`        | Lint TypeScript files               |
| `npm run prettier:check` | Check code formatting               |
| `npm run prettier:write` | Auto-format code                    |
| `npm run typechain`      | Generate TypeScript types           |
| `npm run deploy:tokens`  | Deploy mock ERC-7984 tokens         |
| `npm run deploy:factory` | Deploy vesting factory              |
| `npm run verify:sepolia` | Verify contracts on Sepolia         |

## 🧪 Testing on Sepolia

### 1. Get Test ETH

Obtain Sepolia ETH from faucets:

- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Chainlink Faucet](https://faucets.chain.link/)

### 2. Run Sepolia Tests

```bash
npm run test:sepolia
```

This runs the test suite against the live Sepolia network.

### 3. Interact via Hardhat Console

```bash
npx hardhat console --network sepolia
```

```javascript
// Load contract
const Factory = await ethers.getContractFactory("ConfVestingWalletFactory");
const factory = Factory.attach("0xYourFactoryAddress");

// Create vesting wallet
const tx = await factory.createVestingWallet(
  "0xTokenAddress",
  "0xBeneficiaryAddress",
  Math.floor(Date.now() / 1000), // Start now
  86400 * 365, // 1 year
);
await tx.wait();
```

## 📖 API Reference

### ConfVestingWallet

```solidity
constructor(
    address token,
    address initialOwner,
    address beneficiaryAddress,
    uint64 startTimestamp,
    uint64 durationSeconds
)

function depositTokens(
    externalEuint64 encryptedAmount,
    bytes calldata inputProof
) external

function release(address token) external

function totalAllocation(address token) external view returns (euint64)
function released(address token) external view returns (euint64)
function beneficiary() external view returns (address)
function start() external view returns (uint256)
function duration() external view returns (uint64)
function end() external view returns (uint256)
```

### ConfVestingWalletFactory

```solidity
function createVestingWallet(
    address token,
    address beneficiary,
    uint64 startTimestamp,
    uint64 durationSeconds
) external returns (address vestingWallet)

function getOwnerWallets(address owner)
    external view returns (address[] memory)

function getBeneficiaryWallets(address beneficiary)
    external view returns (address[] memory)
```

## 📚 Documentation

- **[FHEVM Documentation](https://docs.zama.ai/fhevm)** - Core FHE concepts
- **[OpenZeppelin VestingWallet](https://docs.openzeppelin.com/contracts/5.x/api/finance#VestingWallet)** - Original
  vesting pattern
- **[ERC-7984 Standard](https://eips.ethereum.org/EIPS/eip-7984)** - Confidential token spec
- **[OpenZeppelin Confidential Contracts](https://github.com/openzeppelin/openzeppelin-confidential-contracts)** -
  Reference implementation
