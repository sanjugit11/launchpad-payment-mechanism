// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SXEP is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public treasury;

    struct Trade {
        address user;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutExpected;
        bool settled;
    }

    mapping(uint256 => Trade) public trades;
    uint256 public tradeCount;

    constructor(address _treasury) Ownable(msg.sender) {
        treasury = _treasury;
    }

    function executeTrade(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutExpected) external nonReentrant returns (uint256) {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        trades[tradeCount] = Trade(msg.sender, tokenIn, tokenOut, amountIn, amountOutExpected, false);
        return tradeCount++;
    }

    function settleTrade(uint256 tradeId, uint256 actualAmountOut) external onlyOwner nonReentrant {
        Trade storage t = trades[tradeId];
        require(!t.settled, "SXEP: Already settled");
        t.settled = true;

        uint256 fee = (actualAmountOut * 5) / 100;
        uint256 userOut = actualAmountOut - fee;

        IERC20(t.tokenOut).safeTransfer(treasury, fee);
        IERC20(t.tokenOut).safeTransfer(t.user, userOut);
    }
}