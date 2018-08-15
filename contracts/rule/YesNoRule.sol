pragma solidity ^0.4.24;

import "../interface/IRule.sol";


/**
 * @title YesNoRule
 * @dev YesNoRule interface
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * The rule always answer the same response through isValid
 * Usefull for testing IWithRule implementation
*/
contract YesNoRule is IRule {
  bool public yesNo;

  constructor(bool _yesNo) public {
    yesNo = _yesNo;
  }

  function isAddressValid(address /* _from */) public view returns (bool) {
    return yesNo;
  }

  function isTransferValid(
    address /* _from */,
    address /*_to */,
    uint256 /*_amount */)
    public view returns (bool)
  {
    return yesNo;
  }
}
