// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISXUA.sol";

contract BridgeManager is Ownable {
    ISXUA public sxua;
    mapping(bytes32 => bool) public processedRequests;

    event WithdrawalFinalized(
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 sourceChain,
        uint256 nonce,
        bytes32 requestHash
    );

    constructor(address _sxua) Ownable(msg.sender) {
        require(_sxua != address(0), "BridgeManager: Invalid SXUA address");
        sxua = ISXUA(_sxua);
    }

    function finalizeWithdrawal(
        address token,
        uint256 amount,
        address recipient,
        uint256 sourceChain,
        uint256 nonce
    ) external onlyOwner {
        require(token != address(0), "BridgeManager: Invalid token");
        require(recipient != address(0), "BridgeManager: Invalid recipient");
        require(amount > 0, "BridgeManager: Amount must be > 0");

        bytes32 requestHash = keccak256(abi.encodePacked(token, amount, recipient, sourceChain, nonce));
        require(!processedRequests[requestHash], "BridgeManager: Request already processed");

        processedRequests[requestHash] = true;
        sxua.depositFor(recipient, token, amount);

        emit WithdrawalFinalized(recipient, token, amount, sourceChain, nonce, requestHash);
    }

    function setSXUA(address _sxua) external onlyOwner {
        require(_sxua != address(0), "BridgeManager: Invalid SXUA address");
        sxua = ISXUA(_sxua);
    }
}
