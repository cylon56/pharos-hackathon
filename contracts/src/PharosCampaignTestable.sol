// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PharosCampaign} from "./PharosCampaign.sol";

/// @title PharosCampaignTestable
/// @notice A testing variant of PharosCampaign that removes time-based restrictions.
///         Donations are accepted at any time and finalize() can be called immediately
///         without waiting for the deadline — enabling instant refund/success testing.
/// @dev DO NOT deploy this in a production context.
contract PharosCampaignTestable is PharosCampaign {

    constructor(
        address _token,
        address _recipient,
        uint256 _fundingGoal,
        uint256 _startTime,
        uint256 _endTime,
        uint16  _feeBasisPoints,
        address _feeCollector,
        string memory _metadataURI
    ) PharosCampaign(
        _token,
        _recipient,
        _fundingGoal,
        _startTime,
        _endTime,
        _feeBasisPoints,
        _feeCollector,
        _metadataURI
    ) {}

    /// @notice Donate without enforcing the campaign time window.
    function donate(uint256 amount) external override {
        if (amount == 0) revert ZeroAmount();
        if (status != Status.Active) revert CampaignNotActive();

        token.transferFrom(msg.sender, address(this), amount);

        if (donations[msg.sender] == 0) {
            donorList.push(msg.sender);
        }
        donations[msg.sender] += amount;
        totalRaised += amount;

        _checkAndActivateMilestones();

        emit DonationReceived(msg.sender, amount);
    }

    /// @notice Shielded donate without enforcing the campaign time window.
    function donateShielded(bytes32 commitmentHash, uint256 amount) external override {
        if (status != Status.Active) revert CampaignNotActive();
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

    /// @notice Finalize the campaign at any time (no deadline enforcement).
    ///         If totalRaised >= fundingGoal → Successful; otherwise → Failed.
    ///         Failed campaigns allow immediate refunds via refund().
    function finalize() external override {
        if (status != Status.Active) revert CampaignNotActive();

        if (totalRaised >= fundingGoal) {
            status = Status.Successful;
        } else {
            status = Status.Failed;
        }

        emit CampaignFinalized(status, totalRaised);
    }
}
