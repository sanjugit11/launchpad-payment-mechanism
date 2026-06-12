// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SXGovernance is ReentrancyGuard {
    address public adminA;
    address public adminB;
    address public adminC;

    // DMS Device Binding
    mapping(address => bytes32) public deviceHashes;
    mapping(address => bool) public isDeviceBound;

    struct Proposal {
        address target;
        uint256 value;
        bytes data;
        bool approvedA;
        bool approvedB;
        bool approvedC;
        bool executed;
    }

    Proposal[] public proposals;

    event DeviceBound(address indexed admin, bytes32 deviceHash);
    event ProposalCreated(uint256 indexed proposalId, address indexed target, uint256 value, bytes data);
    event ProposalApproved(uint256 indexed proposalId, address indexed admin);
    event ProposalExecuted(uint256 indexed proposalId);

    modifier onlyAdmin() {
        require(msg.sender == adminA || msg.sender == adminB || msg.sender == adminC, "Governance: Caller is not an admin");
        _;
    }

    constructor(address _adminA, address _adminB, address _adminC) {
        require(_adminA != address(0) && _adminB != address(0) && _adminC != address(0), "Governance: Admin cannot be zero address");
        require(_adminA != _adminB && _adminB != _adminC && _adminA != _adminC, "Governance: Admins must be unique");
        adminA = _adminA;
        adminB = _adminB;
        adminC = _adminC;
    }

    function bindDevice(bytes32 deviceHash) external onlyAdmin {
        require(deviceHash != bytes32(0), "Governance: Invalid device hash");
        deviceHashes[msg.sender] = deviceHash;
        isDeviceBound[msg.sender] = true;
        emit DeviceBound(msg.sender, deviceHash);
    }

    function verifyDevice(address admin, bytes32 deviceHash) external view returns (bool) {
        require(isDeviceBound[admin], "Governance: Device not bound");
        return deviceHashes[admin] == deviceHash;
    }

    function propose(address target, uint256 value, bytes calldata data) external onlyAdmin returns (uint256) {
        proposals.push(Proposal({
            target: target,
            value: value,
            data: data,
            approvedA: false,
            approvedB: false,
            approvedC: false,
            executed: false
        }));
        uint256 proposalId = proposals.length - 1;
        emit ProposalCreated(proposalId, target, value, data);
        return proposalId;
    }

    function approve(uint256 proposalId, bytes32 deviceHash) external onlyAdmin {
        require(proposalId < proposals.length, "Governance: Proposal does not exist");
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Governance: Proposal already executed");
        require(isDeviceBound[msg.sender], "Governance: Device not bound for admin");
        require(deviceHashes[msg.sender] == deviceHash, "Governance: Device hash mismatch");

        if (msg.sender == adminA) {
            require(!proposal.approvedA, "Governance: Already approved by Admin A");
            proposal.approvedA = true;
        } else if (msg.sender == adminB) {
            require(!proposal.approvedB, "Governance: Already approved by Admin B");
            proposal.approvedB = true;
        } else if (msg.sender == adminC) {
            require(!proposal.approvedC, "Governance: Already approved by Admin C");
            proposal.approvedC = true;
        }

        emit ProposalApproved(proposalId, msg.sender);
    }

    function execute(uint256 proposalId) external nonReentrant returns (bytes memory) {
        require(proposalId < proposals.length, "Governance: Proposal does not exist");
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Governance: Proposal already executed");
        require(proposal.approvedA && proposal.approvedB && proposal.approvedC, "Governance: 3-of-3 approval required");

        proposal.executed = true;
        (bool success, bytes memory result) = proposal.target.call{value: proposal.value}(proposal.data);
        require(success, "Governance: Transaction execution failed");

        emit ProposalExecuted(proposalId);
        return result;
    }

    function getProposalCount() external view returns (uint256) {
        return proposals.length;
    }
}
