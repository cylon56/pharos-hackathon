// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PharosCampaignTestable} from "../src/PharosCampaignTestable.sol";

/// @notice Deploys 3 testable demo campaigns and registers each in the factory.
///         These campaigns have no time restrictions and support instant finalize/refund.
contract DeployTestCampaigns is Script {
    address constant USDC         = 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea;
    address constant FEE_COLLECTOR = 0xfe51689D53F9dA89b9147f0E09dd122399870E77;
    uint16  constant FEE_BPS      = 100; // 1%

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        uint256 startTime = block.timestamp;
        uint256 endTime   = block.timestamp + 365 days; // far future

        // ── Campaign 1: Coin Center Legal Defense Fund ────────────────────
        // Goal: 2,000,000 USDC (6 decimals) = 2_000_000 * 10^6
        PharosCampaignTestable c1 = new PharosCampaignTestable(
            USDC,
            deployer,
            2_000_000_000_000,
            startTime,
            endTime,
            FEE_BPS,
            FEE_COLLECTOR,
            '{"title":"Coin Center Legal Defense Fund","description":"Support Coin Center\'s legal advocacy for sensible cryptocurrency regulation. Funds will be used to file amicus briefs and support litigation defending digital asset users\' rights.","category":"Advocacy"}'
        );

        // ── Campaign 2: Open Source Privacy Tools Grant ───────────────────
        // Goal: 1,000,000 USDC (6 decimals) = 1_000_000 * 10^6
        PharosCampaignTestable c2 = new PharosCampaignTestable(
            USDC,
            deployer,
            1_000_000_000_000,
            startTime,
            endTime,
            FEE_BPS,
            FEE_COLLECTOR,
            '{"title":"Open Source Privacy Tools Grant","description":"Fund development of open-source privacy tools for the Monad ecosystem. Goal: build a Monad-native mixer and encrypted memo system.","category":"Development"}'
        );

        // ── Campaign 3: Monad Developer Education Hub ─────────────────────
        // Goal: 500,000 USDC (6 decimals) = 500_000 * 10^6
        PharosCampaignTestable c3 = new PharosCampaignTestable(
            USDC,
            deployer,
            500_000_000_000,
            startTime,
            endTime,
            FEE_BPS,
            FEE_COLLECTOR,
            '{"title":"Monad Developer Education Hub","description":"Create comprehensive educational resources for developers building on Monad. Includes tutorials, workshops, and documentation.","category":"Education"}'
        );

        vm.stopBroadcast();

        console.log("=== Testable Demo Campaigns Deployed ===");
        console.log("Campaign 1 (Coin Center):    ", address(c1));
        console.log("Campaign 2 (Privacy Tools):  ", address(c2));
        console.log("Campaign 3 (Education Hub):  ", address(c3));
        console.log("");
        console.log("Update frontend/src/app/page.tsx DEMO_CAMPAIGNS addresses:");
        console.log("  0x1 =>", address(c1));
        console.log("  0x2 =>", address(c2));
        console.log("  0x3 =>", address(c3));
    }
}
