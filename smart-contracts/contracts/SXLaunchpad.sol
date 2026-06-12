// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISXUA.sol";

contract SXLaunchpad is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuard 
{
    using SafeERC20 for IERC20;

    struct Project {
        address tokenAddress;
        address stablecoinAddress;
        uint256 price;             // Stablecoin cost per token (scaled to 18 decimals)
        uint256 saleStart;
        uint256 saleEnd;
        uint256 lockPeriod;        // Locking duration after saleEnd
        uint256 penaltyPercent;    // Penalty percentage for early exit (e.g. 10 = 10%)
        uint256 buybackStart;
        uint256 buybackEnd;
        uint256 buybackPrice;      // Buyback stablecoin price per token (scaled to 18 decimals)
        bool finalized;
        bool active;
    }

    ISXUA public sxua;
    address public treasury;

    Project[] public projects;

    // ProjectId => User => Allocation details
    struct UserAllocation {
        uint256 tokenAllocation;
        uint256 stablecoinPaid;
        bool claimed;
        bool refunded;
    }
    mapping(uint256 => mapping(address => UserAllocation)) public allocations;

    event ProjectAdded(uint256 indexed projectId, address indexed tokenAddress, address indexed stablecoinAddress);
    event TokensPurchased(uint256 indexed projectId, address indexed user, uint256 tokenAmount, uint256 stablecoinCost);
    event Refunded(uint256 indexed projectId, address indexed user, uint256 stablecoinAmount);
    event BuybackExecuted(uint256 indexed projectId, address indexed user, uint256 tokenAmount, uint256 stablecoinReturned);
    event TokensClaimed(uint256 indexed projectId, address indexed user, uint256 amountSent, uint256 amountForfeited);
    event ProjectFinalized(uint256 indexed projectId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _sxua, address _treasury) public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();

        require(_sxua != address(0), "SXLaunchpad: Invalid SXUA");
        require(_treasury != address(0), "SXLaunchpad: Invalid treasury");
        sxua = ISXUA(_sxua);
        treasury = _treasury;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Admin Functions
    function addProject(
        address _tokenAddress,
        address _stablecoinAddress,
        uint256 _price,
        uint256 _saleStart,
        uint256 _saleEnd,
        uint256 _lockPeriod,
        uint256 _penaltyPercent,
        uint256 _buybackStart,
        uint256 _buybackEnd,
        uint256 _buybackPrice
    ) external onlyOwner returns (uint256) {
        require(_tokenAddress != address(0), "SXLaunchpad: Invalid token");
        require(_stablecoinAddress != address(0), "SXLaunchpad: Invalid stablecoin");
        require(_saleEnd > _saleStart, "SXLaunchpad: Sale end must be > start");
        require(_penaltyPercent <= 100, "SXLaunchpad: Penalty cannot exceed 100%");

        projects.push(Project({
            tokenAddress: _tokenAddress,
            stablecoinAddress: _stablecoinAddress,
            price: _price,
            saleStart: _saleStart,
            saleEnd: _saleEnd,
            lockPeriod: _lockPeriod,
            penaltyPercent: _penaltyPercent,
            buybackStart: _buybackStart,
            buybackEnd: _buybackEnd,
            buybackPrice: _buybackPrice,
            finalized: false,
            active: true
        }));

        uint256 projectId = projects.length - 1;
        emit ProjectAdded(projectId, _tokenAddress, _stablecoinAddress);
        return projectId;
    }

    function finalizeProject(uint256 projectId) external onlyOwner {
        require(projectId < projects.length, "SXLaunchpad: Project does not exist");
        Project storage project = projects[projectId];
        require(!project.finalized, "SXLaunchpad: Already finalized");
        project.finalized = true;
        emit ProjectFinalized(projectId);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "SXLaunchpad: Invalid treasury");
        treasury = _treasury;
    }

    // User Purchases
    function buyTokens(uint256 projectId, uint256 tokenAmount) external whenNotPaused nonReentrant {
        require(projectId < projects.length, "SXLaunchpad: Project does not exist");
        Project storage project = projects[projectId];
        require(project.active, "SXLaunchpad: Project not active");
        require(block.timestamp >= project.saleStart && block.timestamp <= project.saleEnd, "SXLaunchpad: Sale not active");
        require(tokenAmount > 0, "SXLaunchpad: Amount must be > 0");

        uint256 cost = (tokenAmount * project.price) / 1e18;
        
        // Execute payment via SXUA
        sxua.payForLaunchpad(msg.sender, project.stablecoinAddress, cost);

        allocations[projectId][msg.sender].tokenAllocation += tokenAmount;
        allocations[projectId][msg.sender].stablecoinPaid += cost;

        emit TokensPurchased(projectId, msg.sender, tokenAmount, cost);
    }

    // User Refund Flow
    function requestRefund(uint256 projectId) external whenNotPaused nonReentrant {
        require(projectId < projects.length, "SXLaunchpad: Project does not exist");
        Project storage project = projects[projectId];
        require(!project.finalized, "SXLaunchpad: Project already finalized");
        
        UserAllocation storage alloc = allocations[projectId][msg.sender];
        require(alloc.stablecoinPaid > 0, "SXLaunchpad: No paid allocation");
        require(!alloc.claimed, "SXLaunchpad: Allocation already claimed");
        require(!alloc.refunded, "SXLaunchpad: Already refunded");

        uint256 refundAmount = alloc.stablecoinPaid;
        alloc.tokenAllocation = 0;
        alloc.stablecoinPaid = 0;
        alloc.refunded = true;

        // Approve and refund back to SXUA vault
        IERC20(project.stablecoinAddress).approve(address(sxua), refundAmount);
        sxua.refundToUser(msg.sender, project.stablecoinAddress, refundAmount);

        emit Refunded(projectId, msg.sender, refundAmount);
    }

    // User Buyback Mechanism
    function requestBuyback(uint256 projectId, uint256 tokenAmount) external whenNotPaused nonReentrant {
        require(projectId < projects.length, "SXLaunchpad: Project does not exist");
        Project storage project = projects[projectId];
        require(project.finalized, "SXLaunchpad: Project not finalized");
        require(block.timestamp >= project.buybackStart && block.timestamp <= project.buybackEnd, "SXLaunchpad: Buyback window closed");

        UserAllocation storage alloc = allocations[projectId][msg.sender];
        require(alloc.tokenAllocation >= tokenAmount, "SXLaunchpad: Insufficient token allocation");
        require(!alloc.claimed, "SXLaunchpad: Already claimed tokens");

        uint256 returnAmount = (tokenAmount * project.buybackPrice) / 1e18;

        alloc.tokenAllocation -= tokenAmount;
        alloc.stablecoinPaid -= (tokenAmount * project.price) / 1e18;

        // Transfer stablecoins back to SXUA
        IERC20(project.stablecoinAddress).approve(address(sxua), returnAmount);
        sxua.refundToUser(msg.sender, project.stablecoinAddress, returnAmount);

        emit BuybackExecuted(projectId, msg.sender, tokenAmount, returnAmount);
    }

    // Claim Tokens Vesting & Forfeiture Exit Rules
    function claimTokens(uint256 projectId) external whenNotPaused nonReentrant {
        require(projectId < projects.length, "SXLaunchpad: Project does not exist");
        Project storage project = projects[projectId];
        require(project.finalized, "SXLaunchpad: Project not finalized");

        UserAllocation storage alloc = allocations[projectId][msg.sender];
        require(alloc.tokenAllocation > 0, "SXLaunchpad: No tokens to claim");
        require(!alloc.claimed, "SXLaunchpad: Already claimed");

        alloc.claimed = true;
        uint256 amountToClaim = alloc.tokenAllocation;

        uint256 penalty = 0;
        // Early exit forfeiture check
        if (block.timestamp < project.saleEnd + project.lockPeriod) {
            penalty = (amountToClaim * project.penaltyPercent) / 100;
        }

        uint256 userAmount = amountToClaim - penalty;

        // Send tokens to user
        IERC20(project.tokenAddress).safeTransfer(msg.sender, userAmount);

        // Send forfeited penalty to treasury
        if (penalty > 0) {
            IERC20(project.tokenAddress).safeTransfer(treasury, penalty);
        }

        emit TokensClaimed(projectId, msg.sender, userAmount, penalty);
    }

    // Emergency Withdrawal of launchpad funds (if protocol is shutdown)
    // In emergency, users can withdraw their stablecoins directly
    function emergencyWithdrawProjectFunds(uint256 projectId) external nonReentrant {
        require(sxua.emergencyShutdownActive(), "SXLaunchpad: Protocol not shut down");
        UserAllocation storage alloc = allocations[projectId][msg.sender];
        require(alloc.stablecoinPaid > 0, "SXLaunchpad: No funds to withdraw");
        require(!alloc.claimed, "SXLaunchpad: Already claimed");
        require(!alloc.refunded, "SXLaunchpad: Already refunded");

        uint256 amount = alloc.stablecoinPaid;
        alloc.stablecoinPaid = 0;
        alloc.tokenAllocation = 0;
        alloc.refunded = true;

        IERC20(projects[projectId].stablecoinAddress).safeTransfer(msg.sender, amount);
    }

    function getProjectCount() external view returns (uint256) {
        return projects.length;
    }
}
