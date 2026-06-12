// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SXCP is ERC20, Ownable {
    mapping(address => bool) public isMinter;

    event MinterUpdated(address indexed minter, bool isMinter);

    modifier onlyMinter() {
        require(isMinter[msg.sender] || msg.sender == owner(), "SXCP: Caller is not a minter");
        _;
    }

    constructor() ERC20("SX Convertible Protocol Token", "SXCP") Ownable(msg.sender) {}

    function setMinter(address minter, bool _isMinter) external onlyOwner {
        isMinter[minter] = _isMinter;
        emit MinterUpdated(minter, _isMinter);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }
}
