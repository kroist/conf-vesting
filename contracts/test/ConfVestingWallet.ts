import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ConfVestingWallet, MockERC7984, ConfVestingWallet__factory, MockERC7984__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type Signers = {
  deployer: HardhatEthersSigner;
  owner: HardhatEthersSigner;
  beneficiary: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const beneficiary = signers[1];

  // Deploy mock ERC7984 token
  const tokenFactory = (await ethers.getContractFactory("MockERC7984")) as MockERC7984__factory;
  const token = (await tokenFactory.deploy("Confidential Token", "CTKN")) as MockERC7984;
  const tokenAddress = await token.getAddress();

  // Set vesting parameters
  const startTimestamp = (await time.latest()) + 100; // Start in 100 seconds
  const durationSeconds = 1000; // 1000 seconds duration

  // Deploy VestingWallet
  const vestingFactory = (await ethers.getContractFactory("ConfVestingWallet")) as ConfVestingWallet__factory;
  const vestingWallet = (await vestingFactory.deploy(
    owner.address,
    beneficiary.address,
    startTimestamp,
    durationSeconds,
  )) as ConfVestingWallet;
  const vestingWalletAddress = await vestingWallet.getAddress();

  return {
    token,
    tokenAddress,
    vestingWallet,
    vestingWalletAddress,
    startTimestamp,
    durationSeconds,
  };
}

