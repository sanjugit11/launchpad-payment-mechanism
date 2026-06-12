// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SXCP.sol";

contract SXP is ERC20, Ownable {
    address public treasury;
    SXCP public sxcpToken;

    mapping(address => bool) public isMinter;

    event MinterUpdated(address indexed minter, bool isMinter);
    event TreasuryUpdated(address indexed newTreasury);
    event SXCPTokenUpdated(address indexed newSXCP);
    event ConvertedToSXCP(address indexed user, uint256 sxpAmount, uint256 sxcpAmount, uint256 feeAmount);

    modifier onlyMinter() {
        require(isMinter[msg.sender], "SXP: Caller is not a minter");
        _;
    }

    constructor(address _treasury) ERC20("SX Protocol Token", "SXP") Ownable(msg.sender) {
        require(_treasury != address(0), "SXP: Invalid treasury address");
        treasury = _treasury;
    }

    function setMinter(address minter, bool _isMinter) external onlyOwner {
        isMinter[minter] = _isMinter;
        emit MinterUpdated(minter, _isMinter);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "SXP: Invalid treasury address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setSXCPToken(address _sxcpToken) external onlyOwner {
        require(_sxcpToken != address(0), "SXP: Invalid SXCP address");
        sxcpToken = SXCP(_sxcpToken);
        emit SXCPTokenUpdated(_sxcpToken);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    function convertToSXCP(uint256 amount) external {
        require(address(sxcpToken) != address(0), "SXP: SXCP token not set");
        require(balanceOf(msg.sender) >= amount, "SXP: Insufficient SXP balance");

        uint256 fee = (amount * 12) / 100;
        uint256 netAmount = amount - fee;

        // Transfer fee to treasury
        _transfer(msg.sender, treasury, fee);
        
        // Burn the remaining SXP from the sender
        _burn(msg.sender, netAmount);

        // Mint SXCP to the sender
        sxcpToken.mint(msg.sender, netAmount);

        emit ConvertedToSXCP(msg.sender, amount, netAmount, fee);
    }
}
