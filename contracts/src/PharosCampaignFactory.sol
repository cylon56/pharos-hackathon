// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FeeCollectible} from "./FeeCollectible.sol";
import {PharosCampaign} from "./PharosCampaign.sol";

/// @title PharosCampaignFactory - Deploys and tracks campaign instances
contract PharosCampaignFactory is FeeCollectible {

    address public immutable token;
    uint16 public feeBasisPoints;

    address[] public campaigns;
    mapping(address => bool) public isCampaign;
    mapping(address => address[]) public creatorCampaigns;

    event CampaignCreated(
        address indexed campaign,
        address indexed creator,
        address indexed recipient,
        uint256 fundingGoal,
        uint256 startTime,
        uint256 endTime,
        string metadataURI
    );
    event FeeUpdated(uint16 oldFee, uint16 newFee);

    error InvalidTiming();
    error FeeTooHigh();

    constructor(address _token, address _feeCollector, uint16 _feeBasisPoints) FeeCollectible(_feeCollector) {
        if (_feeBasisPoints > 1000) revert FeeTooHigh();
        token = _token;
        feeBasisPoints = _feeBasisPoints;
    }

    function setFee(uint16 _feeBasisPoints) external onlyFeeCollector {
        if (_feeBasisPoints > 1000) revert FeeTooHigh();
        emit FeeUpdated(feeBasisPoints, _feeBasisPoints);
        feeBasisPoints = _feeBasisPoints;
    }

    function createCampaign(
        address _recipient,
        uint256 _fundingGoal,
        uint256 _startTime,
        uint256 _endTime,
        string calldata _metadataURI
    ) external returns (address) {
        if (_endTime <= _startTime) revert InvalidTiming();
        if (_startTime < block.timestamp) revert InvalidTiming();

        PharosCampaign campaign = new PharosCampaign(
            token,
            _recipient,
            _fundingGoal,
            _startTime,
            _endTime,
            feeBasisPoints,
            feeCollector,
            _metadataURI
        );

        address campaignAddr = address(campaign);
        campaigns.push(campaignAddr);
        isCampaign[campaignAddr] = true;
        creatorCampaigns[msg.sender].push(campaignAddr);

        emit CampaignCreated(
            campaignAddr,
            msg.sender,
            _recipient,
            _fundingGoal,
            _startTime,
            _endTime,
            _metadataURI
        );

        return campaignAddr;
    }

    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    function getCreatorCampaigns(address creator) external view returns (address[] memory) {
        return creatorCampaigns[creator];
    }

    function getAllCampaigns() external view returns (address[] memory) {
        return campaigns;
    }
}
