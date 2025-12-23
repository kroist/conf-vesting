// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (finance/VestingWallet.sol)
pragma solidity ^0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

contract ConfVestingWallet is Context, Ownable, ZamaEthereumConfig {
    event ERC7984Released(address indexed token, euint64 amount);
    event TokensDeposited(address indexed token, address indexed depositor, euint64 amount);

    mapping(address token => euint64) private _erc7984Released;
    mapping(address token => euint64) private _totalAllocation;
    address private immutable _beneficiary;
    uint64 private immutable _start;
    uint64 private immutable _duration;

    /**
     * @dev Sets the owner (contract creator), beneficiary (token receiver), the start timestamp
     * and the vesting duration (in seconds) of the vesting wallet.
     */
    constructor(
        address initialOwner,
        address beneficiaryAddress,
        uint64 startTimestamp,
        uint64 durationSeconds
    ) payable Ownable(initialOwner) {
        require(beneficiaryAddress != address(0), "Beneficiary cannot be zero address");
        _beneficiary = beneficiaryAddress;
        _start = startTimestamp;
        _duration = durationSeconds;
    }

    /**
     * @dev Modifier to restrict access to owner and beneficiary only.
     */
    modifier onlyAuthorized() {
        require(msg.sender == owner() || msg.sender == _beneficiary, "Not authorized");
        _;
    }

    /**
     * @dev Getter for the beneficiary address.
     */
    function beneficiary() public view virtual returns (address) {
        return _beneficiary;
    }

    /**
     * @dev Getter for the start timestamp.
     */
    function start() public view virtual returns (uint256) {
        return _start;
    }

    /**
     * @dev Getter for the vesting duration.
     */
    function duration() public view virtual returns (uint64) {
        return _duration;
    }

    /**
     * @dev Getter for the end timestamp.
     */
    function end() public view virtual returns (uint256) {
        return start() + duration();
    }

    /**
     * @dev Total allocation of tokens for vesting. Can only be viewed by owner and beneficiary.
     */
    function totalAllocation(address token) public view virtual onlyAuthorized returns (euint64) {
        return _totalAllocation[token];
    }

    /**
     * @dev Amount of token already released. Can only be viewed by owner and beneficiary.
     */
    function released(address token) public view virtual onlyAuthorized returns (euint64) {
        return _erc7984Released[token];
    }

    /**
     * @dev Deposit tokens into the vesting wallet. Can be called by anyone.
     * Updates the total allocation and transfers tokens from the caller to this contract.
     * Emits a {TokensDeposited} event.
     */
    function depositTokens(address token, externalEuint64 encryptedAmount, bytes calldata inputProof) public virtual {
        // Validate and convert encrypted input
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer tokens from sender to this contract
        FHE.allowTransient(amount, token);
        IERC7984(token).confidentialTransferFrom(msg.sender, address(this), amount);

        // Update total allocation
        _totalAllocation[token] = FHE.add(
            IERC7984(token).confidentialBalanceOf(address(this)),
            _erc7984Released[token]
        );

        // Allow owner and beneficiary to view the encrypted values
        FHE.allowThis(amount);
        FHE.allow(amount, owner());
        FHE.allow(amount, _beneficiary);
        FHE.allowThis(_totalAllocation[token]);
        FHE.allow(_totalAllocation[token], owner());
        FHE.allow(_totalAllocation[token], _beneficiary);

        emit TokensDeposited(token, msg.sender, amount);
    }

    /**
     * @dev Release the tokens that have already vested.
     * Transfers vested tokens to the beneficiary.
     * Emits a {ERC7984Released} event.
     */
    function release(address token) public virtual {
        euint64 amount = _releasable(token);
        _erc7984Released[token] = FHE.add(_erc7984Released[token], amount);

        // Allow owner and beneficiary to view the updated released amount
        FHE.allowThis(_erc7984Released[token]);
        FHE.allow(_erc7984Released[token], owner());
        FHE.allow(_erc7984Released[token], _beneficiary);
        FHE.allowThis(amount);
        FHE.allow(amount, owner());
        FHE.allow(amount, _beneficiary);

        emit ERC7984Released(token, amount);

        FHE.allowTransient(amount, token);
        IERC7984(token).confidentialTransfer(_beneficiary, amount);
    }

    /**
     * @dev Internal function to calculate the amount of releasable tokens.
     */
    function _releasable(address token) internal virtual returns (euint64) {
        return FHE.sub(_vestedAmount(token, uint64(block.timestamp)), _erc7984Released[token]);
    }

    /**
     * @dev Internal function to calculate the amount of tokens that has already vested.
     * Default implementation is a linear vesting curve.
     */
    function _vestedAmount(address token, uint64 timestamp) internal virtual returns (euint64) {
        euint64 currentTotalAllocation = FHE.add(
            IERC7984(token).confidentialBalanceOf(address(this)),
            _erc7984Released[token]
        );
        return _vestingSchedule(currentTotalAllocation, timestamp);
    }

    /**
     * @dev Virtual implementation of the vesting formula. This returns the amount vested, as a function of time, for
     * an asset given its total historical allocation.
     */
    function _vestingSchedule(euint64 totalAllocation, uint64 timestamp) internal virtual returns (euint64) {
        if (timestamp < start()) {
            return FHE.asEuint64(0);
        } else if (timestamp >= end()) {
            return totalAllocation;
        } else {
            return
                FHE.asEuint64(
                    FHE.div(
                        FHE.mul(FHE.asEuint128(totalAllocation), FHE.asEuint128(timestamp - uint64(start()))),
                        uint128(duration())
                    )
                );
        }
    }
}
