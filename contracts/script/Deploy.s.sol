// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PharosCampaignFactory} from "../src/PharosCampaignFactory.sol";

contract DeployPharos is Script {
    // USDC on Monad testnet (6 decimals)
    address constant USDC = 0xf817257fed379853cDe0fa4F97AB987181B1E5Ea;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR_ADDRESS");
        uint16 feeBasisPoints = 100; // 1%

        vm.startBroadcast(deployerPrivateKey);

        PharosCampaignFactory factory = new PharosCampaignFactory(
            USDC,
            feeCollector,
            feeBasisPoints
        );

        console.log("PharosCampaignFactory deployed at:", address(factory));
        console.log("Token (USDC):", USDC);

        vm.stopBroadcast();
    }
}
