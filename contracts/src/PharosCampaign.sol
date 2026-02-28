// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FeeCollectible} from "./FeeCollectible.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title PharosCampaign - Individual assurance-contract crowdfunding campaign (ERC20)
contract PharosCampaign is FeeCollectible, ReentrancyGuard {

    // ——— Types ———————————————————————————————————————
    enum Status { Active, Successful, Failed }

    struct MilestoneMatch {
        address matcher;
        bytes32 commitmentHash;
        uint256 milestoneThreshold;
        uint256 matchAmount;
        bool isPrivate;
        bool isActivated;
        bool isFunded;
        bool isRefunded;
    }

    // ——— State ———————————————————————————————————————
    IERC20 public immutable token;
    address public immutable recipient;
    uint256 public immutable fundingGoal;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint16  public immutable feeBasisPoints;
    string  public metadataURI;

    Status  public status;
    uint256 public totalRaised;
    uint256 public totalMatchFunds;
    bool    public recipientClaimed;
    bool    public feeClaimed;

    mapping(address => uint256) public donations;
    address[] public donorList;

    uint256 public shieldedDonationCount;
    uint256 public shieldedDonationTotal;
    mapping(bytes32 => uint256) public shieldedCommitments;
    mapping(bytes32 => bool) public usedNullifiers;

    MilestoneMatch[] public milestoneMatches;

    // ——— Events —————————————————————————————————————
    event DonationReceived(address indexed donor, uint256 amount);
    event ShieldedDonationReceived(uint256 indexed commitmentIndex, uint256 amount);
    event MilestoneMatchCreated(uint256 indexed matchIndex, uint256 threshold, uint256 amount, bool isPrivate);
    event MilestoneActivated(uint256 indexed matchIndex);
    event CampaignFinalized(Status status, uint256 totalRaised);
    event FundsClaimed(address indexed recipient, uint256 amount);
    event FeeCollected(address indexed collector, uint256 amount);
    event RefundClaimed(address indexed donor, uint256 amount);
    event ShieldedRefundClaimed(bytes32 indexed commitmentHash, uint256 amount);
    event MatchRefunded(uint256 indexed matchIndex, uint256 amount);

    // ——— Errors —————————————————————————————————————
    error CampaignNotActive();
    error CampaignNotEnded();
    error CampaignNotFinalized();
    error CampaignNotFailed();
    error CampaignNotSuccessful();
    error AlreadyClaimed();
    error NoDonation();
    error ZeroAmount();
    error InvalidCommitment();
    error NullifierAlreadyUsed();
    error UseRefundShielded();
    error MatchNotFunded();

    // ——— Constructor ————————————————————————————————
    constructor(
        address _token,
        address _recipient,
        uint256 _fundingGoal,
        uint256 _startTime,
        uint256 _endTime,
        uint16  _feeBasisPoints,
        address _feeCollector,
        string memory _metadataURI
    ) FeeCollectible(_feeCollector) {
        token = IERC20(_token);
        recipient = _recipient;
        fundingGoal = _fundingGoal;
        startTime = _startTime;
        endTime = _endTime;
        feeBasisPoints = _feeBasisPoints;
        metadataURI = _metadataURI;
        status = Status.Active;
    }

    // ——— Public Donation ————————————————————————————
    function donate(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (status != Status.Active) revert CampaignNotActive();
        if (block.timestamp < startTime || block.timestamp > endTime) revert CampaignNotActive();

        token.transferFrom(msg.sender, address(this), amount);

        if (donations[msg.sender] == 0) {
            donorList.push(msg.sender);
        }
        donations[msg.sender] += amount;
        totalRaised += amount;

        _checkAndActivateMilestones();

        emit DonationReceived(msg.sender, amount);
    }

    // ——— Shielded Donation ——————————————————————————
    /// @param commitmentHash keccak256(abi.encodePacked(amount, secret, nullifier))
    /// @param amount Token amount to donate
    function donateShielded(bytes32 commitmentHash, uint256 amount) external {
        if (status != Status.Active) revert CampaignNotActive();
        if (block.timestamp < startTime || block.timestamp > endTime) revert CampaignNotActive();
        if (amount == 0) revert ZeroAmount();

        token.transferFrom(msg.sender, address(this), amount);

        totalRaised += amount;
        shieldedDonationCount++;
        shieldedDonationTotal += amount;

        if (commitmentHash != bytes32(0)) {
            shieldedCommitments[commitmentHash] = amount;
        }

        _checkAndActivateMilestones();

        emit ShieldedDonationReceived(shieldedDonationCount, amount);
    }

    // ——— Milestone Matching —————————————————————————
    function createMilestoneMatch(
        uint256 milestoneThreshold,
        uint256 matchAmount,
        bool isPrivate,
        bytes32 commitmentHash
    ) external {
        if (status != Status.Active) revert CampaignNotActive();
        if (matchAmount == 0) revert ZeroAmount();
        if (isPrivate && commitmentHash == bytes32(0)) revert InvalidCommitment();

        token.transferFrom(msg.sender, address(this), matchAmount);

        milestoneMatches.push(MilestoneMatch({
            matcher: isPrivate ? address(0) : msg.sender,
            commitmentHash: commitmentHash,
            milestoneThreshold: milestoneThreshold,
            matchAmount: matchAmount,
            isPrivate: isPrivate,
            isActivated: false,
            isFunded: true,
            isRefunded: false
        }));

        if (isPrivate && commitmentHash != bytes32(0)) {
            shieldedCommitments[commitmentHash] = matchAmount;
        }

        totalMatchFunds += matchAmount;

        emit MilestoneMatchCreated(
            milestoneMatches.length - 1,
            milestoneThreshold,
            matchAmount,
            isPrivate
        );

        _checkAndActivateMilestones();
    }

    function _checkAndActivateMilestones() internal {
        for (uint256 i = 0; i < milestoneMatches.length; i++) {
            MilestoneMatch storage m = milestoneMatches[i];
            if (!m.isActivated && m.isFunded && totalRaised >= m.milestoneThreshold) {
                m.isActivated = true;
                totalRaised += m.matchAmount;
                totalMatchFunds -= m.matchAmount;
                emit MilestoneActivated(i);
            }
        }
    }

    // ——— Finalization ———————————————————————————————
    function finalize() external {
        if (status != Status.Active) revert CampaignNotActive();
        if (block.timestamp <= endTime) revert CampaignNotEnded();

        if (totalRaised >= fundingGoal) {
            status = Status.Successful;
        } else {
            status = Status.Failed;
        }

        emit CampaignFinalized(status, totalRaised);
    }

    // ——— Claim Funds (Recipient) ————————————————————
    function claimFunds() external nonReentrant {
        if (status != Status.Successful) revert CampaignNotSuccessful();
        if (recipientClaimed) revert AlreadyClaimed();

        recipientClaimed = true;

        uint256 feeAmount = (totalRaised * feeBasisPoints) / 10000;
        uint256 recipientAmount = totalRaised - feeAmount;

        token.transfer(recipient, recipientAmount);

        emit FundsClaimed(recipient, recipientAmount);
    }

    // ——— Fee Collection —————————————————————————————
    function collectFee() external onlyFeeCollector nonReentrant {
        if (status != Status.Successful) revert CampaignNotSuccessful();
        if (feeClaimed) revert AlreadyClaimed();
        if (!recipientClaimed) revert CampaignNotFinalized();

        feeClaimed = true;

        uint256 feeAmount = (totalRaised * feeBasisPoints) / 10000;

        token.transfer(feeCollector, feeAmount);

        emit FeeCollected(feeCollector, feeAmount);
    }

    // ——— Refunds ————————————————————————————————————
    function refund() external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        uint256 amount = donations[msg.sender];
        if (amount == 0) revert NoDonation();

        donations[msg.sender] = 0;

        token.transfer(msg.sender, amount);

        emit RefundClaimed(msg.sender, amount);
    }

    function batchRefund() external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        for (uint256 i = 0; i < donorList.length; i++) {
            address donor = donorList[i];
            uint256 amount = donations[donor];
            if (amount > 0) {
                donations[donor] = 0;
                token.transfer(donor, amount);
                emit RefundClaimed(donor, amount);
            }
        }
    }

    function refundMatch(uint256 matchIndex) external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        MilestoneMatch storage m = milestoneMatches[matchIndex];
        if (!m.isFunded || m.isActivated || m.isRefunded) revert MatchNotFunded();
        if (m.isPrivate) revert UseRefundShielded();

        m.isRefunded = true;

        token.transfer(m.matcher, m.matchAmount);

        emit MatchRefunded(matchIndex, m.matchAmount);
    }

    function refundShielded(
        bytes32 commitmentHash,
        bytes32 secret,
        bytes32 nullifier,
        address refundTo
    ) external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        uint256 amount = shieldedCommitments[commitmentHash];
        if (amount == 0) revert NoDonation();
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();

        bytes32 computed = keccak256(abi.encodePacked(amount, secret, nullifier));
        if (computed != commitmentHash) revert InvalidCommitment();

        usedNullifiers[nullifier] = true;
        shieldedCommitments[commitmentHash] = 0;

        for (uint256 i = 0; i < milestoneMatches.length; i++) {
            if (milestoneMatches[i].commitmentHash == commitmentHash && !milestoneMatches[i].isRefunded) {
                milestoneMatches[i].isRefunded = true;
                break;
            }
        }

        token.transfer(refundTo, amount);

        emit ShieldedRefundClaimed(commitmentHash, amount);
    }

    // ——— View Functions ——————————————————————————————
    function getDonorCount() external view returns (uint256) {
        return donorList.length + shieldedDonationCount;
    }

    function getPublicDonorCount() external view returns (uint256) {
        return donorList.length;
    }

    function getMilestoneMatchCount() external view returns (uint256) {
        return milestoneMatches.length;
    }

    function getMilestoneMatches() external view returns (MilestoneMatch[] memory) {
        return milestoneMatches;
    }

    function getActivatedMatchTotal() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < milestoneMatches.length; i++) {
            if (milestoneMatches[i].isActivated) {
                total += milestoneMatches[i].matchAmount;
            }
        }
        return total;
    }

    function getDonors() external view returns (address[] memory) {
        return donorList;
    }

    function getCampaignInfo() external view returns (
        address _recipient,
        uint256 _fundingGoal,
        uint256 _totalRaised,
        uint256 _startTime,
        uint256 _endTime,
        Status  _status,
        uint256 _donorCount,
        uint256 _milestoneCount,
        string memory _metadataURI
    ) {
        return (
            recipient,
            fundingGoal,
            totalRaised,
            startTime,
            endTime,
            status,
            donorList.length + shieldedDonationCount,
            milestoneMatches.length,
            metadataURI
        );
    }
}
