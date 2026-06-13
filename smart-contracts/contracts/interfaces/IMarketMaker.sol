// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMarketMaker {
    function receiveForfeitedValue(address token, uint256 amount) external;
    function getForfeitedBalance(address token) external view returns (uint256);
}