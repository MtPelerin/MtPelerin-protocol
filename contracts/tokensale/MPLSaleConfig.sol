pragma solidity ^0.4.24;

import "../interface/ISaleConfig.sol";
import "../zeppelin/ownership/Ownable.sol";


/**
 * @title MPLSaleConfig
 * @dev MPLSaleConfig contract
 * The contract configure the sale for the MPL token
 *
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * @notice Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * @notice This content cannot be used, copied or reproduced in part or in whole
 * @notice without the express and written permission of Mt Pelerin Group SA.
 * @notice Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * @notice All matters regarding the intellectual property of this code or software
 * @notice are subjects to Swiss Law without reference to its conflicts of law rules.
 */
contract MPLSaleConfig is ISaleConfig, Ownable {
  // Terms of sale Hash SHA3-256
  bytes32 public termsOfSaleHash
  = 0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855;

  // Token supply cap: 21M
  uint256 constant public TOKEN_SUPPLY = 21000000;
 
  // 21% of Mt Pelerin's shares are tokenized
  uint256 constant public TOKENIZED_SHARE_PERCENT = 21;
  uint256 constant public TOKENSALE_LOT1_SHARE_PERCENT
  = (100 * 5) / uint256(21);
  uint256 constant public TOKENSALE_LOT2_SHARE_PERCENT
  = (100 * 14) / uint256(21);
 
  // HardCap of the sale in CHF cents: 2.5M CHF defined in cents
  uint256 constant public TOKENSALE_LOT1_HARDCAP_CHF_CENT = 2.5 * 10**8;

  // 10% of Mt Pelerin's are sold during the initial tokensale
  // TOKEN_SUPPLY*TOKENSALE_LOT1_SHARE_PERCENT/TOKENIZED_SHARE_PERCENT;
  uint256 constant public TOKENSALE_LOT1_SUPPLY = 5 * 10**6;

  // 10% of Mt Pelerin's are reserved for other tokensales
  // TOKEN_SUPPLY*TOKENSALE_SHARE_PERCENT/TOKENIZED_SHARE_PERCENT;
  uint256 constant public TOKENSALE_LOT2_SUPPLY = 14 * 10**6;

  // Remaining are reserved for donation
  uint256 constant public RESERVED_SUPPLY = (
    TOKEN_SUPPLY - (TOKENSALE_LOT1_SUPPLY + TOKENSALE_LOT2_SUPPLY)
  );

  // Tokens amount per CHF
  uint256 constant public TOKEN_PRICE_CHF_CENT = (
    TOKENSALE_LOT1_HARDCAP_CHF_CENT / TOKENSALE_LOT1_SUPPLY
  );

  // Minimal ETH investment
  uint256 constant public MINIMAL_ETH_INVESTMENT = 10**17;
   
  // 2019-01-01: The initial date is in the future of the real date
  uint256 constant public OPENING_TIME = 1546300800;

  // 2 Days: duration of the sale
  uint256 constant public DURATION = 2*24*3600;

  // 2 Days: delay for mint self
  uint256 constant public MINT_DELAY = 2*24*3600;

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function termsOfSaleHash() public view returns (bytes32) {
    return termsOfSaleHash;
  }

  /**
   * @dev update the hash of the terms of sale
   */
  function updateTermsOfSaleHash(bytes32 _termsOfSaleHash) public onlyOwner {
    termsOfSaleHash = _termsOfSaleHash;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokenSupply() public pure returns (uint256) {
    return TOKEN_SUPPLY;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokenizedSharePercent() public pure returns (uint256) {
    return TOKENIZED_SHARE_PERCENT;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokensaleLot1HardCapCHF() public pure returns (uint256) {
    return TOKENSALE_LOT1_HARDCAP_CHF_CENT;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokensaleLot1SharePercent() public pure returns (uint256) {
    return TOKENSALE_LOT1_SHARE_PERCENT;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokensaleLot1Supply() public pure returns (uint256) {
    return TOKENSALE_LOT1_SUPPLY;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokensaleLot2SharePercent() public pure returns (uint256) {
    return TOKENSALE_LOT2_SHARE_PERCENT;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokensaleLot2Supply() public pure returns (uint256) {
    return TOKENSALE_LOT2_SUPPLY;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function reservedSupply() public pure returns (uint256) {
    return RESERVED_SUPPLY;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function tokenPriceCHF() public pure returns (uint256) {
    return TOKEN_PRICE_CHF_CENT;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function minimalETHInvestment() public pure returns (uint256) {
    return MINIMAL_ETH_INVESTMENT;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function openingTime() public view returns (uint256) {
    return OPENING_TIME;
  }

  /**
   * @dev getter need to be declared to comply with ISaleConfig interface
   */
  function duration() public view returns (uint256) {
    return DURATION;
  }

  /**
   * @dev closing time for the sale
   * It is no more possible to send any ETH after
   */
  function closingTime() public view returns (uint256) {
    return OPENING_TIME + DURATION;
  }

  /**
   * @dev delay for investors to mint their tokens
   */
  function mintingDelay() public view returns (uint256) {
    return MINT_DELAY;
  }
}
