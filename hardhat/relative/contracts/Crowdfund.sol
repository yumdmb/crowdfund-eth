// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Crowdfund
 * @notice A simple crowdfunding smart contract that collects ETH until a funding goal is met
 * @dev Features deadline, refunds if target not met, and beneficiary withdrawal
 * @author Generated for ETH Development Learning
 */
contract Crowdfund {
    // ============ State Variables ============
    
    /// @notice The funding goal in wei
    uint256 public immutable goal;
    
    /// @notice The campaign deadline as Unix timestamp
    uint256 public immutable deadline;
    
    /// @notice The beneficiary who receives funds if goal is reached
    address public immutable beneficiary;
    
    /// @notice Total amount raised so far
    uint256 public totalRaised;
    
    /// @notice Whether the funding goal has been reached
    bool public goalReached;
    
    /// @notice Whether funds have been withdrawn by beneficiary
    bool public fundsWithdrawn;
    
    /// @notice Mapping to track individual contributions
    mapping(address => uint256) public contributions;
    
    // ============ Events ============
    
    /// @notice Emitted when a contribution is made
    event ContributionMade(
        address indexed contributor,
        uint256 amount,
        uint256 newTotalRaised
    );
    
    /// @notice Emitted when the funding goal is reached
    event GoalReached(uint256 totalRaised, uint256 timestamp);
    
    /// @notice Emitted when beneficiary withdraws funds
    event FundsWithdrawn(
        address indexed beneficiary,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice Emitted when a contributor claims a refund
    event RefundClaimed(
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
    );
    
    // ============ Custom Errors ============
    
    error CampaignEnded();
    error CampaignStillActive();
    error GoalAlreadyReached();
    error GoalNotReached();
    error InsufficientContribution();
    error NoContributionFound();
    error OnlyBeneficiary();
    error FundsAlreadyWithdrawn();
    error TransferFailed();
    error InvalidGoal();
    error InvalidDuration();
    error InvalidBeneficiary();
    
    // ============ Modifiers ============
    
    /// @notice Ensures only the beneficiary can call the function
    modifier onlyBeneficiary() {
        if (msg.sender != beneficiary) revert OnlyBeneficiary();
        _;
    }
    
    /// @notice Ensures the campaign is still active
    modifier onlyBeforeDeadline() {
        if (block.timestamp >= deadline) revert CampaignEnded();
        _;
    }
    
    /// @notice Ensures the campaign has ended
    modifier onlyAfterDeadline() {
        if (block.timestamp <= deadline) revert CampaignStillActive();
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @notice Creates a new crowdfunding campaign
     * @param _goal The funding goal in wei
     * @param _durationInDays The campaign duration in days
     * @param _beneficiary The address that will receive funds if goal is reached
     */
    constructor(
        uint256 _goal,
        uint256 _durationInDays,
        address _beneficiary
    ) {
        if (_goal == 0) revert InvalidGoal();
        if (_durationInDays == 0) revert InvalidDuration();
        if (_beneficiary == address(0)) revert InvalidBeneficiary();
        
        goal = _goal;
        deadline = block.timestamp + (_durationInDays * 1 days);
        beneficiary = _beneficiary;
    }
    
    // ============ External Functions ============
    
    /**
     * @notice Contribute ETH to the campaign
     * @dev Reverts if campaign has ended or goal already reached
     */
    function contribute() external payable onlyBeforeDeadline {
        if (msg.value == 0) revert InsufficientContribution();
        if (goalReached) revert GoalAlreadyReached();
        
        // Update state (CEI pattern - Effects before Interactions)
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        
        emit ContributionMade(msg.sender, msg.value, totalRaised);
        
        // Check if goal is reached
        if (totalRaised >= goal) {
            goalReached = true;
            emit GoalReached(totalRaised, block.timestamp);
        }
    }
    
    /**
     * @notice Allows beneficiary to withdraw funds if goal is reached
     * @dev Can only be called after deadline and if goal was reached
     */
    function withdraw() external onlyBeneficiary onlyAfterDeadline {
        if (!goalReached) revert GoalNotReached();
        if (fundsWithdrawn) revert FundsAlreadyWithdrawn();
        
        // Update state before transfer (CEI pattern)
        fundsWithdrawn = true;
        uint256 amount = address(this).balance;
        
        emit FundsWithdrawn(beneficiary, amount, block.timestamp);
        
        // Transfer funds
        (bool success, ) = payable(beneficiary).call{value: amount}("");
        if (!success) revert TransferFailed();
    }
    
    /**
     * @notice Allows contributors to claim refund if goal not reached
     * @dev Can only be called after deadline and if goal was not reached
     */
    function claimRefund() external onlyAfterDeadline {
        if (goalReached) revert GoalAlreadyReached();
        
        uint256 contributionAmount = contributions[msg.sender];
        if (contributionAmount == 0) revert NoContributionFound();
        
        // Update state before transfer (CEI pattern - prevent reentrancy)
        contributions[msg.sender] = 0;
        
        emit RefundClaimed(msg.sender, contributionAmount, block.timestamp);
        
        // Transfer refund
        (bool success, ) = payable(msg.sender).call{value: contributionAmount}("");
        if (!success) revert TransferFailed();
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Returns the time remaining until deadline
     * @return timeRemaining Time remaining in seconds (0 if deadline passed)
     */
    function getTimeRemaining() external view returns (uint256 timeRemaining) {
        if (block.timestamp >= deadline) {
            return 0;
        }
        return deadline - block.timestamp;
    }
    
    /**
     * @notice Returns the funding progress as a percentage (scaled by 10000)
     * @return progress Progress percentage (e.g., 2550 = 25.50%)
     */
    function getFundingProgress() external view returns (uint256 progress) {
        if (goal == 0) return 0;
        return (totalRaised * 10000) / goal;
    }
    
    /**
     * @notice Returns comprehensive campaign information
     * @return _goal The funding goal
     * @return _deadline The campaign deadline
     * @return _beneficiary The beneficiary address
     * @return _totalRaised Total amount raised
     * @return _goalReached Whether goal is reached
     * @return _fundsWithdrawn Whether funds are withdrawn
     * @return _timeRemaining Time remaining in seconds
     */
    function getCampaignInfo() 
        external 
        view 
        returns (
            uint256 _goal,
            uint256 _deadline,
            address _beneficiary,
            uint256 _totalRaised,
            bool _goalReached,
            bool _fundsWithdrawn,
            uint256 _timeRemaining
        ) 
    {
        return (
            goal,
            deadline,
            beneficiary,
            totalRaised,
            goalReached,
            fundsWithdrawn,
            block.timestamp >= deadline ? 0 : deadline - block.timestamp
        );
    }
    
    /**
     * @notice Returns the contribution amount for a specific address
     * @param contributor The contributor address
     * @return amount The contribution amount in wei
     */
    function getContribution(address contributor) external view returns (uint256 amount) {
        return contributions[contributor];
    }
    
    /**
     * @notice Returns current campaign status
     * @return status 0=Active, 1=GoalReached, 2=Failed, 3=Completed
     */
    function getStatus() external view returns (uint8 status) {
        if (block.timestamp < deadline) {
            return goalReached ? 1 : 0; // GoalReached or Active
        } else {
            if (goalReached) {
                return fundsWithdrawn ? 3 : 2; // Completed or Failed (should be withdrawn)
            } else {
                return 2; // Failed
            }
        }
    }
    
    // ============ Fallback Functions ============
    
    /**
     * @notice Fallback function to accept direct ETH transfers as contributions
     */
    receive() external payable {
        if (msg.value == 0) revert InsufficientContribution();
        if (block.timestamp >= deadline) revert CampaignEnded();
        if (goalReached) revert GoalAlreadyReached();
        
        // Update state (CEI pattern - Effects before Interactions)
        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;
        
        emit ContributionMade(msg.sender, msg.value, totalRaised);
        
        // Check if goal is reached
        if (totalRaised >= goal) {
            goalReached = true;
            emit GoalReached(totalRaised, block.timestamp);
        }
    }
    
    /**
     * @notice Fallback function for invalid function calls
     */
    fallback() external payable {
        revert("Invalid function call");
    }
}
