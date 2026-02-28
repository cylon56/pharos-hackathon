// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title FeeCollectible - Base contract for fee collector role management
/// @notice Provides transferable fee collector role
abstract contract FeeCollectible {
    address public feeCollector;

    event FeeCollectorTransferred(address indexed previousCollector, address indexed newCollector);

    error OnlyFeeCollector();
    error ZeroAddress();

    modifier onlyFeeCollector() {
        if (msg.sender != feeCollector) revert OnlyFeeCollector();
        _;
    }

    constructor(address _feeCollector) {
        if (_feeCollector == address(0)) revert ZeroAddress();
        feeCollector = _feeCollector;
    }

    function transferFeeCollector(address _newCollector) external onlyFeeCollector {
        if (_newCollector == address(0)) revert ZeroAddress();
        emit FeeCollectorTransferred(feeCollector, _newCollector);
        feeCollector = _newCollector;
    }
}
