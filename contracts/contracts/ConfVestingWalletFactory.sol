// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ConfVestingWallet.sol";

/**
 * @title ConfVestingWalletFactory
 * @dev Factory contract for creating and tracking ConfVestingWallet instances.
 * Maintains indices of created wallets by both owner (creator) and beneficiary.
 */
contract ConfVestingWalletFactory {
    /**
     * @dev Emitted when a new vesting wallet is created.
     * @param owner The owner (creator) of the vesting wallet
     * @param beneficiary The beneficiary who will receive vested tokens
     * @param vestingWallet The address of the newly created vesting wallet
     * @param startTimestamp The start time of the vesting period
     * @param durationSeconds The duration of the vesting period in seconds
     */
    event VestingWalletCreated(
        address indexed owner,
        address indexed beneficiary,
        address indexed vestingWallet,
        uint64 startTimestamp,
        uint64 durationSeconds
    );

    // Owner (creator) tracking
    mapping(address => uint256) public ownerWalletsCount;
    mapping(address => mapping(uint256 => address)) public ownerWalletAddressByIndex;

    // Beneficiary tracking
    mapping(address => uint256) public beneficiaryWalletsCount;
    mapping(address => mapping(uint256 => address)) public beneficiaryWalletAddressByIndex;

    /**
     * @dev Creates a new ConfVestingWallet contract.
     * The caller (msg.sender) becomes the owner of the created vesting wallet.
     * @param beneficiary The address that will receive vested tokens
     * @param startTimestamp The Unix timestamp when vesting starts
     * @param durationSeconds The duration of the vesting period in seconds
     * @return vestingWallet The address of the newly created vesting wallet
     */
    function createVestingWallet(
        address token,
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) external returns (address vestingWallet) {
        // Deploy new vesting wallet with msg.sender as owner
        ConfVestingWallet wallet = new ConfVestingWallet(
            token,
            msg.sender,
            beneficiary,
            startTimestamp,
            durationSeconds
        );

        vestingWallet = address(wallet);

        // Store in owner mapping
        uint256 ownerIndex = ownerWalletsCount[msg.sender];
        ownerWalletAddressByIndex[msg.sender][ownerIndex] = vestingWallet;
        ownerWalletsCount[msg.sender]++;

        // Store in beneficiary mapping
        uint256 beneficiaryIndex = beneficiaryWalletsCount[beneficiary];
        beneficiaryWalletAddressByIndex[beneficiary][beneficiaryIndex] = vestingWallet;
        beneficiaryWalletsCount[beneficiary]++;

        // Emit event
        emit VestingWalletCreated(msg.sender, beneficiary, vestingWallet, startTimestamp, durationSeconds);

        return vestingWallet;
    }

    /**
     * @dev Returns an array of all vesting wallet addresses created by a specific owner.
     * @param owner The address of the owner (creator)
     * @return wallets Array of vesting wallet addresses
     */
    function getOwnerWallets(address owner) external view returns (address[] memory wallets) {
        uint256 count = ownerWalletsCount[owner];
        wallets = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            wallets[i] = ownerWalletAddressByIndex[owner][i];
        }

        return wallets;
    }

    /**
     * @dev Returns an array of all vesting wallet addresses for a specific beneficiary.
     * @param beneficiary The address of the beneficiary
     * @return wallets Array of vesting wallet addresses
     */
    function getBeneficiaryWallets(address beneficiary) external view returns (address[] memory wallets) {
        uint256 count = beneficiaryWalletsCount[beneficiary];
        wallets = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            wallets[i] = beneficiaryWalletAddressByIndex[beneficiary][i];
        }

        return wallets;
    }
}