describe("ConfVestingWallet", function () {
  let signers: Signers;
  let token: MockERC7984;
  let tokenAddress: string;
  let vestingWallet: ConfVestingWallet;
  let vestingWalletAddress: string;
  let startTimestamp: number;
  let durationSeconds: number;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      owner: ethSigners[0],
      beneficiary: ethSigners[1],
      alice: ethSigners[2],
      bob: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ token, tokenAddress, vestingWallet, vestingWalletAddress, startTimestamp, durationSeconds } =
      await deployFixture());
  });

  describe("Deployment", function () {
    it("should set the correct owner", async function () {
      expect(await vestingWallet.owner()).to.equal(signers.owner.address);
    });

    it("should set the correct beneficiary", async function () {
      expect(await vestingWallet.beneficiary()).to.equal(signers.beneficiary.address);
    });

    it("should set the correct start timestamp", async function () {
      expect(await vestingWallet.start()).to.equal(startTimestamp);
    });

    it("should set the correct duration", async function () {
      expect(await vestingWallet.duration()).to.equal(durationSeconds);
    });

    it("should calculate the correct end timestamp", async function () {
      expect(await vestingWallet.end()).to.equal(startTimestamp + durationSeconds);
    });

    it("should revert if beneficiary is zero address", async function () {
      const vestingFactory = (await ethers.getContractFactory("ConfVestingWallet")) as ConfVestingWallet__factory;
      await expect(
        vestingFactory.deploy(signers.owner.address, ethers.ZeroAddress, startTimestamp, durationSeconds),
      ).to.be.revertedWith("Beneficiary cannot be zero address");
    });
  });

  describe("Token Deposits", function () {
    it("should allow anyone to deposit tokens", async function () {
      // Mint tokens to alice
      const depositAmount = 1000;
      const encryptedAmount = await fhevm
        .createEncryptedInput(tokenAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await token
        .connect(signers.alice)
        .mint(signers.alice.address, encryptedAmount.handles[0], encryptedAmount.inputProof);

      // Alice approves vesting wallet as operator
      await token.connect(signers.alice).setOperator(vestingWalletAddress, Math.floor(Date.now() / 1000) + 3600);

      // Encrypt deposit amount
      const encryptedDeposit = await fhevm
        .createEncryptedInput(vestingWalletAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      // Deposit tokens
      const tx = await vestingWallet
        .connect(signers.alice)
        .depositTokens(tokenAddress, encryptedDeposit.handles[0], encryptedDeposit.inputProof);

      await expect(tx).to.emit(vestingWallet, "TokensDeposited");
    });

    it("should update total allocation after deposit", async function () {
      // Mint and deposit tokens
      const depositAmount = 2000;
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await token
        .connect(signers.alice)
        .mint(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);
      await token.connect(signers.alice).setOperator(vestingWalletAddress, Math.floor(Date.now() / 1000) + 3600);

      const encryptedDeposit = await fhevm
        .createEncryptedInput(vestingWalletAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await vestingWallet
        .connect(signers.alice)
        .depositTokens(tokenAddress, encryptedDeposit.handles[0], encryptedDeposit.inputProof);

      // Owner should be able to view total allocation
      const totalAllocation = await vestingWallet.connect(signers.owner).totalAllocation(tokenAddress);
      const decryptedTotal = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalAllocation,
        vestingWalletAddress,
        signers.owner,
      );

      expect(decryptedTotal).to.equal(depositAmount);
    });

    it("should allow multiple deposits", async function () {
      const depositAmount1 = 1000;
      const depositAmount2 = 1500;

      // First deposit from alice
      const encryptedMint1 = await fhevm
        .createEncryptedInput(tokenAddress, signers.alice.address)
        .add64(depositAmount1)
        .encrypt();

      await token
        .connect(signers.alice)
        .mint(signers.alice.address, encryptedMint1.handles[0], encryptedMint1.inputProof);
      await token.connect(signers.alice).setOperator(vestingWalletAddress, Math.floor(Date.now() / 1000) + 3600);

      const encryptedDeposit1 = await fhevm
        .createEncryptedInput(vestingWalletAddress, signers.alice.address)
        .add64(depositAmount1)
        .encrypt();

      await vestingWallet
        .connect(signers.alice)
        .depositTokens(tokenAddress, encryptedDeposit1.handles[0], encryptedDeposit1.inputProof);

      // Second deposit from bob
      const encryptedMint2 = await fhevm
        .createEncryptedInput(tokenAddress, signers.bob.address)
        .add64(depositAmount2)
        .encrypt();

      await token.connect(signers.bob).mint(signers.bob.address, encryptedMint2.handles[0], encryptedMint2.inputProof);
      await token.connect(signers.bob).setOperator(vestingWalletAddress, Math.floor(Date.now() / 1000) + 3600);

      const encryptedDeposit2 = await fhevm
        .createEncryptedInput(vestingWalletAddress, signers.bob.address)
        .add64(depositAmount2)
        .encrypt();

      await vestingWallet
        .connect(signers.bob)
        .depositTokens(tokenAddress, encryptedDeposit2.handles[0], encryptedDeposit2.inputProof);

      // Check total allocation
      const totalAllocation = await vestingWallet.connect(signers.beneficiary).totalAllocation(tokenAddress);
      const decryptedTotal = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalAllocation,
        vestingWalletAddress,
        signers.beneficiary,
      );

      expect(decryptedTotal).to.equal(depositAmount1 + depositAmount2);
    });
  });

  describe("Access Control", function () {
    it("should allow owner to view totalAllocation", async function () {
      // This should not revert
      await expect(vestingWallet.connect(signers.owner).totalAllocation(tokenAddress)).to.not.be.reverted;
    });

    it("should allow beneficiary to view totalAllocation", async function () {
      // This should not revert
      await expect(vestingWallet.connect(signers.beneficiary).totalAllocation(tokenAddress)).to.not.be.reverted;
    });

    it("should prevent unauthorized users from viewing totalAllocation", async function () {
      await expect(vestingWallet.connect(signers.alice).totalAllocation(tokenAddress)).to.be.revertedWith(
        "Not authorized",
      );
    });

    it("should allow owner to view released amount", async function () {
      // This should not revert
      await expect(vestingWallet.connect(signers.owner).released(tokenAddress)).to.not.be.reverted;
    });

    it("should allow beneficiary to view released amount", async function () {
      // This should not revert
      await expect(vestingWallet.connect(signers.beneficiary).released(tokenAddress)).to.not.be.reverted;
    });

    it("should prevent unauthorized users from viewing released amount", async function () {
      await expect(vestingWallet.connect(signers.bob).released(tokenAddress)).to.be.revertedWith("Not authorized");
    });
  });

  describe("Vesting Schedule and Release", function () {
    beforeEach(async function () {
      // Deposit tokens for vesting tests
      const depositAmount = 10000;
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await token
        .connect(signers.alice)
        .mint(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);
      await token.connect(signers.alice).setOperator(vestingWalletAddress, Math.floor(Date.now() / 1000) + 3600);

      const encryptedDeposit = await fhevm
        .createEncryptedInput(vestingWalletAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await vestingWallet
        .connect(signers.alice)
        .depositTokens(tokenAddress, encryptedDeposit.handles[0], encryptedDeposit.inputProof);
    });

    it("should release 0 tokens before vesting starts", async function () {
      // Current time is before startTimestamp
      const tx = await vestingWallet.release(tokenAddress);
      await tx.wait();

      const released = await vestingWallet.connect(signers.beneficiary).released(tokenAddress);
      const decryptedReleased = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        released,
        vestingWalletAddress,
        signers.beneficiary,
      );

      expect(decryptedReleased).to.equal(0);
    });

    it("should release partial tokens during vesting period", async function () {
      // Move time to halfway through vesting
      await time.increaseTo(startTimestamp + Math.floor(durationSeconds / 2));

      const tx = await vestingWallet.release(tokenAddress);
      await tx.wait();

      const released = await vestingWallet.connect(signers.beneficiary).released(tokenAddress);
      const decryptedReleased = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        released,
        vestingWalletAddress,
        signers.beneficiary,
      );

      // Should have released approximately 50% of tokens (allowing for some rounding)
      expect(decryptedReleased).to.be.greaterThan(4900);
      expect(decryptedReleased).to.be.lessThan(5100);
    });

    it("should release all tokens after vesting period ends", async function () {
      // Move time to after vesting ends
      await time.increaseTo(startTimestamp + durationSeconds + 100);

      const tx = await vestingWallet.release(tokenAddress);
      await tx.wait();

      const released = await vestingWallet.connect(signers.beneficiary).released(tokenAddress);
      const decryptedReleased = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        released,
        vestingWalletAddress,
        signers.beneficiary,
      );

      expect(decryptedReleased).to.equal(10000);
    });

    it("should transfer released tokens to beneficiary", async function () {
      // Move time to after vesting ends
      await time.increaseTo(startTimestamp + durationSeconds + 100);

      const tx = await vestingWallet.release(tokenAddress);
      await tx.wait();

      // Check beneficiary's balance
      const balance = await token.confidentialBalanceOf(signers.beneficiary.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        tokenAddress,
        signers.beneficiary,
      );

      expect(decryptedBalance).to.equal(10000);
    });

    it("should handle multiple releases correctly", async function () {
      // First release at 25% vesting
      await time.increaseTo(startTimestamp + Math.floor(durationSeconds / 4));
      await vestingWallet.release(tokenAddress);

      let released = await vestingWallet.connect(signers.beneficiary).released(tokenAddress);
      let decryptedReleased = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        released,
        vestingWalletAddress,
        signers.beneficiary,
      );

      const firstRelease = decryptedReleased;
      expect(firstRelease).to.be.greaterThan(2400);
      expect(firstRelease).to.be.lessThan(2600);

      // Second release at 75% vesting
      await time.increaseTo(startTimestamp + Math.floor((3 * durationSeconds) / 4));
      await vestingWallet.release(tokenAddress);

      released = await vestingWallet.connect(signers.beneficiary).released(tokenAddress);
      decryptedReleased = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        released,
        vestingWalletAddress,
        signers.beneficiary,
      );

      expect(decryptedReleased).to.be.greaterThan(7400);
      expect(decryptedReleased).to.be.lessThan(7600);
    });
  });

  describe("Events", function () {
    it("should emit TokensDeposited event on deposit", async function () {
      const depositAmount = 1000;
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await token
        .connect(signers.alice)
        .mint(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);
      await token.connect(signers.alice).setOperator(vestingWalletAddress, Math.floor(Date.now() / 1000) + 3600);

      const encryptedDeposit = await fhevm
        .createEncryptedInput(vestingWalletAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await expect(
        vestingWallet
          .connect(signers.alice)
          .depositTokens(tokenAddress, encryptedDeposit.handles[0], encryptedDeposit.inputProof),
      )
        .to.emit(vestingWallet, "TokensDeposited")
        .withArgs(tokenAddress, signers.alice.address, encryptedDeposit.handles[0]);
    });

    it("should emit ERC7984Released event on release", async function () {
      // Deposit tokens first
      const depositAmount = 5000;
      const encryptedMint = await fhevm
        .createEncryptedInput(tokenAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await token
        .connect(signers.alice)
        .mint(signers.alice.address, encryptedMint.handles[0], encryptedMint.inputProof);
      await token.connect(signers.alice).setOperator(vestingWalletAddress, Math.floor(Date.now() / 1000) + 3600);

      const encryptedDeposit = await fhevm
        .createEncryptedInput(vestingWalletAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await vestingWallet
        .connect(signers.alice)
        .depositTokens(tokenAddress, encryptedDeposit.handles[0], encryptedDeposit.inputProof);

      // Move time to after vesting period
      await time.increaseTo(startTimestamp + durationSeconds + 100);

      // Release should emit event
      await expect(vestingWallet.release(tokenAddress)).to.emit(vestingWallet, "ERC7984Released");
    });
  });
});
