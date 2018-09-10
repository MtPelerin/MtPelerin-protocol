pragma solidity ^0.4.24;

import "./IClaimable.sol";


/**
 * @title IWithClaims
 * @dev IWithClaims interface
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Mt Pelerin Group SA.
 * Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 **/
contract IWithClaims {
  function claimableLength() public view returns (uint256);
  function claimable(uint256 _claimableId) public view returns (IClaimable);
  function hasClaims(address _holder) public view returns (bool);
  function addClaimable(IClaimable _claimable) public;
  function addManyClaimables(IClaimable[] _claimables) public;
  function removeClaimable(uint256 _claimableId) public;

  event ClaimableAdded(uint256 claimableId);
  event ClaimableRemoved(uint256 claimableId);
}
