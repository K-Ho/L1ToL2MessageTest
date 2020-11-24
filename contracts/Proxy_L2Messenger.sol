// SPDX-License-Identifier: UNLICENSED
pragma solidity >0.5.0 <0.6.0;
pragma experimental ABIEncoderV2;

/* Interface Imports */
import { iOVM_BaseCrossDomainMessenger } from "./iOVM_BaseCrossDomainMessenger.sol";

contract Proxy_L2Messenger {
    function sendMessage(
        address _target,
        bytes memory _message,
        uint32 _gasLimit
    ) public {
      address l2Messenger = 0x4200000000000000000000000000000000000007;
      iOVM_BaseCrossDomainMessenger(l2Messenger).sendMessage(
        _target,
        _message,
        _gasLimit
      );
    }
}
