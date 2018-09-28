pragma solidity ^0.4.24;

import "../../zeppelin/ownership/Ownable.sol";
import "../../zeppelin/math/SafeMath.sol";
import "./CMTAPocToken.sol";


/**
 * @title CMTAShareDistribution
 * @dev CMTAShareDistribution contract
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * @notice Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * @notice This content cannot be used, copied or reproduced in part or in whole
 * @notice without the express and written permission of Mt Pelerin Group SA.
 * @notice Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * @notice All matters regarding the intellectual property of this code or software
 * @notice are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 * @notice Swissquote Bank SA solely is entitled to the GNU LGPL.
 * @notice Any other party is subject to the copyright mentioned in the software.
 *
 * Error messages
 * E01: Agreement Hash must be defined
 * E02: Token must not be already configured
 * E03: Token must exists
 * E04: Token Agreement must be accepted
 * E05: Token owner must be this contract
 * E06: Same number of shareholders and amount must be provided
 * E07: All tokens must belong to this contract
 * E08: This contract must be KYCed for the distribution
 * E09: Allocations must be finished
 * E10: Sender must have tokens allocated
 * E11: Distribution hash must be signed by sender
 * E12: Unable to transfer tokens to holder
 * E13: Distribution must be over
 * E13: Sender must have a participation
 * E14: Unable to reclaim more than what available
 * E15: Unable to reclaim tokens
 */
contract CMTAShareDistribution is Ownable {
  using SafeMath for uint256;

  mapping(address => uint256) allocations;
  uint256 public totalAllocations;
  bool public allocationFinished;

  CMTAPocToken public token;

  bytes32 public agreementHash;
  uint256 public distributionEnd;

  /**
   * @dev constructor function
   */
  constructor(bytes32 _agreementHash, uint256 _distributionEnd) public
  {
    require(_agreementHash != 0, "E01");
    agreementHash = _agreementHash;
    distributionEnd = _distributionEnd;
  }

  /**
   * @dev configure Token
   */
  function configureToken(CMTAPocToken _token, bytes32 _agreementHash) public onlyOwner {
    require(address(token) == address(0), "E02");
    require(address(_token) != address(0), "E03");
    token = _token;
    require(token.acceptAgreement(_agreementHash), "E04");
  }

  /**
   * @dev allocate shares
   */
  function allocateShares(address _shareholder, uint256 _amount)
    public onlyOwner returns (bool)
  {
    require(!allocationFinished, "E05");
    uint256 currentAllocation = allocations[_shareholder];
    allocations[_shareholder] = _amount;
    totalAllocations = totalAllocations.sub(currentAllocation).add(_amount);

    emit Allocation(_shareholder, _amount);
    return true;
  }

  /**
   * @dev Allocates many shares
   */
  function allocateManyShares(
    address[] _shareholders, uint256[] _amounts)
    public onlyOwner returns (bool)
  {
    require(_shareholders.length == _amounts.length, "E06");
    for(uint256 i=0; i < _shareholders.length; i++) {
      allocateShares(_shareholders[i], _amounts[i]);
    }

    return true;
  }

  /**
   * @dev finish allocations
   */
  function finishAllocations() public onlyOwner returns (bool) {
    require(!allocationFinished, "E05");
    require(token.balanceOf(this) == token.totalSupply(), "E07");
    require(token.validUntil(this) >= distributionEnd, "E08");
    allocationFinished = true;
    emit AllocationFinished();
    return true;
  }

  /**
   * @dev claim shares
   * By providing the hash of the document, he signs explicitly that he agrees on
   * the shareholder terms and conditions
   */
  function claimShares(bytes32 _agreementHash) public {
    require(allocationFinished, "E09");
    require(allocations[msg.sender] > 0, "E10");
    require(agreementHash == _agreementHash, "E11");
    require(token.transfer(msg.sender, allocations[msg.sender]), "E12");
    delete allocations[msg.sender];
  }

  /**
   * @dev reclaim shares
   * Allow owner to reclaim non distributed shares once the distribution has ended
   **/
  function reclaimShares(uint256 _amount) public onlyOwner {
    // solium-disable-next-line security/no-block-members
    require(now > distributionEnd, "E13");
    require(_amount <= token.balanceOf(this), "E14");
    require(token.transfer(msg.sender, _amount), "E15");
  }

  event Allocation(address holder, uint256 amount);
  event AllocationFinished();
}