// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MarketMaker {
    using SafeERC20 for IERC20;

    mapping(address => uint256) public forfeitedBalances;
    event ForfeitedValueReceived(address indexed token, uint256 amount);

    function receiveForfeitedValue(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        forfeitedBalances[token] += amount;
        emit ForfeitedValueReceived(token, amount);
    }

    function getForfeitedBalance(address token) external view returns (uint256) {
        return forfeitedBalances[token];
    }

    receive() external payable {}
}