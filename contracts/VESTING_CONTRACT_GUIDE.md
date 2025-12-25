# Confidential Vesting Wallet - Implementation Guide

## Overview

The `ConfVestingWallet` contract has been refactored to support **view functions** for key data while maintaining FHE
confidentiality. This enables clients to fetch encrypted data without on-chain computation.

## Key Changes

### 1. Separation of Owner and Beneficiary

- **Owner**: The contract creator who manages the vesting wallet
- **Beneficiary**: The receiver of the vested tokens

```solidity
constructor(
    address initialOwner,      // Contract creator
    address beneficiaryAddress, // Token receiver
    uint64 startTimestamp,
    uint64 durationSeconds
)
```

### 2. Stored Total Allocation

Instead of calculating `totalAllocation` dynamically (which prevented view functions), it's now stored:

```solidity
mapping(address token => euint64) private _totalAllocation;
```

### 3. New View Functions

Both owner and beneficiary can access:

```solidity
// Returns encrypted total allocation
function totalAllocation(address token) public view returns (euint64)

// Returns encrypted released amount
function released(address token) public view returns (euint64)
```

### 4. New Deposit Function

```solidity
function depositTokens(
    address token,
    externalEuint64 encryptedAmount,
    bytes calldata inputProof
) public
```

**Features:**

- Can be called by anyone
- Accepts encrypted input with ZKPoK proof
- Transfers tokens using `confidentialTransferFrom`
- Updates `_totalAllocation`
- Sets FHE permissions for owner and beneficiary
- Emits `TokensDeposited` event with depositor address

## Client-Side Calculation Strategy

Since FHE operations can't be in view functions, clients calculate vested amounts off-chain:

### Step 1: Fetch On-Chain Data

```typescript
// Fetch encrypted values (owner or beneficiary only)
const totalAllocationEncrypted = await vestingWallet.totalAllocation(tokenAddress);
const releasedEncrypted = await vestingWallet.released(tokenAddress);

// Fetch public values (anyone can access)
const start = await vestingWallet.start();
const duration = await vestingWallet.duration();
const end = await vestingWallet.end();
```

### Step 2: Decrypt Values

```typescript
import { fhevm } from "hardhat";

// Decrypt the encrypted values using user's private key
const totalAllocation = await fhevm.decrypt64(totalAllocationEncrypted);
const released = await fhevm.decrypt64(releasedEncrypted);
```

### Step 3: Calculate Vested Amount

```typescript
const currentTimestamp = Math.floor(Date.now() / 1000);

function calculateVested(totalAllocation, currentTimestamp, start, duration) {
  if (currentTimestamp < start) {
    return 0;
  } else if (currentTimestamp >= start + duration) {
    return totalAllocation;
  } else {
    // Linear vesting
    const elapsed = currentTimestamp - start;
    return (totalAllocation * elapsed) / duration;
  }
}

const vested = calculateVested(totalAllocation, currentTimestamp, start, duration);
const releasable = vested - released;
```

## Usage Examples

### Example 1: Deploy Contract

```typescript
import { ethers } from "hardhat";

const VestingWallet = await ethers.getContractFactory("VestingWallet");

const owner = "0x123..."; // Contract creator
const beneficiary = "0x456..."; // Token receiver
const startTimestamp = Math.floor(Date.now() / 1000); // Now
const durationSeconds = 365 * 24 * 60 * 60; // 1 year

const vestingWallet = await VestingWallet.deploy(owner, beneficiary, startTimestamp, durationSeconds);

await vestingWallet.waitForDeployment();
```

### Example 2: Deposit Tokens

```typescript
import { fhevm } from "hardhat";

// Create encrypted input
const depositAmount = 1000000; // Amount to deposit
const input = fhevm.createEncryptedInput(vestingWallet.address, depositor.address);
input.add64(depositAmount);
const encryptedInput = await input.encrypt();

// Approve token transfer first
await confidentialToken.connect(depositor).approve(vestingWallet.address /* amount */);

// Deposit tokens
const tx = await vestingWallet
  .connect(depositor)
  .depositTokens(confidentialToken.address, encryptedInput.handles[0], encryptedInput.inputProof);

await tx.wait();
```

