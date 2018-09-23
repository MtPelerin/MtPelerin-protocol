pragma solidity ^0.4.24;

import "./LockableSig.sol";
import "./DelegateSig.sol";


/**
 * @title ProcessSig
 * @dev ProcessSig contract
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * @notice Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * @notice This content cannot be used, copied or reproduced in part or in whole
 * @notice without the express and written permission of Mt Pelerin Group SA.
 * @notice Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * @notice All matters regarding the intellectual property of this code or software
 * @notice are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 * Error messages
 * E01: ETH transfers not allowed
 */
contract ProcessSig is DelegateSig, LockableSig {

  /**
   * @dev fallback function
   */
  constructor(address[] _addresses, uint8 _threshold) public
    LockableSig(_addresses, _threshold)
  {
  }

  /**
   * @dev fallback function
   */
  function () public payable {
    revert("E01");
  }
}
