'user strict';

/**
 * @author Cyril Lapinte - <cyril.lapinte@mtpelerin.com>
 *
 * Copyright © 2016 - 2018 Mt Pelerin Group SA - All Rights Reserved
 * This content cannot be used, copied or reproduced in part or in whole
 * without the express and written permission of Mt Pelerin Group SA.
 * Written by *Mt Pelerin Group SA*, <info@mtpelerin.com>
 * All matters regarding the intellectual property of this code or software
 * are subjects to Swiss Law without reference to its conflicts of law rules.
 *
 */

const MPSSaleConfig = artifacts.require('mps/MPSSaleConfig.sol');

contract('MPSSaleConfig', function (accounts) {
  let mpsSaleConfig;

  const OPENING_TIME = 1541026800;

  beforeEach(async function () {
    mpsSaleConfig = await MPSSaleConfig.new();
  });

  it('should have the token terms hash', async function () {
    const hash = await mpsSaleConfig.tokenAgreementHash();
    assert.equal(hash,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      'token agreement terms');
  });

  it('should have a token supply', async function () {
    const tokenSupply = await mpsSaleConfig.tokenSupply();
    assert.equal(tokenSupply.toNumber(), 10 * (10 ** 6), 'tokenSupply');
  });

  it('should have tokensale lot supplies', async function () {
    const tokensaleLotSupplies = await mpsSaleConfig.tokensaleLotSupplies();
    assert.equal(tokensaleLotSupplies[0], 500000, 'tokensale lot supplies');
    assert.equal(tokensaleLotSupplies[1], 9500000, 'tokensale lot supplies');
  });

  it('should have a tokenized share percent', async function () {
    const tokenizedSharePercent = await mpsSaleConfig.tokenizedSharePercent();
    assert.equal(tokenizedSharePercent.toNumber(), 100, 'tokenizedSharePercent');
  });

  it('should have a token price in CHF (cents !)', async function () {
    const tokenPriceCHFCent = await mpsSaleConfig.tokenPriceCHF();
    assert.equal(
      tokenPriceCHFCent.toNumber(),
      500,
      'tokenPriceCHF'
    );
  });

  it('should have a minimal CHF investement', async function () {
    const minimalCHFInvestment = await mpsSaleConfig.minimalCHFInvestment();
    assert.equal(
      minimalCHFInvestment.toNumber(),
      10 ** 4,
      'minimalCHFInvestment'
    );
  });

  it('should have a maximal CHF investement', async function () {
    const maximalCHFInvestment = await mpsSaleConfig.maximalCHFInvestment();
    assert.equal(
      maximalCHFInvestment.toNumber(),
      10 ** 10,
      'minimalCHFInvestment'
    );
  });

  it('should have 2 tokensales', async function () {
    const tokensalesCount = await mpsSaleConfig.tokensalesCount();
    assert.equal(tokensalesCount.toNumber(), 2, '2 tokensales');
  });

  it('should have purchaseAgreement 0', async function () {
    const purchaseAgreement = await mpsSaleConfig.purchaseAgreement(0);
    assert.equal(
      purchaseAgreement,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      'purchase agreement'
    );
  });

  it('should have purchaseAgreement 1', async function () {
    const purchaseAgreement = await mpsSaleConfig.purchaseAgreement(1);
    assert.equal(
      purchaseAgreement,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      'purchase agreement'
    );
  });

  it('should have lotId 0', async function () {
    const lotId = await mpsSaleConfig.lotId(0);
    assert.equal(lotId.toNumber(), 0, 'lot Id');
  });

  it('should have lotId 1', async function () {
    const lotId = await mpsSaleConfig.lotId(1);
    assert.equal(lotId.toNumber(), 0, 'lot Id');
  });

  it('should have an opening time lot 0', async function () {
    const openingTime = await mpsSaleConfig.openingTime(0);
    assert.equal(openingTime.toNumber(), OPENING_TIME, 'openingTime');
  });

  it('should have an opening time lot 1', async function () {
    const openingTime = await mpsSaleConfig.openingTime(1);
    assert.equal(openingTime.toNumber(), OPENING_TIME, 'openingTime');
  });

  it('should have a duration 0', async function () {
    const duration = await mpsSaleConfig.duration(0);
    assert.equal(duration, 3 * 24 * 3600, 'duration');
  });

  it('should have a duration 1', async function () {
    const duration = await mpsSaleConfig.duration(1);
    assert.equal(duration, 0, 'duration');
  });

  it('should have a sale closing time 0', async function () {
    const saleClosingTime =
      await mpsSaleConfig.closingTime(0);
    assert.equal(saleClosingTime, 0, 'saleClosingTime');
  });

  it('should have a sale closing time 1', async function () {
    const saleClosingTime =
      await mpsSaleConfig.closingTime(1);
    assert.equal(
      saleClosingTime,
      1544914800,
      'saleClosingTime'
    );
  });

  it('should have a minting delay 0', async function () {
    const mintingDelay =
      await mpsSaleConfig.mintingDelay(0);
    assert.equal(
      mintingDelay.toNumber(),
      2 * 24 * 3600,
      'minting delay'
    );
  });

  it('should have a minting delay 1', async function () {
    const mintingDelay =
      await mpsSaleConfig.mintingDelay(1);
    assert.equal(
      mintingDelay.toNumber(),
      2 * 24 * 3600,
      'minting delay'
    );
  });
});