### Example 3: View Total Allocation (Owner/Beneficiary)

```typescript
// Only owner or beneficiary can call this
const totalAllocationEncrypted = await vestingWallet.connect(beneficiary).totalAllocation(tokenAddress);

// Decrypt the value
const totalAllocation = await fhevm.decrypt64(totalAllocationEncrypted);
console.log("Total allocation:", totalAllocation);
```

### Example 4: Release Vested Tokens

```typescript
// Anyone can call release, but tokens go to beneficiary
const tx = await vestingWallet.release(tokenAddress);
await tx.wait();

// Check released amount
const releasedEncrypted = await vestingWallet.connect(beneficiary).released(tokenAddress);
const released = await fhevm.decrypt64(releasedEncrypted);
console.log("Released:", released);
```

### Example 5: Complete Client Dashboard

```typescript
async function getVestingDashboard(vestingWallet, tokenAddress, userAddress) {
  // Fetch all data
  const [totalAllocationEnc, releasedEnc, start, duration, beneficiary] = await Promise.all([
    vestingWallet.totalAllocation(tokenAddress),
    vestingWallet.released(tokenAddress),
    vestingWallet.start(),
    vestingWallet.duration(),
    vestingWallet.beneficiary(),
  ]);

  // Decrypt
  const totalAllocation = await fhevm.decrypt64(totalAllocationEnc);
  const released = await fhevm.decrypt64(releasedEnc);

  // Calculate
  const currentTime = Math.floor(Date.now() / 1000);
  const end = Number(start) + Number(duration);

  let vested;
  if (currentTime < start) {
    vested = 0;
  } else if (currentTime >= end) {
    vested = totalAllocation;
  } else {
    const elapsed = currentTime - Number(start);
    vested = (totalAllocation * elapsed) / Number(duration);
  }

  const releasable = vested - released;

  return {
    totalAllocation,
    vested,
    released,
    releasable,
    start: Number(start),
    duration: Number(duration),
    end,
    beneficiary,
    percentVested: (vested / totalAllocation) * 100,
  };
}
```

## Events

### TokensDeposited

```solidity
event TokensDeposited(address indexed token, address indexed depositor, euint64 amount);
```

Emitted when tokens are deposited into the vesting wallet.

### ERC7984Released

```solidity
event ERC7984Released(address indexed token, euint64 amount);
```

Emitted when vested tokens are released to the beneficiary.

## Access Control

- **Public functions**: `start()`, `duration()`, `end()`, `beneficiary()`, `depositTokens()`, `release()`
- **Restricted to owner & beneficiary**: `totalAllocation()`, `released()`

## Security Considerations

1. **FHE Permissions**: The contract sets transient permissions using `FHE.allowTransient()` for owner and beneficiary
   to view encrypted data
2. **Zero-Knowledge Proofs**: All encrypted inputs are validated with ZKPoKs
3. **Access Control**: Sensitive view functions are protected by `onlyAuthorized` modifier
4. **Immutable Beneficiary**: The beneficiary address is set at deployment and cannot be changed
5. **Open Deposits**: Anyone can deposit tokens, but total allocation tracking remains accurate

## Migration Notes

If upgrading from the previous version:

1. **Constructor change**: Now requires separate `initialOwner` and `beneficiaryAddress` parameters
2. **Removed public functions**: `vestedAmount()` and `releasable()` are now internal (calculations done client-side)
3. **New deposit flow**: Must use `depositTokens()` instead of direct transfers
4. **Access control**: View functions now require caller to be owner or beneficiary

## Testing Recommendations

1. Test deposit from multiple addresses
2. Verify view functions return correct encrypted values
3. Test access control on restricted functions
4. Verify vesting schedule calculations client-side
5. Test release at different time points
6. Verify FHE permissions are set correctly
