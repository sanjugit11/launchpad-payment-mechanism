// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISXUA {
    function payForLaunchpad(address user, address token, uint256 amount) external;
    function refundToUser(address user, address token, uint256 amount) external;
    function emergencyShutdownActive() external view returns (bool);
}
