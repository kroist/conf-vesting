// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (finance/VestingWallet.sol)
pragma solidity ^0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

contract VestingWallet is Context, Ownable {
    event ERC7984Released(address indexed token, euint64 amount);

    mapping(address token => euint64) private _erc7984Released;
    uint64 private immutable _start;
    uint64 private immutable _duration;

    /**
     * @dev Sets the beneficiary (owner), the start timestamp and the vesting duration (in seconds) of the vesting
     * wallet.
     */
    constructor(address beneficiary, uint64 startTimestamp, uint64 durationSeconds) payable Ownable(beneficiary) {
        _start = startTimestamp;
        _duration = durationSeconds;
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
     * @dev Amount of token already released
     */
    function released(address token) public view virtual returns (euint64) {
        return _erc7984Released[token];
    }

    /**
     * @dev Getter for the amount of releasable `token` tokens. `token` should be the address of an
     * {IERC7984} contract.
     */
    function releasable(address token) public virtual returns (euint64) {
        return FHE.sub(vestedAmount(token, uint64(block.timestamp)), released(token));
    }

    /**
     * @dev Release the tokens that have already vested.
     *
     * Emits a {ERC7984Released} event.
     */
    function release(address token) public virtual {
        euint64 amount = releasable(token);
        _erc7984Released[token] = FHE.add(_erc7984Released[token], amount);
        emit ERC7984Released(token, amount);
        IERC7984(token).confidentialTransfer(owner(), amount);
    }

    /**
     * @dev Calculates the amount of tokens that has already vested. Default implementation is a linear vesting curve.
     */
    function vestedAmount(address token, uint64 timestamp) public virtual returns (euint64) {
        euint64 currentTokenBalance = IERC7984(token).confidentialBalanceOf(address(this));
        euint64 totalAllocation = FHE.add(currentTokenBalance, released(token));
        return _vestingSchedule(totalAllocation, timestamp);
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
            return FHE.div(
                FHE.mul(totalAllocation, FHE.asEuint64(timestamp - uint64(start()))),
                duration()
            );
        }
    }
}
