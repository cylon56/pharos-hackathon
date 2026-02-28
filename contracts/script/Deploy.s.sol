// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PharosCampaignFactory} from "../src/PharosCampaignFactory.sol";

contract DeployPharos is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR_ADDRESS");
        uint16 feeBasisPoints = 100; // 1%

        vm.startBroadcast(deployerPrivateKey);

        PharosCampaignFactory factory = new PharosCampaignFactory(
            feeCollector,
            feeBasisPoints
        );

        console.log("PharosCampaignFactory deployed at:", address(factory));

        vm.stopBroadcast();
    }
}
