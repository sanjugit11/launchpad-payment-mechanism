// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISXSE {
    // Mock of SX Secure Enclave requirement check
    function isRegistered(address user) external view returns (bool);
}