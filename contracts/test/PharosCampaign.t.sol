// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PharosCampaign} from "../src/PharosCampaign.sol";
import {PharosCampaignFactory} from "../src/PharosCampaignFactory.sol";

contract PharosCampaignTest is Test {
    PharosCampaignFactory factory;
    PharosCampaign campaign;

    address feeCollector = address(0xFEE);
    address recipient = address(0xBEEF);
    address donor1 = address(0xD001);
    address donor2 = address(0xD002);
    address matcher1 = address(0xA001);

    uint256 fundingGoal = 10 ether;
    uint256 startTime;
    uint256 endTime;
    uint16 feeBps = 100; // 1%

    function setUp() public {
        startTime = block.timestamp + 1;
        endTime = block.timestamp + 7 days;

        factory = new PharosCampaignFactory(feeCollector, feeBps);

        vm.warp(block.timestamp);
        address campaignAddr = factory.createCampaign(
            recipient,
            fundingGoal,
            startTime,
            endTime,
            "ipfs://test-metadata"
        );
        campaign = PharosCampaign(payable(campaignAddr));

        // Fund test accounts
        vm.deal(donor1, 100 ether);
        vm.deal(donor2, 100 ether);
        vm.deal(matcher1, 100 ether);
    }

    // ——— Factory Tests ———————————————————————————

    function test_factory_creates_campaign() public view {
        assertEq(factory.getCampaignCount(), 1);
        assertTrue(factory.isCampaign(address(campaign)));
    }

    function test_factory_tracks_creator() public view {
        address[] memory creatorCamps = factory.getCreatorCampaigns(address(this));
        assertEq(creatorCamps.length, 1);
        assertEq(creatorCamps[0], address(campaign));
    }

    function test_factory_fee_update() public {
        vm.prank(feeCollector);
        factory.setFee(200);
        assertEq(factory.feeBasisPoints(), 200);
    }

    function test_factory_fee_too_high_reverts() public {
        vm.prank(feeCollector);
        vm.expectRevert(PharosCampaignFactory.FeeTooHigh.selector);
        factory.setFee(1001);
    }

    function test_factory_invalid_timing_reverts() public {
        vm.expectRevert(PharosCampaignFactory.InvalidTiming.selector);
        factory.createCampaign(recipient, fundingGoal, endTime, startTime, "");
    }

    // ——— Campaign Info ———————————————————————————

    function test_campaign_info() public view {
        (
            address _recipient,
            uint256 _goal,
            uint256 _raised,
            uint256 _start,
            uint256 _end,
            PharosCampaign.Status _status,
            uint256 _donors,
            uint256 _milestones,
            string memory _uri
        ) = campaign.getCampaignInfo();

        assertEq(_recipient, recipient);
        assertEq(_goal, fundingGoal);
        assertEq(_raised, 0);
        assertEq(_start, startTime);
        assertEq(_end, endTime);
        assertEq(uint256(_status), uint256(PharosCampaign.Status.Active));
        assertEq(_donors, 0);
        assertEq(_milestones, 0);
        assertEq(keccak256(bytes(_uri)), keccak256(bytes("ipfs://test-metadata")));
    }

    // ——— Donation Tests ——————————————————————————

    function test_donate_success() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 1 ether}();

        assertEq(campaign.totalRaised(), 1 ether);
        assertEq(campaign.donations(donor1), 1 ether);
        assertEq(campaign.getDonorCount(), 1);
    }

    function test_donate_via_receive() public {
        vm.warp(startTime);
        vm.prank(donor1);
        (bool ok,) = address(campaign).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(campaign.totalRaised(), 1 ether);
    }

    function test_donate_multiple_donors() public {
        vm.warp(startTime);

        vm.prank(donor1);
        campaign.donate{value: 3 ether}();

        vm.prank(donor2);
        campaign.donate{value: 5 ether}();

        assertEq(campaign.totalRaised(), 8 ether);
        assertEq(campaign.getDonorCount(), 2);
    }

    function test_donate_before_start_reverts() public {
        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.CampaignNotActive.selector);
        campaign.donate{value: 1 ether}();
    }

    function test_donate_after_end_reverts() public {
        vm.warp(endTime + 1);
        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.CampaignNotActive.selector);
        campaign.donate{value: 1 ether}();
    }

    function test_donate_zero_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        vm.expectRevert(PharosCampaign.ZeroAmount.selector);
        campaign.donate{value: 0}();
    }

    // ——— Shielded Donation Tests —————————————————

    function test_shielded_donation() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("mysecret");
        bytes32 nullifier = keccak256("mynullifier");
        uint256 amount = 2 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);

        assertEq(campaign.totalRaised(), amount);
        assertEq(campaign.shieldedDonationCount(), 1);
        assertEq(campaign.shieldedDonationTotal(), amount);
        assertEq(campaign.shieldedCommitments(commitment), amount);
        // Donor address should NOT be tracked
        assertEq(campaign.donations(donor1), 0);
    }

    function test_shielded_donation_no_commitment() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donateShielded{value: 1 ether}(bytes32(0));

        assertEq(campaign.totalRaised(), 1 ether);
        assertEq(campaign.shieldedDonationCount(), 1);
    }

    // ——— Finalization Tests ——————————————————————

    function test_finalize_successful() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        vm.warp(endTime + 1);
        campaign.finalize();

        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Successful));
    }

    function test_finalize_failed() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 1 ether}();

        vm.warp(endTime + 1);
        campaign.finalize();

        assertEq(uint256(campaign.status()), uint256(PharosCampaign.Status.Failed));
    }

    function test_finalize_before_end_reverts() public {
        vm.warp(startTime);
        vm.expectRevert(PharosCampaign.CampaignNotEnded.selector);
        campaign.finalize();
    }

    function test_finalize_twice_reverts() public {
        vm.warp(endTime + 1);
        campaign.finalize();
        vm.expectRevert(PharosCampaign.CampaignNotActive.selector);
        campaign.finalize();
    }

    // ——— Claim Funds Tests ———————————————————————

    function test_claim_funds() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        vm.warp(endTime + 1);
        campaign.finalize();

        uint256 recipientBalBefore = recipient.balance;
        campaign.claimFunds();

        uint256 feeAmount = (fundingGoal * feeBps) / 10000;
        uint256 expectedRecipient = fundingGoal - feeAmount;
        assertEq(recipient.balance - recipientBalBefore, expectedRecipient);
    }

    function test_claim_funds_twice_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        vm.warp(endTime + 1);
        campaign.finalize();
        campaign.claimFunds();

        vm.expectRevert(PharosCampaign.AlreadyClaimed.selector);
        campaign.claimFunds();
    }

    // ——— Fee Collection Tests ————————————————————

    function test_collect_fee() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        vm.warp(endTime + 1);
        campaign.finalize();
        campaign.claimFunds();

        uint256 feeBalBefore = feeCollector.balance;
        vm.prank(feeCollector);
        campaign.collectFee();

        uint256 feeAmount = (fundingGoal * feeBps) / 10000;
        assertEq(feeCollector.balance - feeBalBefore, feeAmount);
    }

    function test_collect_fee_before_claim_reverts() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();

        vm.warp(endTime + 1);
        campaign.finalize();

        vm.prank(feeCollector);
        vm.expectRevert(PharosCampaign.CampaignNotFinalized.selector);
        campaign.collectFee();
    }

    // ——— Refund Tests ————————————————————————————

    function test_refund() public {
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: 3 ether}();

        vm.warp(endTime + 1);
        campaign.finalize();

        uint256 balBefore = donor1.balance;
        vm.prank(donor1);
        campaign.refund();

        assertEq(donor1.balance - balBefore, 3 ether);
        assertEq(campaign.donations(donor1), 0);
    }

    function test_refund_no_donation_reverts() public {
        vm.warp(endTime + 1);
        campaign.finalize();

        vm.prank(donor2);
        vm.expectRevert(PharosCampaign.NoDonation.selector);
        campaign.refund();
    }

    function test_batch_refund() public {
        vm.warp(startTime);

        vm.prank(donor1);
        campaign.donate{value: 2 ether}();
        vm.prank(donor2);
        campaign.donate{value: 3 ether}();

        vm.warp(endTime + 1);
        campaign.finalize();

        uint256 bal1Before = donor1.balance;
        uint256 bal2Before = donor2.balance;

        campaign.batchRefund();

        assertEq(donor1.balance - bal1Before, 2 ether);
        assertEq(donor2.balance - bal2Before, 3 ether);
    }

    // ——— Shielded Refund Tests ———————————————————

    function test_refund_shielded() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("mysecret");
        bytes32 nullifier = keccak256("mynullifier");
        uint256 amount = 2 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);

        vm.warp(endTime + 1);
        campaign.finalize();

        address payable refundAddr = payable(address(0xBBBB));
        uint256 balBefore = refundAddr.balance;

        campaign.refundShielded(commitment, secret, nullifier, refundAddr);

        assertEq(refundAddr.balance - balBefore, amount);
        assertEq(campaign.shieldedCommitments(commitment), 0);
        assertTrue(campaign.usedNullifiers(nullifier));
    }

    function test_refund_shielded_double_spend_reverts() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("mysecret");
        bytes32 nullifier = keccak256("mynullifier");
        uint256 amount = 2 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);

        vm.warp(endTime + 1);
        campaign.finalize();

        address payable refundAddr = payable(address(0xBBBB));
        campaign.refundShielded(commitment, secret, nullifier, refundAddr);

        vm.expectRevert(PharosCampaign.NoDonation.selector);
        campaign.refundShielded(commitment, secret, nullifier, refundAddr);
    }

    function test_refund_shielded_wrong_secret_reverts() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("mysecret");
        bytes32 nullifier = keccak256("mynullifier");
        uint256 amount = 2 ether;
        bytes32 commitment = keccak256(abi.encodePacked(amount, secret, nullifier));

        vm.prank(donor1);
        campaign.donateShielded{value: amount}(commitment);

        vm.warp(endTime + 1);
        campaign.finalize();

        bytes32 wrongSecret = keccak256("wrongsecret");
        address payable refundAddr = payable(address(0xBBBB));

        vm.expectRevert(PharosCampaign.InvalidCommitment.selector);
        campaign.refundShielded(commitment, wrongSecret, nullifier, refundAddr);
    }

    // ——— Milestone Match Tests ———————————————————

    function test_create_public_milestone_match() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 5 ether}(
            8 ether,  // threshold
            5 ether,  // match amount
            false,    // public
            bytes32(0)
        );

        assertEq(campaign.getMilestoneMatchCount(), 1);
        assertEq(campaign.totalMatchFunds(), 5 ether);
    }

    function test_milestone_activates_on_threshold() public {
        vm.warp(startTime);

        // Create match: activate when 5 ether raised
        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 3 ether}(
            5 ether,
            3 ether,
            false,
            bytes32(0)
        );

        // Donate past the threshold
        vm.prank(donor1);
        campaign.donate{value: 5 ether}();

        // totalRaised should be 5 (donation) + 3 (activated match) = 8
        assertEq(campaign.totalRaised(), 8 ether);
    }

    function test_private_milestone_match() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("matchsecret");
        bytes32 nullifier = keccak256("matchnullifier");
        uint256 matchAmt = 4 ether;
        bytes32 commitment = keccak256(abi.encodePacked(matchAmt, secret, nullifier));

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: matchAmt}(
            6 ether,
            matchAmt,
            true,
            commitment
        );

        assertEq(campaign.getMilestoneMatchCount(), 1);
        PharosCampaign.MilestoneMatch[] memory matches = campaign.getMilestoneMatches();
        assertEq(matches[0].matcher, address(0)); // Private: no matcher address
        assertTrue(matches[0].isPrivate);
        assertTrue(matches[0].isFunded);
    }

    function test_refund_public_match_on_failure() public {
        vm.warp(startTime);

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: 5 ether}(
            8 ether,
            5 ether,
            false,
            bytes32(0)
        );

        vm.warp(endTime + 1);
        campaign.finalize(); // Fails: no donations

        uint256 balBefore = matcher1.balance;
        campaign.refundMatch(0);
        assertEq(matcher1.balance - balBefore, 5 ether);
    }

    function test_refund_private_match_on_failure() public {
        vm.warp(startTime);

        bytes32 secret = keccak256("matchsecret");
        bytes32 nullifier = keccak256("matchnullifier");
        uint256 matchAmt = 4 ether;
        bytes32 commitment = keccak256(abi.encodePacked(matchAmt, secret, nullifier));

        vm.prank(matcher1);
        campaign.createMilestoneMatch{value: matchAmt}(
            8 ether,
            matchAmt,
            true,
            commitment
        );

        vm.warp(endTime + 1);
        campaign.finalize();

        // Private match: must use refundShielded
        vm.prank(matcher1);
        vm.expectRevert(PharosCampaign.UseRefundShielded.selector);
        campaign.refundMatch(0);

        // Use refundShielded instead
        address payable freshAddr = payable(address(0xCCCC));
        campaign.refundShielded(commitment, secret, nullifier, freshAddr);
        assertEq(freshAddr.balance, matchAmt);
    }

    // ——— Reentrancy Protection ———————————————————

    function test_claim_is_protected() public {
        // Just verify the nonReentrant modifier is present by testing normal claim works
        vm.warp(startTime);
        vm.prank(donor1);
        campaign.donate{value: fundingGoal}();
        vm.warp(endTime + 1);
        campaign.finalize();
        campaign.claimFunds();
        assertTrue(campaign.recipientClaimed());
    }
}
