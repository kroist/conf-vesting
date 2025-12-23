// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract MockERC7984 is ERC7984, ZamaEthereumConfig {
    constructor(string memory name_, string memory symbol_) ERC7984(name_, symbol_, "") {}

    function mint(address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        _mint(to, amount);
    }
}
