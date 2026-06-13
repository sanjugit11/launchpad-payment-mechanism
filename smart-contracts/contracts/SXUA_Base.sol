// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SXUA.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SXUA_Base is SXUA {
    using SafeERC20 for IERC20;

    uint256 public requestNonce;

    event WithdrawalRequested(
        address indexed user,
        address indexed recipient,
        address indexed token,
        uint256 amount,
        uint256 nonce,
        uint256 destinationChain
    );

    function requestCrossChainWithdrawal(
        address token,
        uint256 amount,
        uint256 destinationChain,
        address recipient
    ) external whenNotPaused nonReentrant {
        require(token != address(0), "SXUA_Base: Invalid token");
        require(recipient != address(0), "SXUA_Base: Invalid recipient");
        require(amount > 0, "SXUA_Base: Amount must be > 0");
        require(supportedTokens[token], "SXUA_Base: Token not supported");
        require(uncommittedBalances[msg.sender][token] >= amount, "SXUA_Base: Insufficient uncommitted balance");

        accrueDailyYield(msg.sender, token);
        updatePool(token);

        uncommittedBalances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(treasury, amount);

        requestNonce += 1;
        emit WithdrawalRequested(msg.sender, recipient, token, amount, requestNonce, destinationChain);
    }
}
