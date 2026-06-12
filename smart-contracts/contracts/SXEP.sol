// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SXEP is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public treasury;

    struct Trade {
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bool settled;
    }

    Trade[] public trades;

    event TradeExecuted(uint256 indexed tradeId, address indexed trader, address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut);
    event TradeSettled(uint256 indexed tradeId, uint256 finalAmountOut, uint256 feeAmount);
    event TreasuryUpdated(address indexed newTreasury);

    constructor(address _treasury) Ownable(msg.sender) {
        require(_treasury != address(0), "SXEP: Invalid treasury");
        treasury = _treasury;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "SXEP: Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function executeTrade(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256) {
        require(amountIn > 0, "SXEP: Amount in must be > 0");
        require(tokenIn != address(0) && tokenOut != address(0), "SXEP: Invalid tokens");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        trades.push(Trade({
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            settled: false
        }));

        uint256 tradeId = trades.length - 1;
        emit TradeExecuted(tradeId, msg.sender, tokenIn, tokenOut, amountIn, minAmountOut);
        return tradeId;
    }

    // Settles the trade (simulating exchange match). Transfers output token minus 5% fee.
    function settleTrade(uint256 tradeId, uint256 finalAmountOut) external onlyOwner nonReentrant {
        require(tradeId < trades.length, "SXEP: Trade does not exist");
        Trade storage trade = trades[tradeId];
        require(!trade.settled, "SXEP: Already settled");
        require(finalAmountOut >= trade.minAmountOut, "SXEP: Slippage exceeded minAmountOut");

        trade.settled = true;

        uint256 fee = (finalAmountOut * 5) / 100;
        uint256 netAmount = finalAmountOut - fee;

        // Transfer fee to treasury
        IERC20(trade.tokenOut).safeTransfer(treasury, fee);
        
        // Transfer net amount to trader
        IERC20(trade.tokenOut).safeTransfer(trade.trader, netAmount);

        emit TradeSettled(tradeId, finalAmountOut, fee);
    }

    function getTradeCount() external view returns (uint256) {
        return trades.length;
    }
}
