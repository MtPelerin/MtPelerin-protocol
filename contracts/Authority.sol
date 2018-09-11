pragma solidity ^0.4.23;

import "./zeppelin/ownership/Ownable.sol";


/**
 * @title Authority
 * @dev The Authority contract has an authority address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 * Authority means to represent a legal entity that is entitled to specific rights
 *
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * @notice Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * @notice This content cannot be used, copied or reproduced in part or in whole
 * @notice without the express and written permission of Mt Pelerin Group SA.
 * @notice Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * @notice All matters regarding the intellectual property of this code or software
 * @notice are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */
contract Authority is Ownable {

  mapping(string => address) authorities;

  /**
   * @dev Throws if called by any account other than the authority.
   */
  modifier onlyAuthority(string _authority) {
    require(msg.sender == authorities[_authority]);
    _;
  }

  /**
   * @dev return the address associated to the authority _authority
   */
  function authorityAddress(string _authority) public view returns (address) {
    return authorities[_authority];
  }

  /**
   * @dev returns the authority of the
   * @param _name the authority name
   * @param _address the authority address.
   */
  function defineAuthority(string _name, address _address) public onlyOwner {
    emit AuthorityDefined(_name, _address);
    authorities[_name] = _address;
  }

  event AuthorityDefined(
    string name,
    address _address
  );
}
