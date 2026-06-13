// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/ISXSE.sol";
import "./interfaces/ISXUA.sol";

contract SXBuyStables is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISXSE public sxse;
    ISXUA public sxua;
    address public sxcpTreasury;
    address public sxmm;
    address public ptfReceiver;

    // Mock exchange rate: 1 ETH = 3500 USDC
    uint256 public ethToUsdRate = 3500 * 1e18;

    event StablecoinsBought(address indexed user, address indexed stablecoin, uint256 ethAmount, uint256 netStables);

    constructor(address _sxse, address _sxua, address _sxcpTreasury, address _sxmm, address _ptfReceiver) Ownable(msg.sender) {
        sxse = ISXSE(_sxse);
        sxua = ISXUA(_sxua);
        sxcpTreasury = _sxcpTreasury;
        sxmm = _sxmm;
        ptfReceiver = _ptfReceiver;
    }

    function setEthToUsdRate(uint256 _newRate) external onlyOwner {
        ethToUsdRate = _newRate;
    }

    function buyStables(address stablecoin) external payable nonReentrant {
        require(address(sxse) == address(0) || sxse.isRegistered(msg.sender), "SXSE: User not registered");
        require(msg.value > 0, "SXBuyStables: Must send ETH");

        uint8 decimals = IERC20Metadata(stablecoin).decimals();
        
        uint256 grossStables18 = (msg.value * ethToUsdRate) / 1e18;
        uint256 grossStables = grossStables18;
        if (decimals < 18) {
            grossStables = grossStables18 / (10 ** (18 - decimals));
        } else if (decimals > 18) {
            grossStables = grossStables18 * (10 ** (decimals - 18));
        }

        uint256 sxcpFee = (grossStables * 12) / 100;
        uint256 subtotal1 = grossStables - sxcpFee;
        
        uint256 sxmmSpread = (subtotal1 * 5) / 100;
        uint256 subtotal2 = subtotal1 - sxmmSpread;
        
        uint256 ptfFee = (subtotal2 * 1) / 100;
        uint256 userAmount = subtotal2 - ptfFee;

        payable(sxmm).transfer(msg.value);
        IERC20(stablecoin).safeTransferFrom(sxmm, address(this), grossStables);

        IERC20(stablecoin).safeTransfer(sxcpTreasury, sxcpFee);
        IERC20(stablecoin).safeTransfer(ptfReceiver, ptfFee);
        IERC20(stablecoin).safeTransfer(sxmm, sxmmSpread);

        IERC20(stablecoin).safeIncreaseAllowance(address(sxua), userAmount);
        sxua.depositFor(msg.sender, stablecoin, userAmount);

        emit StablecoinsBought(msg.sender, stablecoin, msg.value, userAmount);
    }
}