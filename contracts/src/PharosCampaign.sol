// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FeeCollectible} from "./FeeCollectible.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PharosCampaign - Individual assurance-contract crowdfunding campaign
/// @notice Handles donations, milestone matching, finalization, claims, and refunds
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
    error TransferFailed();
    error MatchNotFunded();

    // ——— Constructor ————————————————————————————————
    constructor(
        address _recipient,
        uint256 _fundingGoal,
        uint256 _startTime,
        uint256 _endTime,
        uint16  _feeBasisPoints,
        address _feeCollector,
        string memory _metadataURI
    ) FeeCollectible(_feeCollector) {
        recipient = _recipient;
        fundingGoal = _fundingGoal;
        startTime = _startTime;
        endTime = _endTime;
        feeBasisPoints = _feeBasisPoints;
        metadataURI = _metadataURI;
        status = Status.Active;
    }

    // ——— Receive (bare transfers become public donations) ———
    receive() external payable {
        _donate(msg.sender, msg.value);
    }

    // ——— Public Donation ————————————————————————————
    function donate() external payable {
        _donate(msg.sender, msg.value);
    }

    function _donate(address donor, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();
        if (status != Status.Active) revert CampaignNotActive();
        if (block.timestamp < startTime || block.timestamp > endTime) revert CampaignNotActive();

        if (donations[donor] == 0) {
            donorList.push(donor);
        }
        donations[donor] += amount;
        totalRaised += amount;

        _checkAndActivateMilestones();

        emit DonationReceived(donor, amount);
    }

    // ——— Shielded Donation ——————————————————————————
    /// @notice Records a shielded donation with a commitment hash for refund claims.
    ///         commitmentHash = keccak256(abi.encodePacked(amount, secret, nullifier))
    ///         If campaign fails, donor can claim refund by revealing secret + nullifier.
    /// @param commitmentHash Hash commitment for this shielded donation (bytes32(0) for non-refundable)
    function donateShielded(bytes32 commitmentHash) external payable {
        if (status != Status.Active) revert CampaignNotActive();
        if (block.timestamp < startTime || block.timestamp > endTime) revert CampaignNotActive();
        if (msg.value == 0) revert ZeroAmount();

        totalRaised += msg.value;
        shieldedDonationCount++;
        shieldedDonationTotal += msg.value;

        if (commitmentHash != bytes32(0)) {
            shieldedCommitments[commitmentHash] = msg.value;
        }

        _checkAndActivateMilestones();

        emit ShieldedDonationReceived(shieldedDonationCount, msg.value);
    }

    // ——— Milestone Matching —————————————————————————
    /// @notice Create a milestone match commitment (public or private).
    /// @param milestoneThreshold The total raised threshold to activate this match
    /// @param matchAmount The amount the matcher will contribute if milestone is hit
    /// @param isPrivate Whether the matcher's identity is shielded via Unlink
    /// @param commitmentHash For private matchers: keccak256(matchAmount, secret, nullifier)
    function createMilestoneMatch(
        uint256 milestoneThreshold,
        uint256 matchAmount,
        bool isPrivate,
        bytes32 commitmentHash
    ) external payable {
        if (status != Status.Active) revert CampaignNotActive();
        if (msg.value != matchAmount) revert ZeroAmount();
        if (isPrivate && commitmentHash == bytes32(0)) revert InvalidCommitment();

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
    /// @notice Finalize the campaign. Callable by anyone after end time.
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

        (bool success,) = recipient.call{value: recipientAmount}("");
        if (!success) revert TransferFailed();

        emit FundsClaimed(recipient, recipientAmount);
    }

    // ——— Fee Collection —————————————————————————————
    function collectFee() external onlyFeeCollector nonReentrant {
        if (status != Status.Successful) revert CampaignNotSuccessful();
        if (feeClaimed) revert AlreadyClaimed();
        if (!recipientClaimed) revert CampaignNotFinalized();

        feeClaimed = true;

        uint256 feeAmount = (totalRaised * feeBasisPoints) / 10000;

        (bool success,) = feeCollector.call{value: feeAmount}("");
        if (!success) revert TransferFailed();

        emit FeeCollected(feeCollector, feeAmount);
    }

    // ——— Refunds ————————————————————————————————————
    function refund() external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        uint256 amount = donations[msg.sender];
        if (amount == 0) revert NoDonation();

        donations[msg.sender] = 0;

        (bool success,) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit RefundClaimed(msg.sender, amount);
    }

    /// @notice Batch refund for all public donors (callable by anyone)
    function batchRefund() external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        for (uint256 i = 0; i < donorList.length; i++) {
            address donor = donorList[i];
            uint256 amount = donations[donor];
            if (amount > 0) {
                donations[donor] = 0;
                (bool success,) = donor.call{value: amount}("");
                if (success) {
                    emit RefundClaimed(donor, amount);
                }
            }
        }
    }

    /// @notice Refund unactivated public milestone match on failure
    function refundMatch(uint256 matchIndex) external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        MilestoneMatch storage m = milestoneMatches[matchIndex];
        if (!m.isFunded || m.isActivated || m.isRefunded) revert MatchNotFunded();
        if (m.isPrivate) revert UseRefundShielded();

        m.isRefunded = true;

        (bool success,) = m.matcher.call{value: m.matchAmount}("");
        if (!success) revert TransferFailed();

        emit MatchRefunded(matchIndex, m.matchAmount);
    }

    /// @notice Refund a shielded donation OR private milestone match by revealing
    ///         the commitment secret + nullifier.
    /// @param commitmentHash The original commitment hash
    /// @param secret The secret used to generate the commitment
    /// @param nullifier The nullifier (prevents double-refund)
    /// @param refundTo The address to send the refund to
    function refundShielded(
        bytes32 commitmentHash,
        bytes32 secret,
        bytes32 nullifier,
        address payable refundTo
    ) external nonReentrant {
        if (status != Status.Failed) revert CampaignNotFailed();

        uint256 amount = shieldedCommitments[commitmentHash];
        if (amount == 0) revert NoDonation();
        if (usedNullifiers[nullifier]) revert NullifierAlreadyUsed();

        bytes32 computed = keccak256(abi.encodePacked(amount, secret, nullifier));
        if (computed != commitmentHash) revert InvalidCommitment();

        usedNullifiers[nullifier] = true;
        shieldedCommitments[commitmentHash] = 0;

        // Mark private milestone match as refunded if applicable
        for (uint256 i = 0; i < milestoneMatches.length; i++) {
            if (milestoneMatches[i].commitmentHash == commitmentHash && !milestoneMatches[i].isRefunded) {
                milestoneMatches[i].isRefunded = true;
                break;
            }
        }

        (bool success,) = refundTo.call{value: amount}("");
        if (!success) revert TransferFailed();

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
