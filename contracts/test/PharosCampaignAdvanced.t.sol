// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PharosCampaign} from "../src/PharosCampaign.sol";
import {PharosCampaignFactory} from "../src/PharosCampaignFactory.sol";
import {FeeCollectible} from "../src/FeeCollectible.sol";

/// @title PharosCampaignAdvanced - Extended test coverage
/// @notice Edge cases, fuzz tests, event verification, and invariant checks
contract PharosCampaignAdvancedTest is Test {
    PharosCampaignFactory factory;
    PharosCampaign campaign;

    address feeCollector = address(0xFEE);
    address recipient = address(0xBEEF);
    address donor1 = address(0xD001);
    address donor2 = address(0xD002);
    address donor3 = address(0xD003);
    address matcher1 = address(0xA001);
    address matcher2 = address(0xA002);

    uint256 fundingGoal = 10 ether;
    uint256 startTime;
    uint256 endTime;
    uint16 feeBps = 100; // 1%

    function setUp() public {
        startTime = block.timestamp + 1;
        endTime = block.timestamp + 7 days;

        factory = new PharosCampaignFactory(feeCollector, feeBps);

        address campaignAddr = factory.createCampaign(
            recipient,
            fundingGoal,
            startTime,
            endTime,
            "ipfs://test-metadata"
        );
        campaign = PharosCampaign(payable(campaignAddr));

        vm.deal(donor1, 100 ether);
        vm.deal(donor2, 100 ether);
        vm.deal(donor3, 100 ether);
        vm.deal(matcher1, 100 ether);
        vm.deal(matcher2, 100 ether);
    }

    // ═══════════════════════════════════════════════════════
    // ——— FeeCollectible Tests ——————————————————————————————
    // ═══════════════════════════════════════════════════════

    function test_fee_collector_transfer() public {
        address newCollector = address(0xFEE2);
        vm.prank(feeCollector);
        factory.transferFeeCollector(newCollector);
        assertEq(factory.feeCollector(), newCollector);
    }

    function test_fee_collector_transfer_not_collector_reverts() public {
        vm.prank(donor1);
        vm.expectRevert(FeeCollectible.OnlyFeeCollector.selector);
        factory.transferFeeCollector(donor1);
    }

    function test_fee_collector_transfer_zero_address_reverts() public {
        vm.prank(feeCollector);
        vm.expectRevert(FeeCollectible.ZeroAddress.selector);
        factory.transferFeeCollector(address(0));
    }

    function test_fee_collector_transfer_event() public {
        address newCollector = address(0xFEE2);
        vm.prank(feeCollector);
        vm.expectEmit(true, true, false, false);
        emit FeeCollectible.FeeCollectorTransferred(feeCollector, newCollector);
        factory.transferFeeCollector(newCollector);
    }

    function test_factory_zero_fee_collector_reverts() public {
        vm.expectRevert(FeeCollectible.ZeroAddress.selector);
        new PharosCampaignFactory(address(0), feeBps);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Factory Edge Cases ———————————————————————————————
    // ═══════════════════════════════════════════════════════

    function test_factory_multiple_campaigns() public {
        address c2 = factory.createCampaign(recipient, 5 ether, startTime, endTime, "ipfs://c2");
        address c3 = factory.createCampaign(recipient, 20 ether, startTime, endTime, "ipfs://c3");

        assertEq(factory.getCampaignCount(), 3); // 1 from setUp + 2
        assertTrue(factory.isCampaign(c2));
        assertTrue(factory.isCampaign(c3));
    }

    function test_factory_get_all_campaigns() public {
        factory.createCampaign(recipient, 5 ether, startTime, endTime, "");
        address[] memory all = factory.getAllCampaigns();
        assertEq(all.length, 2);
        assertEq(all[0], address(campaign));
    }

    function test_factory_multiple_creators() public {
        vm.prank(donor1);
        factory.createCampaign(recipient, 1 ether, startTime, endTime, "");
        vm.prank(donor2);
        factory.createCampaign(recipient, 2 ether, startTime, endTime, "");
        vm.prank(donor1);
        factory.createCampaign(recipient, 3 ether, startTime, endTime, "");

        assertEq(factory.getCreatorCampaigns(donor1).length, 2);
        assertEq(factory.getCreatorCampaigns(donor2).length, 1);
    }

    function test_factory_campaign_created_event() public {
        vm.expectEmit(false, true, true, true);
        emit PharosCampaignFactory.CampaignCreated(
            address(0), // we don't know the address ahead of time
            address(this),
            recipient,
            5 ether,
            startTime,
            endTime,
            "ipfs://event-test"
        );
        factory.createCampaign(recipient, 5 ether, startTime, endTime, "ipfs://event-test");
    }

    function test_factory_fee_updated_event() public {
        vm.prank(feeCollector);
        vm.expectEmit(false, false, false, true);
        emit PharosCampaignFactory.FeeUpdated(100, 200);
        factory.setFee(200);
    }

    function test_factory_set_fee_not_collector_reverts() public {
        vm.prank(donor1);
        vm.expectRevert(FeeCollectible.OnlyFeeCollector.selector);
        factory.setFee(50);
    }

    function test_factory_start_time_equals_end_time_reverts() public {
        vm.expectRevert(PharosCampaignFactory.InvalidTiming.selector);
        factory.createCampaign(recipient, 1 ether, startTime, startTime, "");
    }

    function test_factory_start_time_in_past_reverts() public {
        vm.warp(1000);
        vm.expectRevert(PharosCampaignFactory.InvalidTiming.selector);
        factory.createCampaign(recipient, 1 ether, 999, 2000, "");
    }

    // ═══════════════════════════════════════════════════════
    // ——— Donation Edge Cases ——————————————————————————————
    // ═══════════════════════════════════════════════════════

    function test_donate_same_donor_accumulates() public {
        vm.warp(startTime);
        vm.startPrank(donor1);
        campaign.donate{value: 1 ether}();
        campaign.donate{value: 2 ether}();
        campaign.donate{value: 3 ether}();
        vm.stopPrank();

        assertEq(campaign.donations(donor1), 6 ether);
        assertEq(campaign.totalRaised(), 6 ether);
        // Donor should only appear once in the donor list
        assertEq(campaign.getPublicDonorCount(), 1);
    }

    function test_donate_exact_goal() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        assertEq(campaign.totalRaised(), fundingGoal);
    }

    function test_donate_over_goal_allowed() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal + 5 ether}();

        assertEq(campaign.totalRaised(), fundingGoal + 5 ether);
    }

    function test_donate_event_emitted() public {
        vm.warp(startTime);
        vm.prank(donor1);
        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.DonationReceived(donor1, 2 ether);
        campaign.donate{value: 2 ether}();
    }

    function test_donate_at_exact_start_time() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 1 ether}();
        assertEq(campaign.totalRaised(), 1 ether);
    }

    function test_donate_at_exact_end_time() public {
        vm.warp(endTime);
        vm.prank(donor1);
        campaign.donate{value: 1 ether}();
        assertEq(campaign.totalRaised(), 1 ether);
    }

    function test_receive_zero_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        // Low-level call catches revert and returns false
        (bool ok,) = address(campaign).call{value: 0}("");
        assertFalse(ok);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Shielded Donation Edge Cases —————————————————————
    // ═══════════════════════════════════════════════════════

    function test_shielded_donation_zero_amount_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.ZeroAmount.selector);
        campaign.donateShielded{value: 0}(bytes32(0));
    }

    function test_shielded_donation_before_start_reverts() public {
        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.CampaignNotActive.selector);
        campaign.donateShielded{value: 1 ether}(bytes32(0));
    }

    function test_shielded_donation_after_end_reverts() public {
        vm.warp(endTime + 1);
        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.CampaignNotActive.selector);
        campaign.donateShielded{value: 1 ether}(bytes32(0));
    }

    function test_multiple_shielded_donations() public {
        vm.warp(startTime);

        vm.prank(donor1);
        campaign.donateShielded{value: 1 ether}(bytes32(0));
        vm.prank(donor2);
        campaign.donateShielded{value: 2 ether}(bytes32(0));

        assertEq(campaign.shieldedDonationCount(), 2);
        assertEq(campaign.shieldedDonationTotal(), 3 ether);
        assertEq(campaign.totalRaised(), 3 ether);
    }

    function test_shielded_donation_event() public {
        vm.warp(startTime);
        vm.prank(donor1);
        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.ShieldedDonationReceived(1, 3 ether);
        campaign.donateShielded{value: 3 ether}(bytes32(0));
    }

    function test_donor_count_includes_shielded() public {
        vm.warp(startTime);

        vm.prank(donor1);
        campaign.donate{value: 1 ether}();
        vm.prank(donor2);
        campaign.donateShielded{value: 1 ether}(bytes32(0));
        vm.prank(donor3);
        campaign.donateShielded{value: 1 ether}(bytes32(0));

        // getDonorCount = public donors + shielded count
        assertEq(campaign.getDonorCount(), 3);
        assertEq(campaign.getPublicDonorCount(), 1);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Finalization Edge Cases ——————————————————————————
    // ═══════════════════════════════════════════════════════

    function test_finalize_exactly_at_goal() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        vm.warp(endTime + 1);
        campaign.finalize();

        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Successful));
    }

    function test_finalize_one_wei_below_goal() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal - 1}();

        vm.warp(endTime + 1);
        campaign.finalize();

        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Failed));
    }

    function test_finalize_event_successful() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        vm.warp(endTime + 1);
        vm.expectEmit(false, false, false, true);
        emit PharosCampaign.CampaignFinalized(PharosCampaign.Status.Successful, fundingGoal);
        campaign.finalize();
    }

    function test_finalize_event_failed() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 1 ether}();

        vm.warp(endTime + 1);
        vm.expectEmit(false, false, false, true);
        emit PharosCampaign.CampaignFinalized(PharosCampaign.Status.Failed, 1 ether);
        campaign.finalize();
    }

    function test_finalize_no_donations() public {
        vm.warp(endTime + 1);
        campaign.finalize();

        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Failed));
        assertEq(campaign.totalRaised(), 0);
    }

    function test_finalize_anyone_can_call() public {
        vm.warp(endTime + 1);
        vm.prank(address(0xDEAD)); // random address
        campaign.finalize();

        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Failed));
    }

    // ═══════════════════════════════════════════════════════
    // ——— Claim Funds Edge Cases ——————————————————————————
    // ═══════════════════════════════════════════════════════

    function test_claim_when_failed_reverts() public {
        vm.warp(endTime + 1);
        campaign.finalize();

        vm.expectRevert(PharosCampaign.CampaignNotSuccessful.selector);
        campaign.claimFunds();
    }

    function test_claim_when_active_reverts() public {
        vm.warp(startTime);
        vm.expectRevert(PharosCampaign.CampaignNotSuccessful.selector);
        campaign.claimFunds();
    }

    function test_claim_funds_event() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();

        uint256 feeAmount = (fundingGoal * feeBps) / 10000;
        uint256 recipientAmount = fundingGoal - feeAmount;

        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.FundsClaimed(recipient, recipientAmount);
        campaign.claimFunds();
    }

    function test_claim_anyone_can_trigger() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();

        // Anyone can call claimFunds, not just the recipient
        uint256 balBefore = recipient.balance;
        vm.prank(address(0xDEAD));
        campaign.claimFunds();

        assertTrue(recipient.balance > balBefore);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Fee Collection Edge Cases ————————————————————————
    // ═══════════════════════════════════════════════════════

    function test_collect_fee_not_collector_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();
        campaign.claimFunds();

        vm.prank(donor1);
        vm.expectRevert(FeeCollectible.OnlyFeeCollector.selector);
        campaign.collectFee();
    }

    function test_collect_fee_twice_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();
        campaign.claimFunds();

        vm.prank(feeCollector);
        campaign.collectFee();

        vm.prank(feeCollector);
        vm.expectRevert(PharosCampaign.AlreadyClaimed.selector);
        campaign.collectFee();
    }

    function test_collect_fee_when_failed_reverts() public {
        vm.warp(endTime + 1);
        campaign.finalize();

        vm.prank(feeCollector);
        vm.expectRevert(PharosCampaign.CampaignNotSuccessful.selector);
        campaign.collectFee();
    }

    function test_collect_fee_event() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();
        campaign.claimFunds();

        uint256 feeAmount = (fundingGoal * feeBps) / 10000;

        vm.prank(feeCollector);
        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.FeeCollected(feeCollector, feeAmount);
        campaign.collectFee();
    }

    function test_fee_plus_recipient_equals_total() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();

        uint256 recipientBefore = recipient.balance;
        uint256 feeBefore = feeCollector.balance;

        campaign.claimFunds();
        vm.prank(feeCollector);
        campaign.collectFee();

        uint256 recipientReceived = recipient.balance - recipientBefore;
        uint256 feeReceived = feeCollector.balance - feeBefore;

        assertEq(recipientReceived + feeReceived, fundingGoal);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Refund Edge Cases ————————————————————————————————
    // ═══════════════════════════════════════════════════════

    function test_refund_when_active_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 1 ether}();

        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.CampaignNotFailed.selector);
        campaign.refund();
    }

    function test_refund_when_successful_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();

        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.CampaignNotFailed.selector);
        campaign.refund();
    }

    function test_refund_twice_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 3 ether}();
        vm.warp(endTime + 1);
        campaign.finalize();

        vm.prank(donor1);
        campaign.refund();
        // Second refund should fail since donation is zeroed
        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.NoDonation.selector);
        campaign.refund();
    }

    function test_refund_event() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 3 ether}();
        vm.warp(endTime + 1);
        campaign.finalize();

        vm.prank(donor1);
        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.RefundClaimed(donor1, 3 ether);
        campaign.refund();
    }

    function test_batch_refund_no_donors() public {
        vm.warp(endTime + 1);
        campaign.finalize();

        // Should succeed without reverting even with no donors
        campaign.batchRefund();
    }

    function test_batch_refund_after_individual_refunds() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 2 ether}();
        vm.prank(donor2);
        campaign.donate{value: 3 ether}();
        vm.warp(endTime + 1);
        campaign.finalize();

        // donor1 refunds individually first
        vm.prank(donor1);
        campaign.refund();

        // Batch refund should only refund donor2
        uint256 bal2Before = donor2.balance;
        campaign.batchRefund();
        assertEq(donor2.balance - bal2Before, 3 ether);
    }

    function test_batch_refund_when_active_reverts() public {
        vm.warp(startTime);
        vm.expectRevert(PharosCampaign.CampaignNotFailed.selector);
        campaign.batchRefund();
    }

    // ═══════════════════════════════════════════════════════
    // ——— Shielded Refund Edge Cases ———————————————————————
    // ═══════════════════════════════════════════════════════

    function test_refund_shielded_when_active_reverts() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("s");
        bytes32 nullifier = keccak256("n");
        uint256 amount = 1 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);

        // Campaign still active
        vm.expectRevert(PharosCampaign.CampaignNotFailed.selector);
        campaign.refundShielded(commitment, secret, nullifier, payable(donor1));
    }

    function test_refund_shielded_wrong_nullifier() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("s");
        bytes32 nullifier = keccak256("n");
        uint256 amount = 1 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);

        vm.warp(endTime + 1);
        campaign.finalize();

        bytes32 wrongNullifier = keccak256("wrong");
        vm.expectRevert(PharosCampaign.InvalidCommitment.selector);
        campaign.refundShielded(commitment, secret, wrongNullifier, payable(donor1));
    }

    function test_refund_shielded_event() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("s");
        bytes32 nullifier = keccak256("n");
        uint256 amount = 2 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);
        vm.warp(endTime + 1);
        campaign.finalize();

        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.ShieldedRefundClaimed(commitment, amount);
        campaign.refundShielded(commitment, secret, nullifier, payable(donor1));
    }

    function test_refund_shielded_to_different_address() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("s");
        bytes32 nullifier = keccak256("n");
        uint256 amount = 5 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);
        vm.warp(endTime + 1);
        campaign.finalize();

        // Refund to a completely different address than the donor
        address payable altAddr = payable(address(0x1234));
        campaign.refundShielded(commitment, secret, nullifier, altAddr);
        assertEq(altAddr.balance, amount);
    }

    function test_shielded_no_commitment_cannot_refund() public {
        vm.warp(startTime);

        // Donate shielded with no commitment (bytes32(0))
        vm.prank(donor1);
        campaign.donateShielded{value: 1 ether}(bytes32(0));

        vm.warp(endTime + 1);
        campaign.finalize();

        // Cannot refund because commitment was bytes32(0), which was not stored
        vm.expectRevert(PharosCampaign.NoDonation.selector);
        campaign.refundShielded(bytes32(0), bytes32(0), bytes32(0), payable(donor1));
    }

    // ═══════════════════════════════════════════════════════
    // ——— Milestone Match Edge Cases ——————————————————————
    // ═══════════════════════════════════════════════════════

    function test_milestone_match_value_mismatch_reverts() public {
        vm.warp(startTime);
        vm.prank(matcher1);
        vm.expectRevert(PharosCampaign.ZeroAmount.selector);
        // Sending 3 ether but claiming 5 ether match
        campaign.createMilestoneMatch{value: 3 ether}(
            8 ether, 5 ether, false, bytes32(0)
        );
    }

    function test_milestone_match_when_ended_reverts() public {
        vm.warp(endTime + 1);
        // Finalize first so status changes
        campaign.finalize();

        vm.prank(matcher1);
        vm.expectRevert(PharosCampaign.CampaignNotActive.selector);
        campaign.createMilestoneMatch{value: 1 ether}(
            5 ether, 1 ether, false, bytes32(0)
        );
    }

    function test_private_match_needs_commitment() public {
        vm.warp(startTime);
        vm.prank(matcher1);
        vm.expectRevert(PharosCampaign.InvalidCommitment.selector);
        campaign.createMilestoneMatch{value: 1 ether}(
            5 ether, 1 ether, true, bytes32(0)
        );
    }

    function test_milestone_match_event() public {
        vm.warp(startTime);
        vm.prank(matcher1);
        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.MilestoneMatchCreated(0, 5 ether, 3 ether, false);
        campaign.createMilestoneMatch{value: 3 ether}(
            5 ether, 3 ether, false, bytes32(0)
        );
    }

    function test_milestone_activation_event() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 3 ether}(
            5 ether, 3 ether, false, bytes32(0)
        );

        vm.prank(donor1);
        vm.expectEmit(true, false, false, false);
        emit PharosCampaign.MilestoneActivated(0);
        campaign.donate{value: 5 ether}();
    }

    function test_multiple_milestones_cascade() public {
        vm.warp(startTime);

        // Milestone 1: activates at 3 ether raised, adds 1 ether
        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 1 ether}(
            3 ether, 1 ether, false, bytes32(0)
        );

        // Milestone 2: activates at 4 ether raised, adds 2 ether
        vm.prank(matcher2);
        campaign.createMilestoneMatch{value: 2 ether}(
            4 ether, 2 ether, false, bytes32(0)
        );

        // Donate 3 ether → triggers milestone 1 (now total = 4) → triggers milestone 2 (now total = 6)
        vm.prank(donor1);
        campaign.donate{value: 3 ether}();

        // 3 (donation) + 1 (milestone 1) + 2 (milestone 2) = 6
        assertEq(campaign.totalRaised(), 6 ether);
        assertEq(campaign.totalMatchFunds(), 0); // all activated
    }

    function test_milestone_not_activated_below_threshold() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 3 ether}(
            8 ether, 3 ether, false, bytes32(0)
        );

        vm.prank(donor1);
        campaign.donate{value: 2 ether}();

        // Only donation counted, milestone not activated
        assertEq(campaign.totalRaised(), 2 ether);
        assertEq(campaign.totalMatchFunds(), 3 ether);
    }

    function test_refund_activated_match_reverts() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 3 ether}(
            5 ether, 3 ether, false, bytes32(0)
        );

        // Trigger milestone activation
        vm.prank(donor1);
        campaign.donate{value: 5 ether}();

        vm.warp(endTime + 1);
        campaign.finalize(); // Succeeds with 8 ether

        // Can't refund an activated match
        vm.expectRevert(PharosCampaign.MatchNotFunded.selector);
        campaign.refundMatch(0);
    }

    function test_match_refund_event() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 5 ether}(
            8 ether, 5 ether, false, bytes32(0)
        );

        vm.warp(endTime + 1);
        campaign.finalize();

        vm.expectEmit(true, false, false, true);
        emit PharosCampaign.MatchRefunded(0, 5 ether);
        campaign.refundMatch(0);
    }

    function test_refund_match_twice_reverts() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 5 ether}(
            8 ether, 5 ether, false, bytes32(0)
        );

        vm.warp(endTime + 1);
        campaign.finalize();

        campaign.refundMatch(0);

        vm.expectRevert(PharosCampaign.MatchNotFunded.selector);
        campaign.refundMatch(0);
    }

    function test_get_activated_match_total() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 2 ether}(
            3 ether, 2 ether, false, bytes32(0)
        );
        vm.prank(matcher2);
        campaign.createMilestoneMatch{value: 4 ether}(
            9 ether, 4 ether, false, bytes32(0)
        );

        // Activate only first milestone
        vm.prank(donor1);
        campaign.donate{value: 3 ether}();

        assertEq(campaign.getActivatedMatchTotal(), 2 ether);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Mixed Public + Shielded Scenario —————————————————
    // ═══════════════════════════════════════════════════════

    function test_mixed_donations_reach_goal() public {
        vm.warp(startTime);

        // 6 ether public
        vm.prank(donor1);
        campaign.donate{value: 6 ether}();

        // 4 ether shielded
        vm.prank(donor2);
        campaign.donateShielded{value: 4 ether}(bytes32(0));

        assertEq(campaign.totalRaised(), 10 ether);

        vm.warp(endTime + 1);
        campaign.finalize();
        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Successful));
    }

    function test_milestone_activation_from_shielded_donation() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 2 ether}(
            5 ether, 2 ether, false, bytes32(0)
        );

        // Shielded donation triggers milestone
        vm.prank(donor1);
        campaign.donateShielded{value: 5 ether}(bytes32(0));

        // 5 (shielded) + 2 (milestone) = 7
        assertEq(campaign.totalRaised(), 7 ether);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Full Lifecycle Integration Test ——————————————————
    // ═══════════════════════════════════════════════════════

    function test_full_successful_lifecycle() public {
        vm.warp(startTime);

        // 1. Matcher sets a milestone
        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 3 ether}(
            7 ether, 3 ether, false, bytes32(0)
        );

        // 2. Public donation
        vm.prank(donor1);
        campaign.donate{value: 5 ether}();

        // 3. Shielded donation pushes past threshold
        bytes32 secret = keccak256("lifecycle_secret");
        bytes32 nullifier = keccak256("lifecycle_null");
        uint256 shieldedAmt = 2 ether;
        bytes32 commitment = keccak256(abi.encodePacked(shieldedAmt, secret, nullifier));

        vm.prank(donor2);
        campaign.donateShielded{value: shieldedAmt}(commitment);

        // totalRaised = 5 + 2 + 3(activated) = 10
        assertEq(campaign.totalRaised(), fundingGoal);

        // 4. Finalize
        vm.warp(endTime + 1);
        campaign.finalize();
        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Successful));

        // 5. Claim funds
        uint256 recipientBefore = recipient.balance;
        campaign.claimFunds();

        uint256 feeAmount = (fundingGoal * feeBps) / 10000;
        assertEq(recipient.balance - recipientBefore, fundingGoal - feeAmount);

        // 6. Collect fee
        uint256 feeBefore = feeCollector.balance;
        vm.prank(feeCollector);
        campaign.collectFee();
        assertEq(feeCollector.balance - feeBefore, feeAmount);

        // 7. Contract should be drained (only unactivated match funds remain, but all were activated)
        assertEq(address(campaign).balance, 0);
    }

    function test_full_failed_lifecycle_with_refunds() public {
        vm.warp(startTime);

        // 1. Matcher sets a milestone (won't activate)
        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 3 ether}(
            9 ether, 3 ether, false, bytes32(0)
        );

        // 2. Donations that don't reach the goal
        vm.prank(donor1);
        campaign.donate{value: 2 ether}();

        bytes32 secret = keccak256("fail_secret");
        bytes32 nullifier = keccak256("fail_null");
        uint256 shieldedAmt = 1 ether;
        bytes32 commitment = keccak256(abi.encodePacked(shieldedAmt, secret, nullifier));

        vm.prank(donor2);
        campaign.donateShielded{value: shieldedAmt}(commitment);

        // totalRaised = 3 (milestone not activated since < 9)
        assertEq(campaign.totalRaised(), 3 ether);

        // 3. Finalize as failed
        vm.warp(endTime + 1);
        campaign.finalize();
        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Failed));

        // 4. Public refund
        uint256 bal1Before = donor1.balance;
        vm.prank(donor1);
        campaign.refund();
        assertEq(donor1.balance - bal1Before, 2 ether);

        // 5. Shielded refund
        address payable refundAddr = payable(address(0xAAAA));
        campaign.refundShielded(commitment, secret, nullifier, refundAddr);
        assertEq(refundAddr.balance, shieldedAmt);

        // 6. Match refund
        uint256 matcherBefore = matcher1.balance;
        campaign.refundMatch(0);
        assertEq(matcher1.balance - matcherBefore, 3 ether);

        // 7. Contract should be drained
        assertEq(address(campaign).balance, 0);
    }

    // ═══════════════════════════════════════════════════════
    // ——— Fuzz Tests ———————————————————————————————————————
    // ═══════════════════════════════════════════════════════

    function testFuzz_donate_any_amount(uint256 amount) public {
        amount = bound(amount, 1, 1000 ether);
        vm.deal(donor1, amount);

        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: amount}();

        assertEq(campaign.totalRaised(), amount);
        assertEq(campaign.donations(donor1), amount);
    }

    function testFuzz_shielded_commitment_unique(bytes32 secret, bytes32 nullifier) public {
        vm.assume(secret != bytes32(0) && nullifier != bytes32(0));
        uint256 amount = 1 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);

        assertEq(campaign.shieldedCommitments(commitment), amount);

        // Fail the campaign and verify refund works
        vm.warp(endTime + 1);
        campaign.finalize();

        address payable refundAddr = payable(address(0xBBBB));
        campaign.refundShielded(commitment, secret, nullifier, refundAddr);
        assertEq(refundAddr.balance, amount);
    }

    function testFuzz_fee_calculation(uint16 _feeBps) public {
        _feeBps = uint16(bound(_feeBps, 0, 1000));

        PharosCampaignFactory f = new PharosCampaignFactory(feeCollector, _feeBps);

        uint256 _startTime = block.timestamp + 1;
        uint256 _endTime = block.timestamp + 7 days;
        address cAddr = f.createCampaign(recipient, fundingGoal, _startTime, _endTime, "");
        PharosCampaign c = PharosCampaign(payable(cAddr));

        vm.warp(_startTime);
        vm.prank(donor1);
        c.donate{value: fundingGoal}();

        vm.warp(_endTime + 1);
        c.finalize();

        uint256 recipientBefore = recipient.balance;
        uint256 feeBefore = feeCollector.balance;

        c.claimFunds();
        vm.prank(feeCollector);
        c.collectFee();

        uint256 recipientReceived = recipient.balance - recipientBefore;
        uint256 feeReceived = feeCollector.balance - feeBefore;

        // Invariant: fee + recipient = total raised
        assertEq(recipientReceived + feeReceived, fundingGoal);
        // Invariant: fee = totalRaised * feeBps / 10000
        assertEq(feeReceived, (fundingGoal * _feeBps) / 10000);
    }

    function testFuzz_multiple_donors_total(uint256 a1, uint256 a2, uint256 a3) public {
        a1 = bound(a1, 1, 100 ether);
        a2 = bound(a2, 1, 100 ether);
        a3 = bound(a3, 1, 100 ether);

        vm.deal(donor1, a1);
        vm.deal(donor2, a2);
        vm.deal(donor3, a3);

        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: a1}();
        vm.prank(donor2);
        campaign.donate{value: a2}();
        vm.prank(donor3);
        campaign.donate{value: a3}();

        assertEq(campaign.totalRaised(), a1 + a2 + a3);
        assertEq(campaign.getPublicDonorCount(), 3);
    }

    function testFuzz_refund_returns_exact_amount(uint256 amount) public {
        // Keep amount below funding goal so campaign fails
        amount = bound(amount, 1, fundingGoal - 1);
        vm.deal(donor1, amount);

        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: amount}();

        vm.warp(endTime + 1);
        campaign.finalize();
        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Failed));

        uint256 balBefore = donor1.balance;
        vm.prank(donor1);
        campaign.refund();

        assertEq(donor1.balance - balBefore, amount);
    }

    function testFuzz_milestone_threshold(uint256 threshold, uint256 matchAmt, uint256 donateAmt) public {
        threshold = bound(threshold, 1, 50 ether);
        matchAmt = bound(matchAmt, 1, 50 ether);
        donateAmt = bound(donateAmt, 1, 50 ether);

        vm.deal(matcher1, matchAmt);
        vm.deal(donor1, donateAmt);

        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: matchAmt}(
            threshold, matchAmt, false, bytes32(0)
        );

        vm.prank(donor1);
        campaign.donate{value: donateAmt}();

        if (donateAmt >= threshold) {
            // Milestone should have activated
            assertEq(campaign.totalRaised(), donateAmt + matchAmt);
            assertEq(campaign.totalMatchFunds(), 0);
        } else {
            // Milestone should not have activated
            assertEq(campaign.totalRaised(), donateAmt);
            assertEq(campaign.totalMatchFunds(), matchAmt);
        }
    }
}
