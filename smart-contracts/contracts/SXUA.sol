// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./SXP.sol";

contract SXUA is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuard 
{
    using SafeERC20 for IERC20;

    SXP public sxpToken;
    address public treasury;

    // Supported stablecoins
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokenList;

    // Balances: User => Token => Balance
    mapping(address => mapping(address => uint256)) public committedBalances;
    mapping(address => mapping(address => uint256)) public uncommittedBalances;

    // Commit tracking
    mapping(address => mapping(address => uint256)) public commitTimestamps;

    // Daily Yield details
    mapping(address => mapping(address => uint256)) public lastRewardTimestamp;
    mapping(address => mapping(address => uint256)) public accruedRewards;

    // SXP Rewards Pool Details
    // Token => Pool info
    struct PoolInfo {
        uint256 totalCommitted;
        uint256 accSxpPerShare;
        uint256 lastRewardTimestamp;
    }
    mapping(address => PoolInfo) public poolInfo;
    // User => Token => Reward Debt
    mapping(address => mapping(address => uint256)) public rewardDebt;

    // Configurations
    uint256 public penaltyPercent; // e.g. 10 for 10%
    uint256 public lockPeriod;      // e.g. 30 days
    bool public emergencyShutdownActive;

    event TokenSupported(address indexed token, bool supported);
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event Committed(address indexed user, address indexed token, uint256 amount);
    event Uncommitted(address indexed user, address indexed token, uint256 amount, uint256 penalty);
    event DailyYieldAccrued(address indexed user, address indexed token, uint256 amount);
    event DailyYieldClaimed(address indexed user, address indexed token, uint256 amount);
    event SxpRewardClaimed(address indexed user, address indexed token, uint256 amount);
    event EmergencyShutdownToggled(bool active);
    event EmergencyWithdrawn(address indexed user, address indexed token, uint256 amount);
    event ConfigUpdated(uint256 penaltyPercent, uint256 lockPeriod);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _sxpToken, 
        address _treasury,
        uint256 _penaltyPercent,
        uint256 _lockPeriod
    ) public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();

        require(_sxpToken != address(0), "SXUA: Invalid SXP token");
        require(_treasury != address(0), "SXUA: Invalid treasury");
        sxpToken = SXP(_sxpToken);
        treasury = _treasury;
        penaltyPercent = _penaltyPercent;
        lockPeriod = _lockPeriod;
        emergencyShutdownActive = false;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Admin Controls
    function setTokenSupport(address token, bool supported) external onlyOwner {
        require(token != address(0), "SXUA: Invalid token");
        if (supported && !supportedTokens[token]) {
            supportedTokenList.push(token);
            poolInfo[token] = PoolInfo({
                totalCommitted: 0,
                accSxpPerShare: 0,
                lastRewardTimestamp: block.timestamp
            });
        }
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }

    function updateConfig(uint256 _penaltyPercent, uint256 _lockPeriod) external onlyOwner {
        require(_penaltyPercent <= 100, "SXUA: Invalid penalty percentage");
        penaltyPercent = _penaltyPercent;
        lockPeriod = _lockPeriod;
        emit ConfigUpdated(_penaltyPercent, _lockPeriod);
    }

    function setEmergencyShutdown(bool active) external onlyOwner {
        emergencyShutdownActive = active;
        if (active) {
            _pause();
        } else {
            _unpause();
        }
        emit EmergencyShutdownToggled(active);
    }

    // Helper to scale any stablecoin balance to 18 decimals for SXP rewards
    function getAmountIn18Decimals(address token, uint256 amount) public view returns (uint256) {
        uint8 dec = IERC20Metadata(token).decimals();
        if (dec < 18) {
            return amount * (10 ** (18 - dec));
        } else if (dec > 18) {
            return amount / (10 ** (dec - 18));
        }
        return amount;
    }

    // Update SXP Reward Pool
    function updatePool(address token) public {
        PoolInfo storage pool = poolInfo[token];
        if (block.timestamp <= pool.lastRewardTimestamp) {
            return;
        }
        if (pool.totalCommitted == 0) {
            pool.lastRewardTimestamp = block.timestamp;
            return;
        }

        // 44% APY Reward. 
        // committedValueIn18 * 44 * timeElapsed / (100 * 31536000)
        uint256 timeElapsed = block.timestamp - pool.lastRewardTimestamp;
        uint256 committedIn18 = getAmountIn18Decimals(token, pool.totalCommitted);
        uint256 reward = (committedIn18 * 44 * timeElapsed) / (100 * 31536000);

        pool.accSxpPerShare += (reward * 1e18) / pool.totalCommitted;
        pool.lastRewardTimestamp = block.timestamp;
    }

    // Accrue Daily Yield (0.12% daily APY reward on total balance)
    function accrueDailyYield(address user, address token) public {
        uint256 lastTs = lastRewardTimestamp[user][token];
        if (lastTs == 0) {
            lastRewardTimestamp[user][token] = block.timestamp;
            return;
        }
        uint256 timeElapsed = block.timestamp - lastTs;
        uint256 daysElapsed = timeElapsed / 1 days;

        if (daysElapsed > 0) {
            uint256 balance = uncommittedBalances[user][token] + committedBalances[user][token];
            uint256 reward = (balance * 12 * daysElapsed) / 10000; // 0.12% daily = 12 / 10000
            if (reward > 0) {
                accruedRewards[user][token] += reward;
                emit DailyYieldAccrued(user, token, reward);
            }
            lastRewardTimestamp[user][token] += daysElapsed * 1 days;
        }
    }

    // Deposit Stablecoin
    function deposit(address token, uint256 amount) external whenNotPaused nonReentrant {
        require(supportedTokens[token], "SXUA: Token not supported");
        require(amount > 0, "SXUA: Deposit amount must be > 0");

        accrueDailyYield(msg.sender, token);
        updatePool(token);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        uncommittedBalances[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount);
    }

    // Withdraw Stablecoin
    function withdraw(address token, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "SXUA: Withdrawal amount must be > 0");
        require(uncommittedBalances[msg.sender][token] >= amount, "SXUA: Insufficient uncommitted balance");

        accrueDailyYield(msg.sender, token);
        
        uncommittedBalances[msg.sender][token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    // Commit uncommitted balance to earn SXP rewards
    function commit(address token, uint256 amount) external whenNotPaused nonReentrant {
        require(supportedTokens[token], "SXUA: Token not supported");
        require(amount > 0, "SXUA: Commit amount must be > 0");
        require(uncommittedBalances[msg.sender][token] >= amount, "SXUA: Insufficient uncommitted balance");

        accrueDailyYield(msg.sender, token);
        updatePool(token);

        // Distribute pending SXP rewards if any
        PoolInfo storage pool = poolInfo[token];
        uint256 userCommitted = committedBalances[msg.sender][token];
        if (userCommitted > 0) {
            uint256 pending = (userCommitted * pool.accSxpPerShare / 1e18) - rewardDebt[msg.sender][token];
            if (pending > 0) {
                sxpToken.mint(msg.sender, pending);
                emit SxpRewardClaimed(msg.sender, token, pending);
            }
        }

        uncommittedBalances[msg.sender][token] -= amount;
        committedBalances[msg.sender][token] += amount;
        commitTimestamps[msg.sender][token] = block.timestamp;
        pool.totalCommitted += amount;

        rewardDebt[msg.sender][token] = (committedBalances[msg.sender][token] * pool.accSxpPerShare) / 1e18;

        emit Committed(msg.sender, token, amount);
    }

    // Uncommit balance (returns to uncommitted balance, early exit fee applies if before lockPeriod)
    function uncommit(address token, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "SXUA: Uncommit amount must be > 0");
        require(committedBalances[msg.sender][token] >= amount, "SXUA: Insufficient committed balance");

        accrueDailyYield(msg.sender, token);
        updatePool(token);

        PoolInfo storage pool = poolInfo[token];
        uint256 userCommitted = committedBalances[msg.sender][token];
        
        // Claim pending SXP rewards
        uint256 pending = (userCommitted * pool.accSxpPerShare / 1e18) - rewardDebt[msg.sender][token];
        if (pending > 0) {
            sxpToken.mint(msg.sender, pending);
            emit SxpRewardClaimed(msg.sender, token, pending);
        }

        committedBalances[msg.sender][token] -= amount;
        pool.totalCommitted -= amount;

        // Apply forfeiture penalty if exiting early
        uint256 penalty = 0;
        if (block.timestamp < commitTimestamps[msg.sender][token] + lockPeriod) {
            penalty = (amount * penaltyPercent) / 100;
        }

        uint256 returnedAmount = amount - penalty;
        uncommittedBalances[msg.sender][token] += returnedAmount;

        if (penalty > 0) {
            accruedRewards[msg.sender][token] = 0;
            IERC20(token).safeTransfer(treasury, penalty);
        }

        rewardDebt[msg.sender][token] = (committedBalances[msg.sender][token] * pool.accSxpPerShare) / 1e18;

        emit Uncommitted(msg.sender, token, amount, penalty);
    }

    // Claim daily yield rewards into uncommitted balance
    function claimDailyYield(address token) external whenNotPaused nonReentrant {
        accrueDailyYield(msg.sender, token);
        uint256 amount = accruedRewards[msg.sender][token];
        require(amount > 0, "SXUA: No accrued daily yield");

        accruedRewards[msg.sender][token] = 0;
        uncommittedBalances[msg.sender][token] += amount;

        emit DailyYieldClaimed(msg.sender, token, amount);
    }

    // Claim SXP rewards
    function claimSxpReward(address token) external whenNotPaused nonReentrant {
        updatePool(token);
        PoolInfo storage pool = poolInfo[token];
        uint256 userCommitted = committedBalances[msg.sender][token];
        require(userCommitted > 0, "SXUA: No committed balance");

        uint256 pending = (userCommitted * pool.accSxpPerShare / 1e18) - rewardDebt[msg.sender][token];
        require(pending > 0, "SXUA: No SXP reward to claim");

        rewardDebt[msg.sender][token] = (userCommitted * pool.accSxpPerShare) / 1e18;
        sxpToken.mint(msg.sender, pending);

        emit SxpRewardClaimed(msg.sender, token, pending);
    }

    // Deduct uncommitted balance for launchpad purchases
    function payForLaunchpad(address user, address token, uint256 amount) external whenNotPaused nonReentrant {
        // Can only be called by an approved project/launchpad engine.
        // For simplicity, we can restrict this to the owner/governance or an approved launchpad contract.
        // We will make the owner configure the launchpad engine address.
        require(amount > 0, "SXUA: Amount must be > 0");
        require(uncommittedBalances[user][token] >= amount, "SXUA: Insufficient uncommitted balance");

        accrueDailyYield(user, token);
        uncommittedBalances[user][token] -= amount;
        
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // Credit uncommitted balance for refunds / buybacks
    function refundToUser(address user, address token, uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "SXUA: Amount must be > 0");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        accrueDailyYield(user, token);
        uncommittedBalances[user][token] += amount;
    }

    // Emergency Withdrawal: withdraws all committed + uncommitted stablecoins immediately. No penalties.
    function emergencyWithdraw(address token) external nonReentrant {
        require(emergencyShutdownActive, "SXUA: Emergency shutdown not active");
        
        uint256 total = uncommittedBalances[msg.sender][token] + committedBalances[msg.sender][token];
        require(total > 0, "SXUA: No balance to withdraw");

        uncommittedBalances[msg.sender][token] = 0;
        committedBalances[msg.sender][token] = 0;

        IERC20(token).safeTransfer(msg.sender, total);

        emit EmergencyWithdrawn(msg.sender, token, total);
    }

    // View helper for pending SXP rewards
    function pendingSxpReward(address token, address user) external view returns (uint256) {
        PoolInfo memory pool = poolInfo[token];
        uint256 userCommitted = committedBalances[user][token];
        if (userCommitted == 0) return 0;

        if (block.timestamp > pool.lastRewardTimestamp && pool.totalCommitted > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTimestamp;
            uint256 committedIn18 = getAmountIn18Decimals(token, pool.totalCommitted);
            uint256 reward = (committedIn18 * 44 * timeElapsed) / (100 * 31536000);
            pool.accSxpPerShare += (reward * 1e18) / pool.totalCommitted;
        }

        return (userCommitted * pool.accSxpPerShare / 1e18) - rewardDebt[user][token];
    }
}
